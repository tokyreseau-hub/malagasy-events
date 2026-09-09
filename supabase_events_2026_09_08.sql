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

-- Veille vérifiée du 10 septembre : correction du Tournoi de la Solidarité.
update public.events
set title = 'Tournoi de la Solidarité 2026 — CSM & MASOVA',
    date = '2026-10-24',
    location = 'Complexe sportif Saint-Exupéry, Villebon-sur-Yvette (91)',
    city = 'Villebon-sur-Yvette',
    price = 'Tarifs selon discipline',
    organizer = 'Collectif Sport Malagasy',
    "ticketUrl" = 'https://www.helloasso.com/associations/association-masova-madagascar-solidarite-volontariat-et-action/evenements/tournoi-de-la-solidarite-2026-collaboration-masova-csm',
    official_source_url = 'https://www.helloasso.com/associations/association-masova-madagascar-solidarite-volontariat-et-action/evenements/tournoi-de-la-solidarite-2026-collaboration-masova-csm',
    description = 'Troisième édition du Tournoi de la Solidarité, organisée par MASOVA avec le Collectif Sport Malagasy, les samedi 24 et dimanche 25 octobre 2026 au Complexe sportif Saint-Exupéry de Villebon-sur-Yvette. Disciplines annoncées : football, basket, volley, tennis de table, pétanque et initiation bachata. Les inscriptions se font auprès de l’organisateur sur HelloAsso.'
where id = 15
   or lower(title) = lower('Tournoi de la Solidarité — CSM');

-- Six événements absents, chacun confirmé sur une billetterie officielle.
insert into public.events
  (title, date, location, address, city, category, image, price, organizer,
   "ticketUrl", official_source_url, updates_url, description, "mediaUrls", "createdAt")
select v.title, v.date::date, v.location, v.address, v.city, v.category, '', v.price,
       v.organizer, v.ticket_url, v.source_url, v.source_url, v.description,
       '[]'::jsonb, '2026-09-10T00:00:00.000Z'
