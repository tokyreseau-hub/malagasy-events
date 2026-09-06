-- ════════════════════════════════════════════════════════════════
-- ÉQUIPES ORGANISATEUR — Malagasy Events
-- Un membre demande à rejoindre l'équipe d'une organisation ;
-- le propriétaire (organisateurs.owner_id) OU l'admin accepte/refuse.
-- Notification au propriétaire + admin à chaque demande.
-- À coller dans Supabase → SQL Editor → Run. Idempotent.
-- ════════════════════════════════════════════════════════════════

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

-- Qui peut voir : le membre concerné, le propriétaire de la fiche, l'admin
drop policy if exists "team visible" on public.orga_team;
create policy "team visible" on public.orga_team for select using (
  auth.uid() = user_id
  or public.is_admin()
  or exists (select 1 from public.organisateurs g where g.id = orga_id and g.owner_id = auth.uid())
);

-- Demander à rejoindre (on ne crée que sa propre demande, en 'pending')
drop policy if exists "team demander" on public.orga_team;
create policy "team demander" on public.orga_team for insert with check (
  auth.uid() = user_id and status = 'pending'
);

-- Accepter / refuser : propriétaire de la fiche ou admin
drop policy if exists "team decider" on public.orga_team;
create policy "team decider" on public.orga_team for update using (
  public.is_admin()
  or exists (select 1 from public.organisateurs g where g.id = orga_id and g.owner_id = auth.uid())
);

-- Retirer : le membre lui-même, le propriétaire, ou l'admin
drop policy if exists "team retirer" on public.orga_team;
create policy "team retirer" on public.orga_team for delete using (
  auth.uid() = user_id
  or public.is_admin()
  or exists (select 1 from public.organisateurs g where g.id = orga_id and g.owner_id = auth.uid())
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
