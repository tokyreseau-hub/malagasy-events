-- ════════════════════════════════════════════════════════════════
-- FIX — vues en SECURITY INVOKER (avertissement linter Supabase 0010)
-- Les vues doivent appliquer les droits + RLS de l'utilisateur qui
-- les interroge, pas ceux de leur créateur.
-- À coller dans Supabase → SQL Editor → Run. Sans risque, idempotent.
-- ════════════════════════════════════════════════════════════════

alter view public.events_featured_status set (security_invoker = on);
alter view public.entraide_feed        set (security_invoker = on);
