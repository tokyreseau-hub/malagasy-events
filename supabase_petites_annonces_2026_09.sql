-- ═══════════════════════════════════════════════════════════════════════════
-- MALAGASY EVENTS — PETITES ANNONCES
-- Lot isolé : ne modifie ni les événements, ni les messages, ni le SEO.
-- À exécuter dans Supabase SQL Editor après validation de l'interface locale.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create table if not exists public.classified_categories (
  id bigint generated always as identity primary key,
  name text not null,
  slug text not null unique,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create unique index if not exists classified_categories_name_ci_idx
  on public.classified_categories (lower(name));

insert into public.classified_categories(name,slug,active,approved_at)
values
  ('Cours et apprentissage','cours-apprentissage',true,now()),
  ('Emploi et services','emploi-services',true,now()),
  ('Logement','logement',true,now()),
  ('Covoiturage','covoiturage',true,now()),
  ('Vente et don','vente-don',true,now()),
  ('Entraide','entraide',true,now()),
  ('Autres demandes','autres-demandes',true,now())
on conflict (slug) do update set name=excluded.name,active=true;

create table if not exists public.classifieds (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete restrict,
  kind text not null check (kind in ('cherche','propose')),
  title text not null check (char_length(btrim(title)) between 5 and 120),
  description text not null check (char_length(btrim(description)) between 20 and 4000),
  category_id bigint references public.classified_categories(id) on delete restrict,
  proposed_category text,
  city text not null check (char_length(btrim(city)) between 2 and 120),
  department text not null default '',
  price_label text not null default '',
  images text[] not null default '{}',
  contact_method text not null default 'messages' check (contact_method='messages'),
  status text not null default 'pending'
    check (status in ('pending','changes_requested','approved','rejected','closed','expired','removed')),
  moderation_note text not null default '',
  moderator_id uuid references public.profiles(id) on delete set null,
  submitted_at timestamptz not null default now(),
  published_at timestamptz,
  expires_at timestamptz,
  closed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint classifieds_category_choice check (
    (category_id is not null and nullif(btrim(coalesce(proposed_category,'')),'') is null)
    or
    (category_id is null and char_length(btrim(coalesce(proposed_category,''))) between 2 and 80)
  ),
  constraint classifieds_images_limit check (cardinality(images) <= 3)
);

create index if not exists classifieds_public_idx
  on public.classifieds (published_at desc)
  where status='approved';
create index if not exists classifieds_pending_idx
  on public.classifieds (submitted_at asc)
  where status in ('pending','changes_requested');
create index if not exists classifieds_user_idx
  on public.classifieds (user_id,submitted_at desc);
create index if not exists classifieds_category_idx
  on public.classifieds (category_id,published_at desc)
  where status='approved';

