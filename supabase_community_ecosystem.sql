-- ════════════════════════════════════════════════════════════════
-- ÉCOSYSTÈME COMMUNAUTÉ — Malagasy Events
-- À exécuter une seule fois dans Supabase : SQL Editor → New query → Run.
-- Ajoute les abonnements aux organisateurs et leurs notifications.
-- Ne supprime aucune donnée ; le script peut être relancé sans risque.
-- ════════════════════════════════════════════════════════════════

-- 1. Un membre peut suivre une fiche organisateur.
create table if not exists public.orga_follows (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  orga_id bigint not null references public.organisateurs(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, orga_id)
);
create index if not exists orga_follows_orga_created_idx on public.orga_follows (orga_id, created_at desc);
create index if not exists orga_follows_user_created_idx on public.orga_follows (user_id, created_at desc);

alter table public.orga_follows enable row level security;
drop policy if exists "orga abonnements lecture publique" on public.orga_follows;
create policy "orga abonnements lecture publique" on public.orga_follows
  for select using (true);
drop policy if exists "suivre un organisateur" on public.orga_follows;
create policy "suivre un organisateur" on public.orga_follows
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "ne plus suivre un organisateur" on public.orga_follows;
create policy "ne plus suivre un organisateur" on public.orga_follows
  for delete to authenticated using (auth.uid() = user_id);

-- 2. Les deux nouveaux types de notifications sont ajoutés sans toucher
-- aux notifications déjà reçues.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.notifications'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%type%'
  loop
    execute format('alter table public.notifications drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.notifications
  add constraint notifications_type_check
  check (type in ('message','follow','post','mention','orga_follow','orga_post'));

-- 3. L'organisateur est prévenu lorsqu'un membre suit sa fiche.
create or replace function public.notify_on_orga_follow()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare follower_name text;
declare owner_uuid uuid;
declare orga_name text;
begin
  select coalesce(username,'Un membre') into follower_name
  from public.profiles where id = new.user_id;
  select owner_id, name into owner_uuid, orga_name
  from public.organisateurs where id = new.orga_id;

  if owner_uuid is not null and owner_uuid <> new.user_id then
    insert into public.notifications (user_id,actor_id,type,title,body,link)
    values (
      owner_uuid, new.user_id, 'orga_follow',
      follower_name || ' suit maintenant ' || coalesce(orga_name,'votre organisation'),
      'Votre communauté grandit.', '/notifications'
    );
  end if;
  return new;
end;
$$;
drop trigger if exists trg_notify_orga_follow on public.orga_follows;
create trigger trg_notify_orga_follow after insert on public.orga_follows
  for each row execute function public.notify_on_orga_follow();

-- 4. Chaque abonné reçoit une alerte à la publication d'une actu orga.
create or replace function public.notify_on_orga_post()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare orga_name text;
begin
  select name into orga_name from public.organisateurs where id = new.orga_id;
  insert into public.notifications (user_id,actor_id,type,title,body,link)
  select f.user_id, new.user_id, 'orga_post',
         coalesce(orga_name,'Un organisateur') || ' a publié une actualité',
         left(coalesce(new.content,''),160), '/notifications'
  from public.orga_follows f
  where f.orga_id = new.orga_id and f.user_id <> new.user_id;
  return new;
end;
$$;
drop trigger if exists trg_notify_orga_post on public.orga_posts;
create trigger trg_notify_orga_post after insert on public.orga_posts
  for each row execute function public.notify_on_orga_post();

revoke execute on function public.notify_on_orga_follow() from public, anon, authenticated;
revoke execute on function public.notify_on_orga_post() from public, anon, authenticated;
