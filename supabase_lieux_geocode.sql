-- ════════════════════════════════════════════════════════════════
-- LIEUX — coordonnées carte (lat/lng) — Malagasy Events
-- Ajoute les colonnes lat/lng à la table lieux et géocode les
-- adresses trouvées, pour que les églises/boutiques apparaissent
-- comme épingles sur la carte (le front filtre sur l.lat && l.lng).
-- Coordonnées approximatives (niveau rue/ville) — suffisant pour la carte.
-- À coller dans Supabase → SQL Editor → Run. Idempotent.
-- ════════════════════════════════════════════════════════════════

alter table public.lieux add column if not exists lat double precision;
alter table public.lieux add column if not exists lng double precision;

-- ÉGLISES
update public.lieux set lat=48.8556, lng=2.3730 where id=1;   -- Wagner, Paris 11e
update public.lieux set lat=48.8419, lng=2.3016 where id=2;   -- 91 rue Blomet, Paris 15e
update public.lieux set lat=48.8149, lng=2.3172 where id=3;   -- Montrouge
update public.lieux set lat=48.9603, lng=2.8790 where id=4;   -- Meaux
update public.lieux set lat=49.0175, lng=2.0390 where id=6;   -- Neuville-sur-Oise
update public.lieux set lat=48.1119, lng=-1.6742 where id=7;  -- Rennes
update public.lieux set lat=48.4470, lng=1.5030 where id=8;   -- Chartres
update public.lieux set lat=48.9603, lng=2.8790 where id=9;   -- STK Meaux
update public.lieux set lat=48.8287, lng=2.3310 where id=10;  -- FLM, Paris 14e
update public.lieux set lat=48.8320, lng=2.3450 where id=11;  -- FKMP, Paris 13e
update public.lieux set lat=48.8161, lng=2.3120 where id=12;  -- Montrouge-Paris
update public.lieux set lat=47.9029, lng=1.9093 where id=13;  -- Orléans

-- BOUTIQUES / ARTISANAT
update public.lieux set lat=48.8258, lng=2.3660 where id=101; -- Épicerie de Madagascar, Paris 13e
update public.lieux set lat=48.8419, lng=2.7010 where id=102; -- Bussy-Saint-Georges
update public.lieux set lat=45.7620, lng=4.8270 where id=105; -- Equinoxe, Lyon 5e
update public.lieux set lat=45.6470, lng=0.0210 where id=106; -- J'M Vanille, Sireuil (16)
update public.lieux set lat=49.4760, lng=1.0370 where id=108; -- Mada Vanille, Maromme (76)
update public.lieux set lat=47.8080, lng=7.1060 where id=201; -- Comptoir Malgache, Thann (68)
update public.lieux set lat=47.3941, lng=0.6848 where id=202; -- Raphia & Cie, Tours (37)
update public.lieux set lat=45.7700, lng=4.8500 where id=206; -- Artisanat de Madagascar, Lyon 6e

-- Fleur de Soie Lambamena (ajoutée précédemment par nom)
update public.lieux set lat=45.7050, lng=4.8860 where name='Fleur de Soie Lambamena';

-- Note : les fiches "en ligne" (Jedia-Soa, Miamland, Alsace Vanille, Tany Mafana,
-- Couleurs Raphia, Tongasoa, + églises sans adresse) restent sans coordonnées
-- (elles ne sont pas des lieux physiques → pas d'épingle, c'est normal).
