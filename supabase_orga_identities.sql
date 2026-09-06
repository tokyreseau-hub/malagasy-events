-- ════════════════════════════════════════════════════════════════
-- IDENTITÉS ORGANISATEURS — Malagasy Events
-- Une fiche organisateur possède sa boîte de réception et ses alertes.
-- À exécuter dans Supabase → SQL Editor → New query → Run.
-- ════════════════════════════════════════════════════════════════

alter table public.notifications
  add column if not exists orga_id bigint references public.organisateurs(id) on delete cascade;
alter table public.notifications
  add column if not exists data jsonb not null default '{}'::jsonb;
create index if not exists notifications_orga_created_idx
  on public.notifications (orga_id, created_at desc) where orga_id is not null;

-- Les messages à une organisation sont séparés des messages personnels.
create table if not exists public.orga_messages (
  id bigint generated always as identity primary key,
  orga_id bigint not null references public.organisateurs(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  sent_as_orga boolean not null default false,
  content text not null check (char_length(content) between 1 and 2000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists orga_messages_conversation_idx
  on public.orga_messages (orga_id, member_id, created_at);

alter table public.orga_messages enable row level security;

drop policy if exists "voir messages orga" on public.orga_messages;
create policy "voir messages orga" on public.orga_messages for select to authenticated
  using (
    auth.uid() = member_id
    or exists (select 1 from public.organisateurs o where o.id = orga_id and o.owner_id = auth.uid())
    or public.is_admin()
  );

drop policy if exists "envoyer message orga" on public.orga_messages;
create policy "envoyer message orga" on public.orga_messages for insert to authenticated
  with check (
    auth.uid() = sender_id
    and (
      (sent_as_orga = false and member_id = auth.uid())
      or (sent_as_orga = true and exists (
        select 1 from public.organisateurs o where o.id = orga_id and o.owner_id = auth.uid()
      ))
      or (sent_as_orga = true and public.is_admin())
    )
  );

drop policy if exists "lire messages orga" on public.orga_messages;
create policy "lire messages orga" on public.orga_messages for update to authenticated
  using (
    (auth.uid() = member_id and sent_as_orga = true)
    or ((exists (select 1 from public.organisateurs o where o.id = orga_id and o.owner_id = auth.uid()) or public.is_admin()) and sent_as_orga = false)
  )
  with check (true);

-- Étend le type de notification.
do $$
declare c record;
begin
  for c in select conname from pg_constraint
    where conrelid = 'public.notifications'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) like '%type%'
  loop
    execute format('alter table public.notifications drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.notifications add constraint notifications_type_check check (type in (
  'message','follow','post','mention','orga_follow','orga_post','orga_message',
  'post_like','post_comment','event_interest','event_comment','event_favorite'
));

-- Une personne qui suit une fiche alerte la boîte de l'organisation.
create or replace function public.notify_on_orga_follow()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare follower_name text; owner_uuid uuid; orga_name text;
begin
  select coalesce(username,'Un membre') into follower_name from public.profiles where id = new.user_id;
  select owner_id, name into owner_uuid, orga_name from public.organisateurs where id = new.orga_id;
  if owner_uuid is not null and owner_uuid <> new.user_id then
    insert into public.notifications (user_id, actor_id, orga_id, type, title, body, link)
    values (owner_uuid, new.user_id, new.orga_id, 'orga_follow', follower_name || ' suit maintenant ' || coalesce(orga_name,'votre organisation'), 'Votre communauté grandit.', '/notifications');
  end if;
  return new;
end;
$$;

-- Nouveau message : notification côté organisation ou côté membre.
create or replace function public.notify_on_orga_message()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare owner_uuid uuid; orga_name text; actor_name text;
begin
  select owner_id, name into owner_uuid, orga_name from public.organisateurs where id = new.orga_id;
  select coalesce(username,'Un membre') into actor_name from public.profiles where id = new.sender_id;
  if new.sent_as_orga then
    insert into public.notifications (user_id, actor_id, type, title, body, link, data)
    values (new.member_id, new.sender_id, 'orga_message', coalesce(orga_name,'Une organisation') || ' vous a répondu', left(new.content,160), '/notifications', jsonb_build_object('orga_id',new.orga_id));
  elsif owner_uuid is not null then
    insert into public.notifications (user_id, actor_id, orga_id, type, title, body, link)
    values (owner_uuid, new.sender_id, new.orga_id, 'orga_message', actor_name || ' a écrit à ' || coalesce(orga_name,'votre organisation'), left(new.content,160), '/notifications');
  end if;
  return new;
end;
$$;
drop trigger if exists trg_notify_orga_message on public.orga_messages;
create trigger trg_notify_orga_message after insert on public.orga_messages
  for each row execute function public.notify_on_orga_message();

revoke execute on function public.notify_on_orga_message() from public, anon, authenticated;
