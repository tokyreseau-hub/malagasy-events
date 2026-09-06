-- ════════════════════════════════════════════════════════════════
-- CENTRE DE NOTIFICATIONS — Malagasy Events
-- À exécuter dans Supabase : SQL Editor → New query → Run.
-- Ne supprime aucune donnée. Script relançable sans risque.
-- ════════════════════════════════════════════════════════════════

create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in ('message','follow','post','mention')),
  title text not null,
  body text default '',
  link text default '/communaute',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;

drop policy if exists "voir ses notifications" on public.notifications;
create policy "voir ses notifications" on public.notifications
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "lire ses notifications" on public.notifications;
create policy "lire ses notifications" on public.notifications
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "supprimer ses notifications" on public.notifications;
create policy "supprimer ses notifications" on public.notifications
  for delete to authenticated using (auth.uid() = user_id);

-- Message privé reçu
create or replace function public.notify_on_message()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare sender_name text;
begin
  select coalesce(username,'Un membre') into sender_name from public.profiles where id = new.sender_id;
  insert into public.notifications (user_id,actor_id,type,title,body,link)
  values (new.recipient_id,new.sender_id,'message',sender_name || ' vous a envoyé un message',left(coalesce(new.content,''),160),'/notifications');
  return new;
end;
$$;
drop trigger if exists trg_notify_message on public.messages;
create trigger trg_notify_message after insert on public.messages
  for each row execute function public.notify_on_message();

-- Nouveau follower
create or replace function public.notify_on_follow()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare follower_name text;
begin
  select coalesce(username,'Un membre') into follower_name from public.profiles where id = new.follower_id;
  insert into public.notifications (user_id,actor_id,type,title,body,link)
  values (new.following_id,new.follower_id,'follow',follower_name || ' vous suit maintenant','Découvrez son profil et sa communauté.','/communaute');
  return new;
end;
$$;
drop trigger if exists trg_notify_follow on public.follows;
create trigger trg_notify_follow after insert on public.follows
  for each row execute function public.notify_on_follow();

-- Publication d'une personne suivie + mentions @pseudo
create or replace function public.notify_on_post()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare author_name text;
begin
  select coalesce(username,'Un membre') into author_name from public.profiles where id = new.user_id;

  insert into public.notifications (user_id,actor_id,type,title,body,link)
  select f.follower_id,new.user_id,'post',author_name || ' a publié dans la communauté',left(coalesce(new.content,''),160),'/communaute'
  from public.follows f
  where f.following_id = new.user_id and f.follower_id <> new.user_id;

  insert into public.notifications (user_id,actor_id,type,title,body,link)
  select distinct p.id,new.user_id,'mention',author_name || ' vous a mentionné',left(coalesce(new.content,''),160),'/communaute'
  from regexp_matches(coalesce(new.content,''), '@([A-Za-z0-9_]{3,30})', 'g') as mention
  join public.profiles p on lower(p.username) = lower(mention[1])
  where p.id <> new.user_id;
  return new;
end;
$$;
drop trigger if exists trg_notify_post on public.posts;
create trigger trg_notify_post after insert on public.posts
  for each row execute function public.notify_on_post();

-- Ces fonctions ne sont appelées que par les déclencheurs internes.
revoke execute on function public.notify_on_message() from public, anon, authenticated;
revoke execute on function public.notify_on_follow() from public, anon, authenticated;
revoke execute on function public.notify_on_post() from public, anon, authenticated;
