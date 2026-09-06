-- ════════════════════════════════════════════════════════════════
-- FINALISATION DES FONCTIONS — Malagasy Events — juillet 2026
-- Copie TOUT ce fichier dans Supabase SQL Editor, puis clique Run.
-- Ne modifie pas le texte. Aucune donnée n'est supprimée.
-- ════════════════════════════════════════════════════════════════

-- Empêche les fonctions privilégiées de chercher des objets dans un
-- schéma modifiable par un utilisateur.
alter function public.handle_new_user() set search_path = pg_catalog, public;
alter function public.is_admin() set search_path = pg_catalog, public;
alter function public.protect_plan_fields() set search_path = pg_catalog, public;
alter function public.protect_profile_fields() set search_path = pg_catalog, public;
alter function public.award_fan_points() set search_path = pg_catalog, public;

-- Ces quatre fonctions ne servent qu'aux déclencheurs internes de la
-- base : aucun visiteur ni membre ne doit pouvoir les appeler directement.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_plan_fields() from public, anon, authenticated;
revoke execute on function public.protect_profile_fields() from public, anon, authenticated;
revoke execute on function public.award_fan_points() from public, anon, authenticated;

-- Le contrôle admin ne lit que le profil public du membre courant ;
-- il n'a donc pas besoin de privilèges supplémentaires.
alter function public.is_admin() security invoker;
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;
