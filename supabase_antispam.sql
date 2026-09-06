-- ════════════════════════════════════════════════════════════════
-- ANTI-SPAM v2 — Malagasy Events
--  · Événements : max 3 soumissions/publications par jour et par membre
--  · Doublons événements : avertissement côté site (non bloquant, pour
--    permettre les co-organisations et les événements récurrents)
--  · Posts communauté : 1 post par jour par membre
--  · L'admin officiel n'est jamais limité
-- À exécuter dans Supabase → SQL Editor → Run. Sans risque, idempotent.
-- (Corrige la v1 si tu l'avais déjà exécutée.)
-- ════════════════════════════════════════════════════════════════

-- 0. Retrait de la contrainte stricte de doublon (v1) si elle existe
drop index if exists public.events_titre_date_unique;

-- 1. Posts communauté : 1 post par jour
drop policy if exists "antispam posts 3 jours" on public.posts;
drop policy if exists "antispam posts 1 jour" on public.posts;
create policy "antispam posts 1 jour" on public.posts
  as restrictive for insert
  with check (
    public.is_admin()
    or not exists (
      select 1 from public.posts p
      where p.user_id = auth.uid()
        and p.created_at > now() - interval '1 day'
    )
  );

-- 2. Soumissions d'événements : max 3 par 24h
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
