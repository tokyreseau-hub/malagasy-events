-- MODE ORGANISATEUR — création et revendication de fiche par les membres orga
-- À exécuter dans Supabase → SQL Editor → Run. Sans risque, idempotent.

-- Un membre au plan organisateur/pro peut CRÉER sa propre fiche (owner = lui)
drop policy if exists "orga cree sa fiche" on public.organisateurs;
create policy "orga cree sa fiche" on public.organisateurs for insert
  with check (
    owner_id = auth.uid()
    and exists(select 1 from public.profiles where id = auth.uid() and plan in ('organisateur','pro'))
  );

-- Un membre au plan organisateur/pro peut REVENDIQUER une fiche sans propriétaire
drop policy if exists "revendiquer une fiche libre" on public.organisateurs;
create policy "revendiquer une fiche libre" on public.organisateurs for update
  using (
    owner_id is null
    and exists(select 1 from public.profiles where id = auth.uid() and plan in ('organisateur','pro'))
  )
  with check (owner_id = auth.uid());
