-- ════════════════════════════════════════════════════════════════
-- PSEUDOS — Malagasy Events
-- Chaque membre peut modifier son pseudo, puis doit attendre 5 jours.
-- À exécuter une seule fois dans Supabase → SQL Editor → Run.
-- ════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists username_changed_at timestamptz;

-- Remplace le garde-fou précédent : il conserve la protection des
-- statuts/abonnements, tout en autorisant le changement de pseudo à
-- intervalle régulier. La règle est appliquée par la base elle-même.
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.username is distinct from old.username then
    if trim(coalesce(new.username, '')) = '' then
      raise exception 'Le pseudo ne peut pas être vide.';
    end if;

    -- Personne ne peut prendre l'identité du compte administrateur.
    if not public.is_admin()
       and lower(trim(new.username)) = 'malagasy_events_admin' then
      raise exception 'Ce pseudo est réservé.';
    end if;

    -- Le premier changement est libre ; ensuite, délai de 5 jours.
    if not public.is_admin()
       and old.username_changed_at is not null
       and old.username_changed_at > now() - interval '5 days' then
      raise exception 'Tu pourras modifier ton pseudo à nouveau après 5 jours.';
    end if;

    if exists (
      select 1 from public.profiles p
      where p.id <> old.id
        and lower(p.username) = lower(trim(new.username))
    ) then
      raise exception 'Ce pseudo est déjà utilisé.';
    end if;

    new.username := trim(new.username);
    new.username_changed_at := now();
  else
    -- Le navigateur ne peut pas modifier artificiellement le délai.
    new.username_changed_at := old.username_changed_at;
  end if;

  if not public.is_admin() then
    if to_jsonb(new) ? 'is_member' then new.is_member := old.is_member; end if;
    if to_jsonb(new) ? 'plan' then new.plan := old.plan; end if;
    if to_jsonb(new) ? 'fan_badge' then new.fan_badge := old.fan_badge; end if;
    if to_jsonb(new) ? 'fan_points' then new.fan_points := old.fan_points; end if;
  end if;

  return new;
end;
$$;

alter function public.protect_profile_fields() set search_path = pg_catalog, public;
revoke execute on function public.protect_profile_fields() from public, anon, authenticated;

