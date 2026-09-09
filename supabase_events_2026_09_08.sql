-- Lot événementiel consolidé de septembre 2026.
-- Relançable sans créer de doublons (contrôle par titre et date).

insert into public.events
  (title, date, location, address, city, category, image, price, organizer,
   "ticketUrl", official_source_url, updates_url, description, "mediaUrls", "createdAt")
select
  'Coupe de France — Mimosa Mada-Sport vs FC Gournay 93',
  '2026-09-13',
  'Parc des sports Plaine Nord n°1, 94600 Choisy-le-Roi',
  'Parc des sports Plaine Nord n°1, 94600 Choisy-le-Roi',
  'Choisy-le-Roi',
  'Sport',
  '',
  'Tarif non communiqué',
  'Mimosa Mada-Sport',
  '',
  'https://www.instagram.com/mimosa.madasport1/',
  'https://www.instagram.com/mimosa.madasport1/',
  'Mimosa Mada-Sport reçoit le FC Gournay 93 pour le 3e tour de la Coupe de France Crédit Agricole, dimanche 13 septembre 2026 à 14 h 30. Rendez-vous au Parc des sports Plaine Nord n°1, 94600 Choisy-le-Roi. Les informations et éventuelles mises à jour sont publiées par Mimosa Mada-Sport sur son compte Instagram officiel.',
  '[]'::jsonb,
  '2026-09-08T00:00:00.000Z'
where not exists (
  select 1 from public.events
  where lower(title) = lower('Coupe de France — Mimosa Mada-Sport vs FC Gournay 93')
    and date = '2026-09-13'
);

insert into public.events
  (title, date, location, address, city, category, image, price, organizer,
   "ticketUrl", official_source_url, updates_url, description, "mediaUrls", "createdAt")
select
  'Tana–Paris–Tana — théâtre musical',
  '2026-10-03',
  'Espace Maison Blanche, 2 avenue Saint-Exupéry, 92320 Châtillon',
  'Espace Maison Blanche, 2 avenue Saint-Exupéry, 92320 Châtillon',
  'Châtillon',
  'Culture',
  '/posters/tana-paris-tana-sehatra-ba-gasy-2026.jpg',
  '20 €',
  'Sehatra Ba Gasy France',
  '',
  '',
  '',
  'Le groupe Sehatra Ba Gasy France présente « Tana–Paris–Tana », un théâtre musical consacré au patrimoine malgache, samedi 3 octobre 2026 à partir de 19 h à l’Espace Maison Blanche, 2 avenue Saint-Exupéry, 92320 Châtillon. Tarif unique : 20 €. Réservations : 06 03 82 72 28 ou 06 18 40 81 37. Un buffet de spécialités malgaches sera proposé sur place en supplément.',
  '[]'::jsonb,
  '2026-09-08T00:00:00.000Z'
where not exists (
  select 1 from public.events
  where lower(title) = lower('Tana–Paris–Tana — théâtre musical')
    and date = '2026-10-03'
);

-- Le partenaire a confirmé l'autorisation d'utiliser son affiche officielle.
update public.events
set image = '/posters/tana-paris-tana-sehatra-ba-gasy-2026.jpg'
where lower(title) = lower('Tana–Paris–Tana — théâtre musical')
  and date = '2026-10-03';

-- RNS–CEN est partenaire : logo officiel et compte Instagram vérifié.
update public.organisateurs
set logo_url = '/images/rns-cen-logo.jpg',
    insta = 'https://www.instagram.com/rns_cen/'
where id = 1
   or lower(name) in (
     lower('RNS — Rencontre Nationale Sportive'),
     lower('RNS - Rencontre Nationale Sportive')
   );

