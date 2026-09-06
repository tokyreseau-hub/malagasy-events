-- MALAGASY EVENTS — MIGRATIONS EN ATTENTE AU 26 JUILLET 2026
-- À exécuter une seule fois dans Supabase > SQL Editor.
-- Ce fichier regroupe :
--   1. l'unicité des noms d'utilisateur ;
--   2. la notification admin et le message de bienvenue à l'inscription.

begin;

-- 1) NOMS D'UTILISATEUR UNIQUES
update public.profiles
set username = trim(username)
where username is distinct from trim(username);

-- Conserve le premier compte avec le pseudo original et renomme proprement
-- les anciens doublons avant d'activer la protection.
with ranked as (
  select
    id,
    username,
    row_number() over (
      partition by lower(trim(username))
      order by created_at nulls last, id
    ) as duplicate_rank
  from public.profiles
  where nullif(trim(username), '') is not null
)
update public.profiles p
set username = trim(p.username) || '_' || left(replace(p.id::text, '-', ''), 6)
from ranked r
where p.id = r.id
  and r.duplicate_rank > 1;

create unique index if not exists profiles_username_unique_ci
  on public.profiles (lower(trim(username)))
  where nullif(trim(username), '') is not null;

-- 2) NOUVELLE INSCRIPTION : ALERTE ADMIN + BIENVENUE
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

  insert into public.notifications (user_id, actor_id, type, title, body, link)
  values (
    v_admin,
    new.id,
    'follow',
    'Nouvelle inscription : ' || v_name,
    v_name || ' vient de rejoindre Malagasy Events.',
    '/communaute'
  );

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

commit;
