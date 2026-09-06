-- ════════════════════════════════════════════════════════════════
-- POSTER EN TANT QU'ORGANISATEUR — fil Communauté (Malagasy Events)
-- Permet au propriétaire d'une fiche organisateur (mode orga, ex. Mafana Vibes)
-- de publier dans le fil Communauté au nom de son organisme.
-- À exécuter dans Supabase → SQL Editor → Run. Sans risque, idempotent.
-- ════════════════════════════════════════════════════════════════

-- 1. Colonne orga_id sur les posts (null = post personnel)
alter table public.posts
  add column if not exists orga_id bigint references public.organisateurs(id) on delete set null;

-- 2. Seul le propriétaire de la fiche (ou un admin) peut poster en son nom
drop policy if exists "poster en tant qu orga" on public.posts;
create policy "poster en tant qu orga" on public.posts
  as restrictive for insert
  with check (
    orga_id is null
    or public.is_admin()
    or exists (
      select 1 from public.organisateurs o
      where o.id = orga_id and o.owner_id = auth.uid()
    )
  );

-- 3. Index pour retrouver les posts d'un organisme
create index if not exists posts_orga_id_idx on public.posts(orga_id) where orga_id is not null;
