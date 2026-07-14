-- ════════════════════════════════════════════════════════════════
-- ÉPINGLER PARTOUT — Malagasy Events
-- Ajoute la possibilité de mettre « à la une » dans chaque rubrique :
-- gastronomie, organisateurs, after-movies (les événements l'ont déjà).
-- À exécuter dans Supabase → SQL Editor → Run. Sans risque, idempotent.
-- ════════════════════════════════════════════════════════════════

alter table public.gastro        add column if not exists featured boolean not null default false;
alter table public.organisateurs add column if not exists featured boolean not null default false;
alter table public.videos        add column if not exists featured boolean not null default false;
