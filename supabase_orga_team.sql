-- ════════════════════════════════════════════════════════════════
-- ÉQUIPES ORGANISATEUR — Malagasy Events
-- Un membre demande à rejoindre l'équipe d'une organisation ;
-- le propriétaire (organisateurs.owner_id) OU l'admin accepte/refuse.
-- Notification au propriétaire + admin à chaque demande.
-- À coller dans Supabase → SQL Editor → Run. Idempotent.
-- ════════════════════════════════════════════════════════════════

-- Le partenariat est indépendant du forfait payant et de la mise en avant.
alter table public.organisateurs
  add column if not exists is_partner boolean not null default false;

-- Partenaires confirmés par Malagasy Events : visibilité graphique uniquement.
-- Ce statut n'entre jamais dans le calcul de popularité.
update public.organisateurs
set is_partner = true
where lower(name) in (
  lower('RNS — Rencontre Nationale Sportive'),
  lower('RNS - Rencontre Nationale Sportive'),
  lower('Sehatra Ba Gasy France')
);

insert into public.organisateurs (name,type,city,region,followers,note,fb,insta,site,contact,is_partner)
select
  'Sehatra Ba Gasy France',
  'Association culturelle',
  'Châtillon',
  'Île-de-France',
  '',
  'Partenaire Malagasy Events et organisateur du théâtre musical Tana–Paris–Tana.',
  '', '', '', '', true
where not exists (
  select 1 from public.organisateurs where lower(name)=lower('Sehatra Ba Gasy France')
);

-- Mafana_vibes : fiche partenaire historique gérée par @james_rsl.
update public.organisateurs
set is_partner = true
where id = 37
  and owner_id = '137ae604-b47d-48de-99ec-80f9aa27410a'::uuid;

create table if not exists public.orga_team (
  id bigint generated always as identity primary key,
  orga_id bigint not null references public.organisateurs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  role text default 'membre',
  created_at timestamptz not null default now(),
  unique (orga_id, user_id)
);
alter table public.orga_team enable row level security;
create index if not exists orga_team_user_status_idx on public.orga_team(user_id, status);
create index if not exists orga_team_orga_status_idx on public.orga_team(orga_id, status);

grant select, insert, update, delete on public.orga_team to authenticated;
grant usage, select on sequence public.orga_team_id_seq to authenticated;

-- Qui peut voir : le membre concerné, le propriétaire de la fiche, l'admin
drop policy if exists "team visible" on public.orga_team;
create policy "team visible" on public.orga_team for select to authenticated using (
  (select auth.uid()) = user_id
  or public.is_admin()
  or exists (select 1 from public.organisateurs g where g.id = orga_id and g.owner_id = (select auth.uid()))
);

-- Demander à rejoindre (on ne crée que sa propre demande, en 'pending')
drop policy if exists "team demander" on public.orga_team;
create policy "team demander" on public.orga_team for insert to authenticated with check (
  ((select auth.uid()) = user_id and status = 'pending')
  or public.is_admin()
);

-- Accepter / refuser : propriétaire de la fiche ou admin
drop policy if exists "team decider" on public.orga_team;
create policy "team decider" on public.orga_team for update to authenticated using (
  public.is_admin()
  or exists (select 1 from public.organisateurs g where g.id = orga_id and g.owner_id = (select auth.uid()))
) with check (
  public.is_admin()
  or exists (select 1 from public.organisateurs g where g.id = orga_id and g.owner_id = (select auth.uid()))
);

-- Retirer : le membre lui-même, le propriétaire, ou l'admin
drop policy if exists "team retirer" on public.orga_team;
create policy "team retirer" on public.orga_team for delete to authenticated using (
  (select auth.uid()) = user_id
  or public.is_admin()
  or exists (select 1 from public.organisateurs g where g.id = orga_id and g.owner_id = (select auth.uid()))
);

-- Les gestionnaires acceptés disposent du mode organisateur sans remplacer
-- le propriétaire principal de la structure.
drop policy if exists "équipe modifie sa fiche" on public.organisateurs;
create policy "équipe modifie sa fiche" on public.organisateurs
  for update to authenticated
  using (
    public.is_admin()
    or owner_id = (select auth.uid())
    or exists (select 1 from public.orga_team t where t.orga_id = id and t.user_id = (select auth.uid()) and t.status = 'accepted')
  )
  with check (
    public.is_admin()
    or owner_id = (select auth.uid())
    or exists (select 1 from public.orga_team t where t.orga_id = id and t.user_id = (select auth.uid()) and t.status = 'accepted')
  );

drop policy if exists "équipe publie une actu" on public.orga_posts;
create policy "équipe publie une actu" on public.orga_posts
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      public.is_admin()
      or exists (select 1 from public.organisateurs o where o.id = orga_id and o.owner_id = (select auth.uid()))
      or exists (select 1 from public.orga_team t where t.orga_id = orga_posts.orga_id and t.user_id = (select auth.uid()) and t.status = 'accepted')
    )
    and exists (
      select 1 from public.organisateurs o
      where o.id = orga_id
        and (
          (o.plan = 'pro' and (o.plan_until is null or o.plan_until >= current_date))
          or exists (
            select 1 from public.profiles p
            where p.id = (select auth.uid()) and p.plan = 'organisateur'
          )
        )
    )
  );