from (values
  ('Conférence « Filles du Roi » — FPMA','2026-09-12','Église FPMA Paris Chauchat, 16 rue Chauchat, 75009 Paris','16 rue Chauchat, 75009 Paris','Paris','Religion','Prix libre — inscription obligatoire','FPMA STK','https://www.helloasso.com/associations/fpma-stk/evenements/inscription-evenement-filles-du-roi','https://www.helloasso.com/associations/fpma-stk/evenements/inscription-evenement-filles-du-roi','Conférence organisée par la FPMA, la STK Nationale et la SVK Iraisana les samedi 12 et dimanche 13 septembre 2026. Ouverte aux femmes et aux hommes, elle propose des plénières, témoignages, ateliers et espaces de rencontre autour de l’identité de la femme comme enfant de Dieu. Samedi de 10 h à 20 h, dimanche de 10 h à 13 h. Participation libre, inscription obligatoire.'),
  ('Tongasoa Festival Lyon','2026-09-12','Meyzieu Gare, Meyzieu (69)','','Meyzieu','Culture','12 € étudiant / 15 € plein','Isla Primera','https://www.helloasso.com/associations/isla-primera/evenements/tongasoa-festival-lyon','https://www.helloasso.com/associations/isla-primera/evenements/tongasoa-festival-lyon','Festival culturel malagasy organisé du samedi 12 septembre à 11 h au dimanche 13 septembre 2026 à 4 h. Gastronomie, culture, danse, musique, artisanat, réseautage, accueil des étudiants, concert et soirée DJ sont annoncés par Isla Primera.'),
  ('10e Nuit Malgache — repas, tombola et danse','2026-10-10','Salle de Haute Plage, La Grande-Motte','','La Grande-Motte','Soirée','40 € repas sur place','Association Zazakely Ambodivondava-Alasora','https://www.helloasso.com/associations/association-zazakely-pour-les-enfants-d-ambodivondava-alasora/evenements/10-eme-nuit-malgache','https://www.helloasso.com/associations/association-zazakely-pour-les-enfants-d-ambodivondava-alasora/evenements/10-eme-nuit-malgache','Dixième Nuit Malgache le samedi 10 octobre 2026 à partir de 19 h : repas malgache, grande tombola et soirée dansante avec le groupe Sardi Sixties. Les recettes soutiennent les actions de l’association Zazakely pour les enfants d’Ambodivondava-Alasora.'),
  ('Revy Mahaleo à Nantes — Dama & Bekoto','2026-10-31','Salon Mauduit, Nantes','','Nantes','Culture','35 € prévente','HETSIKA','https://www.helloasso.com/associations/hetsika-accueil-arts-et-culture-de-madagascar/evenements/revy-mahaleo','https://www.helloasso.com/associations/hetsika-accueil-arts-et-culture-de-madagascar/evenements/revy-mahaleo','Concert exceptionnel de Mahaleo avec Dama et Bekoto, samedi 31 octobre 2026 de 20 h à 23 h au Salon Mauduit à Nantes. Restauration et librairie malgaches sur place dès 19 h. Prévente limitée à cinq billets par personne.'),
  ('Revy Mahaleo — tournée européenne à Tourcoing','2026-11-20','Salle Georges Dael, Tourcoing','','Tourcoing','Culture','25 € early bird / 30 € plein / gratuit -15 ans','Gasy de l’Île','https://www.helloasso.com/associations/gasy-de-l-ile/evenements/revy-mahaleo-tournee-europeenne-2026-metropole-lilloise','https://www.helloasso.com/associations/gasy-de-l-ile/evenements/revy-mahaleo-tournee-europeenne-2026-metropole-lilloise','Étape de la tournée européenne de Mahaleo avec Dama, Bekoto et les Taranaka, vendredi 20 novembre 2026. Ouverture des portes à 18 h 30, concert de 19 h 30 à 22 h 30. Sakafo et boissons proposés sur place.'),
  ('Amy & Andy — concert solidaire LACIM Madagascar','2026-11-21','Salle d’animation de la mairie, 52 rue de la Rencontre, 69210 Éveux','52 rue de la Rencontre, 69210 Éveux','Éveux','Culture','10 €','LACIM — comité d’Éveux','https://www.helloasso.com/associations/lacim/evenements/amy-et-andy-en-duo-pop-rock-et-folk-concert-solidaire-lacim-madagascar','https://www.helloasso.com/associations/lacim/evenements/amy-et-andy-en-duo-pop-rock-et-folk-concert-solidaire-lacim-madagascar','Concert solidaire du duo Amy & Andy le samedi 21 novembre 2026 de 19 h 30 à 22 h 30. Les bénéfices contribueront à reconstruire trois classes de l’école primaire d’Andranomaitso à Madagascar. Buvette et petite restauration sur place.')
) as v(title,date,location,address,city,category,price,organizer,ticket_url,source_url,description)
where not exists (
  select 1 from public.events e
  where lower(e.title) = lower(v.title)
    and e.date = v.date::date
);

-- Recontrôle officiel du 10 septembre : précision de la fiche Rija Ramanantoanina.
update public.events
set location = 'Espace Magnan, 31 rue Louis-de-Coppet, 06000 Nice',
    address = '31 rue Louis-de-Coppet, 06000 Nice',
    city = 'Nice',
    price = '30 €',
    organizer = 'Scènes du Sud',
    "ticketUrl" = 'https://www.explorenicecotedazur.com/fete-manifestation/rija-ramanantoanina/',
    official_source_url = 'https://www.explorenicecotedazur.com/fete-manifestation/rija-ramanantoanina/',
    description = 'Rija Ramanantoanina présente son nouvel album « FY » en concert à l’Espace Magnan de Nice, samedi 17 octobre 2026 à 19 h 30. Adresse officielle : 31 rue Louis-de-Coppet, 06000 Nice. Tarif annoncé : 30 €.'
where lower(title) = lower('Rija Ramanantoanina en concert');
