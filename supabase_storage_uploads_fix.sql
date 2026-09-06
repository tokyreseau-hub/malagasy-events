-- ════════════════════════════════════════════════════════════════
-- CORRECTION IMPORT D'IMAGES — Malagasy Events
-- Chaque membre peut importer uniquement dans son propre dossier.
-- À exécuter dans Supabase → SQL Editor → New query → Run.
-- ════════════════════════════════════════════════════════════════

drop policy if exists "avatars import dans son dossier" on storage.objects;
create policy "avatars import dans son dossier"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars modifier dans son dossier" on storage.objects;
create policy "avatars modifier dans son dossier"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
