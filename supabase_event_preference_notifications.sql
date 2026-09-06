-- ════════════════════════════════════════════════════════════════
-- NOTIFICATIONS SELON LES PRÉFÉRENCES — Malagasy Events
-- À exécuter une fois dans Supabase → SQL Editor → Run.
-- Script relançable : aucun historique ni profil n'est supprimé.
-- ════════════════════════════════════════════════════════════════

alter table public.notifications
  add column if not exists data jsonb not null default '{}'::jsonb;

-- Ajoute le type event_match sans retirer les types déjà utilisés.
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
  add constraint notifications_type_check check (type in (
    'message','follow','post','mention',
    'orga_follow','orga_post','orga_message',
    'post_like','post_comment',
    'event_interest','event_comment','event_favorite',
    'event_match'
  ));

create or replace function public.notify_matching_profiles_on_event()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.notifications
    (user_id, actor_id, type, title, body, link, data)
  select
    p.id,
    new.owner_id,
    'event_match',
    'Nouveau ' || lower(coalesce(new.category,'événement')) || ' pour vous',
    left(
      coalesce(new.title,'Nouvel événement')
      || case when nullif(new.city,'') is not null then ' · ' || new.city else '' end
      || case when new.date is not null then ' · ' || to_char(new.date::date,'DD/MM/YYYY') else '' end,
      160
    ),
    '/notifications',
    jsonb_build_object('event_id',new.id,'category',new.category)
  from public.profiles p
  where p.id is distinct from new.owner_id
    and exists (
      select 1
      from jsonb_array_elements_text(coalesce(to_jsonb(p.categories),'[]'::jsonb)) preference
      where lower(preference) = lower(coalesce(new.category,''))
    )
    and not exists (
      select 1 from public.notifications n
      where n.user_id = p.id
        and n.type = 'event_match'
        and n.data->>'event_id' = new.id::text
    );
  return new;
end;
$$;

drop trigger if exists trg_notify_matching_profiles_on_event on public.events;
create trigger trg_notify_matching_profiles_on_event
  after insert on public.events
  for each row execute function public.notify_matching_profiles_on_event();

revoke execute on function public.notify_matching_profiles_on_event()
  from public, anon, authenticated;
