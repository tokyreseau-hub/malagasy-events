-- ════════════════════════════════════════════════════════════════
-- NOTIFICATIONS D'INTERACTIONS — Malagasy Events
-- Likes, commentaires, favoris et intérêts liés à votre contenu.
-- À exécuter dans Supabase → SQL Editor → New query → Run.
-- ════════════════════════════════════════════════════════════════

-- Étend les catégories de notifications sans toucher à l'historique.
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

alter table public.notifications add constraint notifications_type_check check (type in (
  'message','follow','post','mention','orga_follow','orga_post',
  'post_like','post_comment','event_interest','event_comment','event_favorite'
));

-- Like sur une publication communauté.
create or replace function public.notify_on_post_like()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare owner_uuid uuid; actor_name text;
begin
  select user_id into owner_uuid from public.posts where id = new.post_id;
  if owner_uuid is not null and owner_uuid <> new.user_id then
    select coalesce(username,'Un membre') into actor_name from public.profiles where id = new.user_id;
    insert into public.notifications (user_id,actor_id,type,title,body,link)
    values (owner_uuid,new.user_id,'post_like',actor_name || ' a aimé votre publication','Votre publication plaît à la communauté.','/communaute');
  end if;
  return new;
end;
$$;
drop trigger if exists trg_notify_post_like on public.post_likes;
create trigger trg_notify_post_like after insert on public.post_likes
  for each row execute function public.notify_on_post_like();

-- Commentaire sous une publication communauté.
create or replace function public.notify_on_post_comment()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare owner_uuid uuid; actor_name text;
begin
  select user_id into owner_uuid from public.posts where id = new.post_id;
  if owner_uuid is not null and owner_uuid <> new.user_id then
    select coalesce(username,'Un membre') into actor_name from public.profiles where id = new.user_id;
    insert into public.notifications (user_id,actor_id,type,title,body,link)
    values (owner_uuid,new.user_id,'post_comment',actor_name || ' a commenté votre publication',left(coalesce(new.content,''),160),'/communaute');
  end if;
  return new;
end;
$$;
drop trigger if exists trg_notify_post_comment on public.post_comments;
create trigger trg_notify_post_comment after insert on public.post_comments
  for each row execute function public.notify_on_post_comment();

-- Une interaction avec un événement prévient son propriétaire.
create or replace function public.notify_on_event_interaction()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare owner_uuid uuid; event_title text; actor_name text; notif_type text; notif_title text; notif_body text;
begin
  select owner_id, title into owner_uuid, event_title from public.events where id = new.event_id;
  if owner_uuid is null or owner_uuid = new.user_id then return new; end if;
  select coalesce(username,'Un membre') into actor_name from public.profiles where id = new.user_id;

  if tg_table_name = 'event_interests' then
    notif_type := 'event_interest'; notif_title := actor_name || ' est intéressé(e) par votre événement'; notif_body := coalesce(event_title,'Votre événement');
  elsif tg_table_name = 'favorites' then
    notif_type := 'event_favorite'; notif_title := actor_name || ' a ajouté votre événement à ses favoris'; notif_body := coalesce(event_title,'Votre événement');
  else
    notif_type := 'event_comment'; notif_title := actor_name || ' a commenté votre événement'; notif_body := left(coalesce(new.content,''),160);
  end if;

  insert into public.notifications (user_id,actor_id,type,title,body,link)
  values (owner_uuid,new.user_id,notif_type,notif_title,notif_body,'/notifications');
  return new;
end;
$$;

drop trigger if exists trg_notify_event_interest on public.event_interests;
create trigger trg_notify_event_interest after insert on public.event_interests
  for each row execute function public.notify_on_event_interaction();

drop trigger if exists trg_notify_event_favorite on public.favorites;
create trigger trg_notify_event_favorite after insert on public.favorites
  for each row execute function public.notify_on_event_interaction();

drop trigger if exists trg_notify_event_comment on public.comments;
create trigger trg_notify_event_comment after insert on public.comments
  for each row execute function public.notify_on_event_interaction();

revoke execute on function public.notify_on_post_like() from public, anon, authenticated;
revoke execute on function public.notify_on_post_comment() from public, anon, authenticated;
revoke execute on function public.notify_on_event_interaction() from public, anon, authenticated;