-- Les deux affiches du rendez-vous RNS du 5 septembre proviennent du site
-- officiel du partenaire. L'affiche JPO devient la couverture principale ;
-- la seconde affiche est présentée dans la fiche détaillée par le site.
update public.events
set image = '/posters/rns-journee-portes-ouvertes-2026.jpg',
    official_source_url = 'https://www.rns-cen.com/journee-portes-ouvertes-le-5-septembre-2026/',
    updates_url = 'https://www.instagram.com/rns_cen/'
where lower(title) = lower('Journée portes ouvertes & soirée C’est parti ! — RNS CEN')
  and date = '2026-09-05';

-- Ajout du 9 septembre : concert MAGE 4, vérifié sur le site officiel IVENCO.
insert into public.events
  (title, date, location, address, city, category, image, price, organizer,
   "ticketUrl", official_source_url, updates_url, description, "mediaUrls", "createdAt", lat, lng)
select
  'MAGE 4 à Paris — Le Millénaire',
  '2026-09-12',
  'Le Millénaire, 3 place du 19-Mars-1962, 77176 Savigny-le-Temple',
  'Le Millénaire, 3 place du 19-Mars-1962, 77176 Savigny-le-Temple',
  'Savigny-le-Temple',
  'Culture',
  '',
  '35 € prévente / 40 € sur place',
  'IVENCO',
  'https://mage4.ivenco.net/concert-paris',
  'https://mage4.ivenco.net/concert-paris',
  'https://www.instagram.com/gas_paname_sport/',
  'MAGE 4 revient en France après sept ans pour un concert au Millénaire de Savigny-le-Temple, samedi 12 septembre 2026. Ouverture des portes à 20 h 30 et début du concert à 21 h 30. L’organisateur annonce 500 places, un tarif de 35 € en prévente et 40 € sur place. Gaspaname annonce offrir 50 invitations gratuites : pour connaître les conditions et vérifier leur disponibilité, contactez directement Gaspaname en message privé. Cette opération est proposée par Gaspaname et non par Malagasy Events. Placement libre. Accès par le RER D, gare Savigny-le-Temple–Nandy, puis environ deux minutes à pied. Informations concert : 06 60 96 69 50 ou 06 49 51 51 88.',
  '[]'::jsonb,
  '2026-09-09T00:00:00.000Z',
  48.5829635,
  2.5759079
where not exists (
  select 1 from public.events
  where lower(title) = lower('MAGE 4 à Paris — Le Millénaire')
    and date = '2026-09-12'
);

-- Ajout du 9 septembre : soirée KOSMO — Back to School.
insert into public.events
  (title, date, location, address, city, category, image, price, organizer,
   "ticketUrl", official_source_url, updates_url, description, "mediaUrls", "createdAt")
select
  'KOSMO — Back to School',
  '2026-09-26',
  'Infinity Club, 94 rue d’Amsterdam, 75009 Paris',
  '94 rue d’Amsterdam, 75009 Paris',
  'Paris',
  'Soirée',
  '',
  'Tarif à confirmer',
  'KOSMO',
  '',
  'https://www.instagram.com/kosmo.fr/',
  'https://www.instagram.com/kosmo.fr/',
  'KOSMO présente sa soirée « Back to School » le samedi 26 septembre 2026 à l’Infinity Club, 94 rue d’Amsterdam, 75009 Paris. Ambiances annoncées : shatta, dancehall, salegy, bouyon et zouk. Line-up indiqué sur l’annonce : Tamy, Yoyo, Nawer et Yastonpêche. L’horaire, le tarif et la billetterie seront ajoutés dès leur confirmation par l’organisateur.',
  '[]'::jsonb,
  '2026-09-09T00:00:00.000Z'
where not exists (
  select 1 from public.events
  where lower(title) = lower('KOSMO — Back to School')
    and date = '2026-09-26'
);

update public.organisateurs
set type = 'DJ & organisateur',
    note = 'DJ et organisateur de soirées parisiennes, dont KOSMO — Back to School à l’Infinity Club.',
    insta = 'https://www.instagram.com/kosmo.fr/'
where lower(name) = lower('KOSMO');
