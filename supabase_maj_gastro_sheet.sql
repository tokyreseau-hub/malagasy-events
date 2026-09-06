-- ════════════════════════════════════════════════════════════════
-- MISE À JOUR GASTRONOMIE — depuis le tableau de veille (juillet 2026)
-- Ajoute les nouvelles fiches marquées « Afficher : Oui » dans le sheet.
-- Églises : déjà toutes présentes sur le site, rien à ajouter.
-- À exécuter dans Supabase → SQL Editor → Run. Sans risque, idempotent.
-- ════════════════════════════════════════════════════════════════

-- 0. Recale la séquence d'id (les fiches initiales ont des ids explicites)
select setval(pg_get_serial_sequence('public.gastro','id'), greatest((select coalesce(max(id),1) from public.gastro),1));

-- 1. Restaurant Malgache — Nice (Facebook vérifié)
insert into public.gastro (name,type,region,note,fb,city,address,lat,lng)
select 'Restaurant Malgache','Restaurant','Provence-Alpes-Côte d''Azur','Cajun et créole, spécialités réunionnaises et malgaches','https://www.facebook.com/profile.php?id=100068530603400','Nice','Nice',43.7102,7.2620
where not exists (select 1 from public.gastro where fb='https://www.facebook.com/profile.php?id=100068530603400');

-- 2. Ari Nao — guide des restos malgaches en Île-de-France (Facebook vérifié)
insert into public.gastro (name,type,region,note,fb,city)
select 'Ari Nao','Guide','Île-de-France','La page qui teste et recommande les restos malgaches en Île-de-France','https://www.facebook.com/itsarinao','Île-de-France'
where not exists (select 1 from public.gastro where fb='https://www.facebook.com/itsarinao');

-- 3. Groupe « Malagasy à Paris » — communauté bonnes adresses (pas de lien public)
insert into public.gastro (name,type,region,note,city)
select 'Groupe « Malagasy à Paris »','Communauté','Île-de-France','19 200 membres — recense les bonnes adresses de restos malgaches en Île-de-France','Île-de-France'
where not exists (select 1 from public.gastro where name like 'Groupe%Malagasy à Paris%');
