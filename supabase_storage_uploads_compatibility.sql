-- Compatibilité import d'images (Safari / Supabase Storage).
-- Les utilisateurs connectés peuvent envoyer des images uniquement dans
-- le bucket public d'avatars utilisé par le site.

drop policy if exists "avatars import compatibilite membres" on storage.objects;
create policy "avatars import compatibilite membres"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars');
