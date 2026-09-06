-- ════════════════════════════════════════════════════════════════
-- IDENTITÉ VISUELLE DES ORGANISATEURS — Malagasy Events
-- Logo/photo + couleur de marque personnalisée.
-- À exécuter dans Supabase → SQL Editor → New query → Run.
-- ════════════════════════════════════════════════════════════════

alter table public.organisateurs
  add column if not exists logo_url text not null default '';

alter table public.organisateurs
  add column if not exists brand_color text not null default '';

alter table public.organisateurs
  drop constraint if exists organisateurs_brand_color_check;

alter table public.organisateurs
  add constraint organisateurs_brand_color_check
  check (brand_color = '' or brand_color ~ '^#[0-9A-Fa-f]{6}$');
