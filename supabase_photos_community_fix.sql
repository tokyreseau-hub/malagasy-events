-- ════════════════════════════════════════════════════════════════
-- CORRECTION DÉFINITIVE — import de photos communauté / profil
-- Malagasy Events · à exécuter UNE fois dans Supabase → SQL Editor
-- Chaque membre connecté peut importer, modifier ou supprimer
-- uniquement les images rangées dans son propre dossier.
-- ════════════════════════════════════════════════════════════════

-- Le bucket utilisé par le site est public uniquement en lecture :
-- les URL des photos peuvent être affichées, mais personne ne peut
-- ajouter de fichier sans être connecté et propriétaire du dossier.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- On remplace seulement les anciennes règles liées au bucket avatars.
-- Cela élimine les règles précédentes qui se contredisaient et causaient
-- le message « new row violates row-level security policy ».
do $$
declare p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and coalesce(qual, '') || ' ' || coalesce(with_check, '') ilike '%avatars%'
  loop
    execute format('drop policy if exists %I on storage.objects', p.policyname);
  end loop;
end $$;

-- Aucune règle SELECT n'est créée : le bucket public permet l'affichage
-- d'une URL déjà connue, sans ouvrir l'énumération de tout son contenu.

-- Un membre connecté agit seulement dans le dossier /<son-id>/…
create policy "photos membres dans leur dossier"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "photos membres modifier leur dossier"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "photos membres supprimer leur dossier"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
