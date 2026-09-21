-- MALAGASY EVENTS — PUBLICATION VALIDÉE DU 22 SEPTEMBRE 2026
-- Karibo, AmbondronA Lyon et correction Gas'Paname.
-- Les justificatifs sont conservés dans un schéma privé, non exposé au site.

begin;

create schema if not exists private;
revoke all on schema private from public;

create table if not exists private.event_evidence (
  id bigint generated always as identity primary key,
  event_id bigint not null references public.events(id) on delete cascade,
  source_kind text not null,
  source_label text not null,
  source_reference text not null default '',
  source_sha256 text not null default '',
  received_at timestamptz not null default now(),
  notes text not null default '',
  created_at timestamptz not null default now(),
  unique (event_id, source_sha256)
);

alter table private.event_evidence enable row level security;
revoke all on table private.event_evidence from public, anon, authenticated;

insert into public.events
  (title, date, location, city, category, image, price, organizer,
   "ticketUrl", description, "mediaUrls", "createdAt", featured,
   official_source_url, updates_url, address)
select
  'Karibo — Le goût de Madagascar chez les Ch''tis',
  '2026-09-27',
  'Les Petites Cantines Croix, 3 place des Martyrs de la Résistance, 59170 Croix',
  'Croix', 'Gastronomie', '',
  '8 € membres/enfants · 10 € moins de 26 ans · 12 € adultes',
  'EMMA — Solidarité Étudiante Hauts-de-France',
  'https://www.helloasso.com/associations/etudiants-mifanampy-madagascar-marcq/evenements/karibo',
  'Une journée de restauration solidaire autour des saveurs de Madagascar, dimanche 27 septembre 2026. Restauration de 11 h 30 à 18 h et Atelier Tremplin de 16 h à 18 h. L''entrée ou le dessert avec trois plats au choix est annoncé à partir de 5 €. La restauration est en supplément des tarifs journée. Réservation possible sur HelloAsso.',
  '[]'::jsonb, now()::text, false,
  'https://www.helloasso.com/associations/etudiants-mifanampy-madagascar-marcq/evenements/karibo',
  '', '3 place des Martyrs de la Résistance, 59170 Croix'
where not exists (
  select 1 from public.events
  where lower(title)=lower('Karibo — Le goût de Madagascar chez les Ch''tis')
    and date='2026-09-27'
);

insert into public.events
  (title, date, location, city, category, image, price, organizer,
   "ticketUrl", description, "mediaUrls", "createdAt", featured,
   official_source_url, updates_url, address)
select
  'AmbondronA — 25 taona isika à Lyon',
  '2026-11-14',
  'Le Gold Réception, 7 route des Troques, 69630 Chaponost',
  'Chaponost', 'Culture', '', 'Tarif à confirmer',
  'AmbondronA Europe Tour', '',
  'AmbondronA célèbre ses 25 ans avec une étape de sa tournée européenne près de Lyon, samedi 14 novembre 2026. Ouverture annoncée à 19 h au Gold Réception de Chaponost. Le programme communiqué comprend le concert, une soirée DJ avec DJ Medhy ADR'' et une vente de tsaky. La billetterie est annoncée sur Billetweb ; le lien direct sera ajouté dès sa communication.',
  '[]'::jsonb, now()::text, false, '', '',
  '7 route des Troques, 69630 Chaponost'
where not exists (
  select 1 from public.events
  where lower(title)=lower('AmbondronA — 25 taona isika à Lyon')
    and date='2026-11-14'
);

update public.events
set city='Créteil',
    location='Five de Créteil, Créteil (94)',
    official_source_url='https://www.instagram.com/gas_paname_sport/',
    updates_url='https://www.instagram.com/gas_paname_sport/'
where id=9008;

update public.events
set city='Juvisy-sur-Orge',
    location='Gymnase à Juvisy-sur-Orge — adresse précise à confirmer',
    description='Rendez-vous sportif annoncé par Gas’Paname Sport le dimanche 1er novembre 2026 dans un gymnase à Juvisy-sur-Orge. Toutes les disciplines Gas’Paname sont annoncées sur les terrains. L’adresse précise, les horaires et les modalités d’inscription restent à confirmer auprès de l’organisateur.',
    official_source_url='https://www.instagram.com/gas_paname_sport/',
    updates_url='https://www.instagram.com/gas_paname_sport/'
where id=9009;

insert into private.event_evidence
  (event_id, source_kind, source_label, source_reference, source_sha256, received_at, notes)
select id, 'capture_reseau_social', 'Communication officielle Gas’Paname Sport',
       'Capture transmise par Toky le 21 septembre 2026',
       '0fec08bc3aea9278dd6a5e1ba4d20bcc7d48956572e3331e4ab8aed0e9b7e813',
       '2026-09-21 16:00:00+02',
       'Texte visible : 03 octobre Five de Créteil ; 01 novembre Gymnase Juvisy. La capture ne fournit ni adresse précise ni horaires.'
from public.events where id in (9008,9009)
on conflict (event_id, source_sha256) do nothing;

insert into private.event_evidence
  (event_id, source_kind, source_label, source_reference, source_sha256, received_at, notes)
select id, 'affiche_recue', 'Affiche AmbondronA Europe Tour — Lyon',
       'Capture transmise par Toky le 21 septembre 2026',
       'cf653d3d43394687050b4ae661182e0aa80581a860fac4a28a62126b55ed0e3b',
       '2026-09-21 18:31:00+02',
       'Affiche : samedi 14 novembre 2026, ouverture 19 h, Le Gold Réception, 7 route des Troques, 69630 Chaponost ; concert, soirée DJ, vente tsaky ; billetterie annoncée sur Billetweb sans URL directe.'
from public.events
where title='AmbondronA — 25 taona isika à Lyon' and date='2026-11-14'
on conflict (event_id, source_sha256) do nothing;

insert into private.event_evidence
  (event_id, source_kind, source_label, source_reference, source_sha256, received_at, notes)
select id, 'affiche_recue', 'Affiche Karibo — EMMA Hauts-de-France',
       'Capture transmise par Toky le 21 septembre 2026 ; inscription HelloAsso confirmée',
       '441cb24effe65fad7f29279fce5678a7b397cd5f7539f738a89724306f0cee63',
       '2026-09-21 22:51:00+02',
       'Affiche : dimanche 27 septembre 2026, Les Petites Cantines Croix, restauration 11 h 30–18 h, Atelier Tremplin 16 h–18 h, tarifs membres/enfants 8 €, moins de 26 ans 10 €, adultes 12 €.'
from public.events
where title='Karibo — Le goût de Madagascar chez les Ch''tis' and date='2026-09-27'
on conflict (event_id, source_sha256) do nothing;

commit;

select id, title, date, city, location, organizer, "ticketUrl", updates_url
from public.events
where id in (9008,9009)
   or (title='Karibo — Le goût de Madagascar chez les Ch''tis' and date='2026-09-27')
   or (title='AmbondronA — 25 taona isika à Lyon' and date='2026-11-14')
order by date, id;

select event_id, source_kind, source_label, received_at
from private.event_evidence
where source_sha256 in (
  '0fec08bc3aea9278dd6a5e1ba4d20bcc7d48956572e3331e4ab8aed0e9b7e813',
  'cf653d3d43394687050b4ae661182e0aa80581a860fac4a28a62126b55ed0e3b',
  '441cb24effe65fad7f29279fce5678a7b397cd5f7539f738a89724306f0cee63'
)
order by event_id;
