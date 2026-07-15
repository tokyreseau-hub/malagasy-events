-- ════════════════════════════════════════════════════════════════
-- ANTI-SPAM — Malagasy Events
-- Règles appliquées côté serveur (impossibles à contourner) :
--  · Événements : max 3 soumissions/publications par jour et par membre
--  · Anti-doublon : un événement (même titre + même date) ne peut pas être reposté
--  · Posts communauté : 1 post tous les 3 jours par membre
--  · L'admin officiel n'est jamais limité
-- À exécuter dans Supabase → SQL Editor → Run. Sans risque, idempotent.
-- ════════════════════════════════════════════════════════════════

-- 1. Posts communauté : 1 post / 3 jours (politique restrictive = s'ajoute aux règles existantes)
drop policy if exists "antispam posts 3 jours" on public.posts;
create policy "antispam posts 3 jours" on public.posts
  as restrictive for insert
  with check (
    public.is_admin()
    or not exists (
      select 1 from public.posts p
      where p.user_id = auth.uid()
        and p.created_at > now() - interval '3 days'
    )
  );

-- 2. Soumissions d'événements : max 3 par 24h
-- (le membre doit pouvoir compter ses propres soumissions)
drop policy if exists "voir ses propres soumissions" on public.event_submissions;
create policy "voir ses propres soumissions" on public.event_submissions
  for select using (auth.uid() = submitter_id);

drop policy if exists "antispam soumissions 3 par jour" on public.event_submissions;
create policy "antispam soumissions 3 par jour" on public.event_submissions
  as restrictive for insert
  with check (
    public.is_admin()
    or (
      select count(*) from public.event_submissions s
      where s.submitter_id = auth.uid()
        and s.created_at > now() - interval '1 day'
    ) < 3
  );

-- 3. Publication directe orga : max 3 par 24h aussi
drop policy if exists "antispam events orga 3 par jour" on public.events;
create policy "antispam events orga 3 par jour" on public.events
  as restrictive for insert
  with check (
    public.is_admin()
    or (
      select count(*) from public.events e
      where e.owner_id = auth.uid()
        and coalesce(nullif(e."createdAt",'')::timestamptz, 'epoch'::timestamptz) > now() - interval '1 day'
    ) < 3
  );

-- 4. Anti-doublon : titre + date uniques sur les événements
create unique index if not exists events_titre_date_unique
  on public.events (lower(btrim(title)), date);
