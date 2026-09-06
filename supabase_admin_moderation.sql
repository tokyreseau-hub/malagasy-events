-- MODÉRATION ADMIN — droits de suppression sur entraide et actus d'orgas
-- À exécuter dans Supabase → SQL Editor → Run. Sans risque, idempotent.

drop policy if exists "entraide admin delete" on public.entraide;
create policy "entraide admin delete" on public.entraide for delete using (public.is_admin());

drop policy if exists "orga_posts admin delete" on public.orga_posts;
create policy "orga_posts admin delete" on public.orga_posts for delete using (public.is_admin());
