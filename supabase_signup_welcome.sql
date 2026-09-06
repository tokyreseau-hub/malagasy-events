-- NOUVELLES INSCRIPTIONS — notification admin + message de bienvenue
-- À exécuter dans Supabase → SQL Editor → Run.
-- Script idempotent : il ne touche pas aux comptes existants.

create or replace function public.admin_profile_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select id
  from public.profiles
  where lower(trim(username)) = 'malagasy_events_admin'
  limit 1
$$;

create or replace function public.welcome_new_profile()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_admin uuid;
  v_name text;
begin
  v_admin := public.admin_profile_id();
  v_name := coalesce(nullif(trim(new.username), ''), 'nouveau membre');

  if v_admin is null or v_admin = new.id then
    return new;
  end if;

  -- Alerte visible uniquement dans le centre de notifications de l'admin.
  insert into public.notifications (user_id, actor_id, type, title, body, link)
  values (
    v_admin,
    new.id,
    'follow',
    'Nouvelle inscription : ' || v_name,
    v_name || ' vient de rejoindre Malagasy Events.',
    '/communaute'
  );

  -- Premier message privé envoyé officiellement par le compte admin.
  insert into public.messages (sender_id, recipient_id, content)
  values (
    v_admin,
    new.id,
    'Bienvenue ' || v_name || ' 👋 Heureux de t''accueillir sur Malagasy Events ! '
    || 'Découvre les événements, les professionnels et la communauté malagasy. '
    || 'Si tu as une question, réponds simplement à ce message.'
  );

  return new;
end;
$$;

drop trigger if exists trg_welcome_new_profile on public.profiles;
create trigger trg_welcome_new_profile
after insert on public.profiles
for each row execute function public.welcome_new_profile();

revoke execute on function public.admin_profile_id() from public, anon, authenticated;
revoke execute on function public.welcome_new_profile() from public, anon, authenticated;

