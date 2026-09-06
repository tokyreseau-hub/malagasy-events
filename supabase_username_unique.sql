-- NOMS D'UTILISATEUR UNIQUES — Malagasy Events
-- Rend les pseudos uniques sans distinction de casse ni d'espaces.
-- Exemples équivalents : Toky, toky, " TOKY ".

-- Normalise les valeurs existantes.
update public.profiles
set username = trim(username)
where username is distinct from trim(username);

-- Si des doublons historiques existent, conserve le premier pseudo et ajoute
-- un suffixe stable aux suivants avant de créer la contrainte.
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

