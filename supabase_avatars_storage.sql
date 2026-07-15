-- ════════════════════════════════════════════════════════════════
-- STOCKAGE DES PHOTOS DE PROFIL — Malagasy Events
-- Crée le bucket public « avatars » + les règles d'accès.
-- À exécuter dans Supabase → SQL Editor → Run. Sans risque, idempotent.
-- ════════════════════════════════════════════════════════════════

-- 1. Bucket public "avatars"
insert into storage.buckets (id, name, public)
values ('avatars','avatars', true)
on conflict (id) do update set public = true;

-- 2. Règles d'accès sur les fichiers du bucket
drop policy if exists "avatars lecture publique" on storage.objects;
create policy "avatars lecture publique" on storage.objects
  for select using (bucket_id = 'avatars');

-- Un membre connecté envoie sa photo dans SON dossier (nommé par son id)
drop policy if exists "avatars upload par le proprietaire" on storage.objects;
create policy "avatars upload par le proprietaire" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars maj par le proprietaire" on storage.objects;
create policy "avatars maj par le proprietaire" on storage.objects
  for update using (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars suppression par le proprietaire" on storage.objects;
create policy "avatars suppression par le proprietaire" on storage.objects
  for delete using (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );
