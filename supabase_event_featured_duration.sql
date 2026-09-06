-- ════════════════════════════════════════════════════════════════
-- ÉVÉNEMENTS À LA UNE — durée de 7 jours
-- Admin : décompte + prolongation. À lancer dans Supabase SQL Editor.
-- ════════════════════════════════════════════════════════════════

alter table public.events
  add column if not exists featured_until timestamptz;

create index if not exists events_featured_until_idx
  on public.events (featured_until desc);

-- Les événements déjà épinglés disposent de 7 jours à compter d'aujourd'hui.
update public.events
set featured_until = now() + interval '7 days'
where featured is true and featured_until is null;

create or replace function public.set_event_featured_duration()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' then
    if new.featured is true and new.featured_until is null then
      new.featured_until := now() + interval '7 days';
    end if;
  elsif not public.is_admin() then
    -- Un organisateur garde l'état et la durée attribués à son événement.
    new.featured := old.featured;
    new.featured_until := old.featured_until;
  elsif new.featured is false then
    new.featured_until := null;
  elsif old.featured is false and new.featured is true then
    new.featured_until := now() + interval '7 days';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_event_featured_duration on public.events;
create trigger trg_event_featured_duration
  before insert or update on public.events
  for each row execute function public.set_event_featured_duration();

revoke execute on function public.set_event_featured_duration()
  from public, anon, authenticated;