create table if not exists public.classified_audit (
  id bigint generated always as identity primary key,
  classified_id bigint not null references public.classifieds(id) on delete restrict,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  previous_status text,
  next_status text,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists classified_audit_item_idx
  on public.classified_audit(classified_id,created_at desc);

alter table public.classified_categories enable row level security;
alter table public.classifieds enable row level security;
alter table public.classified_audit enable row level security;

drop policy if exists "categories annonces publiques" on public.classified_categories;
create policy "categories annonces publiques" on public.classified_categories
  for select to anon,authenticated using (active=true);
drop policy if exists "admin voit toutes categories annonces" on public.classified_categories;
create policy "admin voit toutes categories annonces" on public.classified_categories
  for select to authenticated using ((select public.is_super_admin()));
drop policy if exists "admin cree categories annonces" on public.classified_categories;
create policy "admin cree categories annonces" on public.classified_categories
  for insert to authenticated with check ((select public.is_super_admin()));
drop policy if exists "admin modifie categories annonces" on public.classified_categories;
create policy "admin modifie categories annonces" on public.classified_categories
  for update to authenticated
  using ((select public.is_super_admin())) with check ((select public.is_super_admin()));

drop policy if exists "annonces publiques approuvees" on public.classifieds;
create policy "annonces publiques approuvees" on public.classifieds
  for select to anon,authenticated
  using (status='approved' and published_at is not null and (expires_at is null or expires_at>now()));
drop policy if exists "membre voit ses annonces" on public.classifieds;
create policy "membre voit ses annonces" on public.classifieds
  for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists "admin voit toutes annonces" on public.classifieds;
create policy "admin voit toutes annonces" on public.classifieds
  for select to authenticated using ((select public.is_super_admin()));
drop policy if exists "membre soumet annonce" on public.classifieds;
create policy "membre soumet annonce" on public.classifieds
  for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists "membre modifie son annonce" on public.classifieds;
create policy "membre modifie son annonce" on public.classifieds
  for update to authenticated
  using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists "admin modere annonces" on public.classifieds;
create policy "admin modere annonces" on public.classifieds
  for update to authenticated
  using ((select public.is_super_admin())) with check ((select public.is_super_admin()));

drop policy if exists "admin consulte historique annonces" on public.classified_audit;
create policy "admin consulte historique annonces" on public.classified_audit
  for select to authenticated using ((select public.is_super_admin()));

grant select on public.classified_categories to anon,authenticated;
grant insert,update on public.classified_categories to authenticated;
revoke delete on public.classified_categories from anon,authenticated;
grant usage,select on sequence public.classified_categories_id_seq to authenticated;
grant select on public.classifieds to anon,authenticated;
grant insert,update on public.classifieds to authenticated;
revoke delete on public.classifieds from anon,authenticated;
grant usage,select on sequence public.classifieds_id_seq to authenticated;
grant select on public.classified_audit to authenticated;
revoke insert,update,delete on public.classified_audit from anon,authenticated;

create or replace function public.guard_classified_write()
returns trigger
language plpgsql
security invoker
set search_path=pg_catalog,public
as $$
declare v_admin boolean := coalesce(public.is_super_admin(),false);
begin
  new.title := btrim(new.title);
  new.description := btrim(new.description);
  new.city := btrim(new.city);
  new.department := btrim(coalesce(new.department,''));
  new.price_label := btrim(coalesce(new.price_label,''));
  new.proposed_category := nullif(btrim(coalesce(new.proposed_category,'')),'');
  new.updated_at := now();

  if cardinality(new.images)>3 then raise exception 'Maximum 3 photos'; end if;
  if exists(select 1 from unnest(new.images) u where u !~ '^https://') then
    raise exception 'Les photos doivent utiliser des liens HTTPS';
  end if;
  if new.category_id is not null and not exists(
    select 1 from public.classified_categories c where c.id=new.category_id and c.active=true
  ) then raise exception 'Catégorie indisponible'; end if;

  if tg_op='INSERT' then
    if auth.uid() is null then raise exception 'Authentification requise'; end if;
    if not v_admin and new.user_id is distinct from auth.uid() then raise exception 'Auteur invalide'; end if;
    if not v_admin then
      new.status := 'pending';new.moderation_note := '';new.moderator_id := null;
      new.published_at := null;new.expires_at := null;new.closed_at := null;
    end if;
    return new;
  end if;

  if v_admin then
    new.user_id := old.user_id;
    if new.status='approved' and old.status is distinct from 'approved' then
      new.published_at := now();new.expires_at := now()+interval '30 days';new.closed_at := null;
    elsif new.status in ('rejected','removed','closed','expired') and old.status is distinct from new.status then
      new.closed_at := now();
    end if;
    if new.status is distinct from old.status then new.moderator_id := auth.uid(); end if;
    return new;
  end if;

  if auth.uid() is null or old.user_id is distinct from auth.uid() then raise exception 'Modification non autorisée'; end if;
  if new.user_id is distinct from old.user_id
     or new.moderator_id is distinct from old.moderator_id
     or new.moderation_note is distinct from old.moderation_note
     or new.published_at is distinct from old.published_at
     or new.expires_at is distinct from old.expires_at then
    raise exception 'Champs de modération non modifiables';
  end if;

  if new.status='closed' then
    new.closed_at := now();
    return new;
  end if;
  if old.status not in ('pending','changes_requested','approved') then
    raise exception 'Cette annonce ne peut plus être modifiée';
  end if;
  new.status := 'pending';new.moderation_note := '';new.moderator_id := null;
  new.published_at := null;new.expires_at := null;new.closed_at := null;
  return new;
end;
$$;
revoke all on function public.guard_classified_write() from public,anon,authenticated;

drop trigger if exists guard_classified_write_trigger on public.classifieds;
create trigger guard_classified_write_trigger
before insert or update on public.classifieds
for each row execute function public.guard_classified_write();

create or replace function public.audit_classified_change()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
begin
  insert into public.classified_audit(classified_id,actor_id,action,previous_status,next_status,snapshot)
  values(new.id,auth.uid(),case when tg_op='INSERT' then 'submitted' when new.status is distinct from old.status then 'status_changed' else 'edited' end,
    case when tg_op='UPDATE' then old.status end,new.status,to_jsonb(new));
  return new;
end;
$$;
revoke all on function public.audit_classified_change() from public,anon,authenticated;
drop trigger if exists audit_classified_change_trigger on public.classifieds;
create trigger audit_classified_change_trigger
after insert or update on public.classifieds
for each row execute function public.audit_classified_change();

alter table public.notifications add column if not exists data jsonb not null default '{}'::jsonb;

create or replace function public.notify_classified_submission()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare v_admin uuid;v_author text;v_category text;
begin
  select id into v_admin from public.profiles where username='Malagasy_events_admin' limit 1;
  select coalesce(username,'Un membre') into v_author from public.profiles where id=new.user_id;
  select coalesce(new.proposed_category,c.name,'À classer') into v_category
    from (select 1) x left join public.classified_categories c on c.id=new.category_id;
  if v_admin is not null and v_admin is distinct from new.user_id then
    insert into public.notifications(user_id,actor_id,type,title,body,link,data)
    values(v_admin,new.user_id,'post','Nouvelle petite annonce à valider',
      left(new.title||' · '||new.city||' · '||v_category,160),'/petites-annonces',jsonb_build_object('classified_id',new.id));
  end if;
  return new;
end;
$$;
revoke all on function public.notify_classified_submission() from public,anon,authenticated;
drop trigger if exists notify_classified_submission_trigger on public.classifieds;
create trigger notify_classified_submission_trigger
after insert on public.classifieds
for each row execute function public.notify_classified_submission();

create or replace function public.notify_classified_moderation()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare v_title text;v_body text;
begin
  if new.status is not distinct from old.status then return new; end if;
  if new.status='approved' then v_title:='Petite annonce publiée';v_body:=new.title||' est maintenant visible pendant 30 jours.';
  elsif new.status='changes_requested' then v_title:='Modification demandée';v_body:=coalesce(nullif(new.moderation_note,''),'Merci de compléter votre petite annonce.');
  elsif new.status='rejected' then v_title:='Petite annonce refusée';v_body:=coalesce(nullif(new.moderation_note,''),'Votre annonce ne respecte pas les critères de publication.');
  elsif new.status='removed' then v_title:='Petite annonce retirée';v_body:=coalesce(nullif(new.moderation_note,''),'Votre annonce a été retirée après modération.');
  else return new;
  end if;
  insert into public.notifications(user_id,actor_id,type,title,body,link,data)
  values(new.user_id,auth.uid(),'post',v_title,left(v_body,160),'/petites-annonces',jsonb_build_object('classified_id',new.id));
  return new;
end;
$$;
revoke all on function public.notify_classified_moderation() from public,anon,authenticated;
drop trigger if exists notify_classified_moderation_trigger on public.classifieds;
create trigger notify_classified_moderation_trigger
after update on public.classifieds
for each row execute function public.notify_classified_moderation();

commit;

select
  to_regclass('public.classifieds') is not null as annonces_pretes,
  to_regclass('public.classified_categories') is not null as categories_pretes,
  to_regclass('public.classified_audit') is not null as historique_admin_pret,
  exists(select 1 from pg_policies where schemaname='public' and tablename='classifieds') as securite_rls_prete,
  exists(select 1 from pg_trigger where tgname='notify_classified_submission_trigger' and not tgisinternal) as notification_admin_prete,
  not exists(select 1 from pg_policies where schemaname='public' and tablename='classifieds' and cmd='DELETE') as aucune_suppression_physique_membre;
