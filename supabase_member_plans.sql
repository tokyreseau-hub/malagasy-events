-- ════════════════════════════════════════════════════════════════
-- PACK PAR MEMBRE — Malagasy Events
-- Permet à l'admin d'attribuer à chaque membre : gratuit / organisateur / pro.
-- À exécuter dans Supabase → SQL Editor → Run. Sans risque, idempotent.
-- (À lancer APRÈS supabase_security_hardening.sql)
-- ════════════════════════════════════════════════════════════════

-- 1. Colonne « pack » sur chaque membre
alter table public.profiles
  add column if not exists plan text not null default 'free'
  check (plan in ('free','organisateur','pro'));

-- 2. L'admin peut modifier n'importe quel profil (pour attribuer les packs).
--    Combinée à la policy « chacun modifie le sien », Postgres autorise
--    l'admin sur tous ET chaque membre sur le sien.
drop policy if exists "admin met a jour les profils" on public.profiles;
create policy "admin met a jour les profils" on public.profiles for update using (public.is_admin());

-- 3. Garde-fou : un membre ne peut pas s'attribuer un pack lui-même
--    ni se renommer admin ni s'offrir le statut membre. Seul l'admin le peut.
create or replace function public.protect_profile_fields() returns trigger
language plpgsql security definer as $f$
begin
  if not public.is_admin() then
    if new.username is distinct from old.username and old.username is not null then
      new.username := old.username;
    end if;
    if to_jsonb(new) ? 'is_member' then new.is_member := old.is_member; end if;
    if to_jsonb(new) ? 'plan'      then new.plan      := old.plan;      end if;
  end if;
  return new;
end $f$;
drop trigger if exists trg_protect_profile on public.profiles;
create trigger trg_protect_profile before update on public.profiles
  for each row execute function public.protect_profile_fields();
