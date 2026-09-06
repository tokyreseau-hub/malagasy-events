-- ════════════════════════════════════════════════════════════════
-- AVANTAGES DES PACKS — Malagasy Events
-- Autorise les membres Organisateur/Pro (propriétaires d'une fiche)
-- à publier des actus, en plus des fiches en forfait pro.
-- À exécuter APRÈS supabase_member_plans.sql. Sans risque, idempotent.
-- ════════════════════════════════════════════════════════════════

drop policy if exists "publier si pro ou admin" on public.orga_posts;
create policy "publier si pro ou admin" on public.orga_posts for insert with check (
  public.is_admin() or (
    auth.uid() = user_id and exists (
      select 1 from public.organisateurs o
      where o.id = orga_id and o.owner_id = auth.uid()
        and (
          (o.plan = 'pro' and (o.plan_until is null or o.plan_until >= current_date))
          or exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.plan = 'organisateur'
          )
        )
    )
  )
);