drop policy if exists "équipe modifie ses actus" on public.orga_posts;
create policy "équipe modifie ses actus" on public.orga_posts
  for update to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.organisateurs o where o.id = orga_id and o.owner_id = (select auth.uid()))
    or exists (select 1 from public.orga_team t where t.orga_id = orga_posts.orga_id and t.user_id = (select auth.uid()) and t.status = 'accepted')
  )
  with check (
    public.is_admin()
    or exists (select 1 from public.organisateurs o where o.id = orga_id and o.owner_id = (select auth.uid()))
    or exists (select 1 from public.orga_team t where t.orga_id = orga_posts.orga_id and t.user_id = (select auth.uid()) and t.status = 'accepted')
  );

drop policy if exists "équipe supprime ses actus" on public.orga_posts;
create policy "équipe supprime ses actus" on public.orga_posts
  for delete to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.organisateurs o where o.id = orga_id and o.owner_id = (select auth.uid()))
    or exists (select 1 from public.orga_team t where t.orga_id = orga_posts.orga_id and t.user_id = (select auth.uid()) and t.status = 'accepted')
  );

-- Le fil Communauté accepte également l'identité d'un gestionnaire validé.
drop policy if exists "poster en tant qu orga" on public.posts;
create policy "poster en tant qu orga" on public.posts
  as restrictive for insert to authenticated
  with check (
    orga_id is null
    or public.is_admin()
    or exists (select 1 from public.organisateurs o where o.id = orga_id and o.owner_id = (select auth.uid()))
    or exists (select 1 from public.orga_team t where t.orga_id = posts.orga_id and t.user_id = (select auth.uid()) and t.status = 'accepted')
  );

-- Toute l'équipe validée partage la boîte de réception de l'organisme.
drop policy if exists "équipe voit messages orga" on public.orga_messages;
create policy "équipe voit messages orga" on public.orga_messages
  for select to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.organisateurs o where o.id = orga_id and o.owner_id = (select auth.uid()))
    or exists (select 1 from public.orga_team t where t.orga_id = orga_messages.orga_id and t.user_id = (select auth.uid()) and t.status = 'accepted')
  );

drop policy if exists "équipe envoie messages orga" on public.orga_messages;
create policy "équipe envoie messages orga" on public.orga_messages
  for insert to authenticated
  with check (
    (select auth.uid()) = sender_id and sent_as_orga = true and (
      public.is_admin()
      or exists (select 1 from public.organisateurs o where o.id = orga_id and o.owner_id = (select auth.uid()))
      or exists (select 1 from public.orga_team t where t.orga_id = orga_messages.orga_id and t.user_id = (select auth.uid()) and t.status = 'accepted')
    )
  );

drop policy if exists "équipe marque messages lus" on public.orga_messages;
create policy "équipe marque messages lus" on public.orga_messages
  for update to authenticated
  using (
    sent_as_orga = false and (
      public.is_admin()
      or exists (select 1 from public.organisateurs o where o.id = orga_id and o.owner_id = (select auth.uid()))
      or exists (select 1 from public.orga_team t where t.orga_id = orga_messages.orga_id and t.user_id = (select auth.uid()) and t.status = 'accepted')
    )
  )
  with check (
    public.is_admin()
    or exists (select 1 from public.organisateurs o where o.id = orga_id and o.owner_id = (select auth.uid()))
    or exists (select 1 from public.orga_team t where t.orga_id = orga_messages.orga_id and t.user_id = (select auth.uid()) and t.status = 'accepted')
  );

-- Notifier propriétaire + admin à chaque nouvelle demande
create or replace function public.notify_on_team_request()
returns trigger language plpgsql security definer as $$
declare v_admin uuid; v_owner uuid; v_orga text; v_actor text;
begin
  select owner_id, name into v_owner, v_orga from public.organisateurs where id = new.orga_id;
  select coalesce(username,'Un membre') into v_actor from public.profiles where id = new.user_id;
  v_admin := public.admin_profile_id();
  if v_owner is not null and v_owner <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, title, body, link)
    values (v_owner, new.user_id, 'follow', 'Demande pour rejoindre ton équipe',
            v_actor || ' souhaite rejoindre « ' || coalesce(v_orga,'ton organisation') || ' ».', '/');
  end if;
  if v_admin is not null and v_admin <> new.user_id and v_admin is distinct from v_owner then
    insert into public.notifications (user_id, actor_id, type, title, body, link)
    values (v_admin, new.user_id, 'follow', 'Nouvelle demande d''équipe',
            v_actor || ' veut rejoindre « ' || coalesce(v_orga,'une organisation') || ' ».', '/');
  end if;
  return new;
end $$;
drop trigger if exists trg_notify_team_request on public.orga_team;
create trigger trg_notify_team_request after insert on public.orga_team
  for each row execute function public.notify_on_team_request();
revoke execute on function public.notify_on_team_request() from public, anon, authenticated;
