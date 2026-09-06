-- ════════════════════════════════════════════════════════════════
-- MODIFICATION DES CONTENUS — Malagasy Events
-- Auteur ou admin uniquement. À lancer dans Supabase → SQL Editor.
-- ════════════════════════════════════════════════════════════════

-- Publications de la communauté : l'auteur ou l'admin peut modifier.
drop policy if exists "modifier son post" on public.posts;
drop policy if exists "modifier son post ou admin" on public.posts;
create policy "modifier son post ou admin" on public.posts
  for update to authenticated
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

-- Actus d'un organisateur : propriétaire de l'actu ou admin.
drop policy if exists "modifier ses actus ou admin" on public.orga_posts;
create policy "modifier ses actus ou admin" on public.orga_posts
  for update to authenticated
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

-- Les événements directs étaient déjà modifiables par leur auteur et par
-- l'admin. Ces règles explicites conservent ce fonctionnement.
drop policy if exists "orga modifie son evenement" on public.events;
drop policy if exists "events admin update" on public.events;
drop policy if exists "modifier son evenement ou admin" on public.events;
create policy "modifier son evenement ou admin" on public.events
  for update to authenticated
  using (auth.uid() = owner_id or public.is_admin())
  with check (auth.uid() = owner_id or public.is_admin());
