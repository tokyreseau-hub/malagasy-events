-- ════════════════════════════════════════════════════════════════
-- CARTE & ZONES pour les LIEUX (Églises · Boutiques · Artisanat)
-- Ajoute region + coordonnées GPS pour la carte et les filtres de zone.
-- À exécuter dans Supabase → SQL Editor → Run. Sans risque, idempotent.
-- ════════════════════════════════════════════════════════════════

-- 1. Nouvelles colonnes
alter table public.lieux add column if not exists region text default '';
alter table public.lieux add column if not exists lat double precision;
alter table public.lieux add column if not exists lng double precision;

-- 2. ÉGLISES (coordonnées d'après l'adresse ou la ville)
update public.lieux set region='Île-de-France', lat=48.8557, lng=2.3697 where id=1;   -- FJKM Wagner (Paris 11e)
update public.lieux set region='Île-de-France', lat=48.8417, lng=2.2996 where id=2;   -- FJKM Ilanivato (rue Blomet, Paris 15e)
update public.lieux set region='Île-de-France', lat=48.8172, lng=2.3219 where id=3;   -- Voronkely Montrouge
update public.lieux set region='Île-de-France', lat=48.9603, lng=2.8883 where id=4;   -- FJKM Filadelfia Meaux
update public.lieux set region='Île-de-France', lat=48.8480, lng=2.5529 where id=5;   -- FJKM Betlehema (Noisy-le-Grand)
update public.lieux set region='Île-de-France', lat=49.0166, lng=2.0599 where id=6;   -- FJKM Jerosalema (Neuville-sur-Oise)
update public.lieux set region='Bretagne & Pays de la Loire', lat=48.1173, lng=-1.6778 where id=7; -- FJKM Rennes Laval
update public.lieux set region='Centre-Val de Loire', lat=48.4439, lng=1.4893 where id=8;  -- VOMM Chartres
update public.lieux set region='Île-de-France', lat=48.9603, lng=2.8883 where id=9;   -- STK Meaux
update public.lieux set region='Île-de-France', lat=48.8266, lng=2.3277 where id=10;  -- FLM Paris (rue Marie Rose, 14e)
update public.lieux set region='Île-de-France', lat=48.8566, lng=2.3522 where id=11;  -- FKMP Paris
update public.lieux set region='Île-de-France', lat=48.8188, lng=2.3153 where id=12;  -- FJKM Fiorenana (Montrouge)
update public.lieux set region='Centre-Val de Loire', lat=47.9029, lng=1.9093 where id=13; -- FPMA Orléans
update public.lieux set region='' where id=14;                                        -- Pasteur Jacky (national)

-- 3. BOUTIQUES
update public.lieux set region='Île-de-France', lat=48.8265, lng=2.3654 where id=101; -- Épicerie de Madagascar (Paris 13e)
update public.lieux set region='Île-de-France', lat=48.8433, lng=2.6964 where id=102; -- Le Soleil de Madagascar (Bussy-St-Georges)
update public.lieux set region='' where id in (103,104);                              -- Jedia-Soa, Miamland (en ligne)
update public.lieux set region='Auvergne-Rhône-Alpes', lat=45.7597, lng=4.8186 where id=105; -- Equinoxe (Lyon 5e)
update public.lieux set region='Nouvelle-Aquitaine', lat=45.6199, lng=0.0257 where id=106;   -- J'M Vanille (Sireuil 16)
update public.lieux set region='Grand Est' where id=107;                              -- Alsace Vanille (en ligne)
update public.lieux set region='Normandie', lat=49.4788, lng=1.0312 where id=108;     -- Mada Vanille (Maromme 76)

-- 4. ARTISANAT
update public.lieux set region='Grand Est', lat=47.8073, lng=7.1035 where id=201;     -- Comptoir Malgache (Thann 68)
update public.lieux set region='Centre-Val de Loire', lat=47.3941, lng=0.6848 where id=202; -- Raphia & Cie (Tours)
update public.lieux set region='' where id in (203,204,205);                          -- en ligne
update public.lieux set region='Auvergne-Rhône-Alpes', lat=45.7679, lng=4.8506 where id=206; -- Artisanat de Madagascar (Lyon 6e)

-- 5. Fiches ajoutées à la main (si présentes) — repérées par nom
update public.lieux set region='Auvergne-Rhône-Alpes', lat=45.6976, lng=4.8869
where name like 'Fleur de Soie%' and (lat is null);
