-- ════════════════════════════════════════════════════════════════
-- MISE À NIVEAU SÉCURITÉ — Malagasy Events — juillet 2026
-- À exécuter UNE fois dans Supabase : SQL Editor → New query → Run.
-- Ne supprime aucune donnée. Le script peut être relancé sans risque.
-- ════════════════════════════════════════════════════════════════

-- 1. Les propositions d'événements doivent venir d'un membre connecté.
-- Elles restent obligatoirement « pending » et seul l'admin les traite.
alter table public.event_submissions enable row level security;

drop policy if exists "proposer un event" on public.event_submissions;
drop policy if exists "membre propose un event" on public.event_submissions;
create policy "membre propose un event"
  on public.event_submissions for insert to authenticated
  with check (
    auth.uid() = submitter_id
    and status = 'pending'
  );

drop policy if exists "voir ses propres soumissions" on public.event_submissions;
create policy "voir ses propres soumissions"
  on public.event_submissions for select to authenticated
  using (auth.uid() = submitter_id);

drop policy if exists "antispam soumissions 3 par jour" on public.event_submissions;
create policy "antispam soumissions 3 par jour"
  on public.event_submissions as restrictive for insert to authenticated
  with check (
    (
      select count(*)
      from public.event_submissions as s
      where s.submitter_id = auth.uid()
        and s.created_at > now() - interval '1 day'
    ) < 3
  );

drop policy if exists "admin traite les soumissions" on public.event_submissions;
create policy "admin traite les soumissions"
  on public.event_submissions for update
  using (public.is_admin())
  with check (public.is_admin());

-- 2. Le bucket reste public pour afficher les avatars, mais son contenu
-- ne peut plus être énuméré par l'API. Les URL d'avatar déjà affichées
-- sur le site continuent de fonctionner.
drop policy if exists "avatars lecture publique" on storage.objects;

-- 3. Les fonctions privilégiées ne cherchent plus des objets dans un
-- schéma modifiable par un utilisateur.
alter function public.handle_new_user() set search_path = pg_catalog, public;
alter function public.is_admin() set search_path = pg_catalog, public;
alter function public.protect_plan_fields() set search_path = pg_catalog, public;
alter function public.protect_profile_fields() set search_path = pg_catalog, public;
alter function public.award_fan_points() set search_path = pg_catalog, public;

-- Ces fonctions ne sont utilisées que par des déclencheurs : elles ne
-- doivent jamais être appelables directement depuis l'API publique.
do $$
declare
  function_name text;
begin
  foreach function_name in array array[
    'public.handle_new_user()',
    'public.protect_plan_fields()',
    'public.protect_profile_fields()',
    'public.award_fan_points()'
  ]
  loop
    if to_regprocedure(function_name) is not null then
      execute format('revoke execute on function %s from public, anon, authenticated', function_name);
    end if;
  end loop;
end $$;

-- Le contrôle admin ne lit que le profil public du membre courant : il
-- n'a donc pas besoin de privilèges supplémentaires.
alter function public.is_admin() security invoker;
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;
