-- MALAGASY EVENTS — LOT UNIQUE APRÈS AUDIT DU 26 AOÛT 2026
-- EN ATTENTE : NE PAS EXÉCUTER AVANT VALIDATION DE L'APERÇU ET DU RAPPORT.
-- Requête idempotente et transactionnelle : événements, Entraide, annuaire,
-- fiches organisateurs automatiques et compteurs de trafic cumulés.

begin;

-- 1. Fiches organisateurs automatiques à partir du deuxième événement.
alter table public.events
  add column if not exists orga_id bigint
  references public.organisateurs(id) on delete set null;

create index if not exists events_orga_id_idx on public.events(orga_id);

alter table public.event_submissions
  add column if not exists organizer_site text default '',
  add column if not exists organizer_facebook text default '',
  add column if not exists organizer_instagram text default '',
  add column if not exists organizer_contact text default '';

comment on column public.event_submissions.organizer_contact is
  'E-mail ou téléphone explicitement fourni pour affichage public sur la fiche organisateur.';

-- 2. Annuaire strictement malagasy et sites officiels cliquables.
-- Les anciennes fiches incertaines restent en base pour être récupérables,
-- mais ne sont plus marquées comme publiables.
alter table public.gastro
  add column if not exists site text default '',
  add column if not exists malagasy_verified boolean not null default false;

update public.gastro
set site = case name
  when 'O''Bol d''Or' then 'https://oboldor.com/'
  when 'Pili Pili Malgache Food' then 'https://www.pilipilimalgachefood.com/'
  when 'Nini + Vous' then 'https://www.ninietvous.fr/'
  else site
end,
contact = case when contact ~* '^(https?://|www\.)' then '' else contact end
where name in ('Ikala Kara','O''Bol d''Or','Pili Pili Malgache Food','Nini + Vous');

-- Une instruction explicite par fiche : évite l'erreur de collage du bloc VALUES
-- signalée par l'éditeur SQL, tout en conservant l'idempotence du lot.
insert into public.gastro (name,type,region,note,fb,insta,tiktok,site,contact,city,address,phone,lat,lng)
select 'Chicken Coco','Food truck','Pays de la Loire','Concept porté par une fondatrice d''origine malgache et cuisine inspirée de Madagascar.','','','','https://www.chickencoco.fr/','','Saint-Jean-de-Monts / Challans','','',null,null
where not exists (select 1 from public.gastro g where lower(trim(g.name))=lower('Chicken Coco'));

insert into public.gastro (name,type,region,note,fb,insta,tiktok,site,contact,city,address,phone,lat,lng)
select 'Ti Bou Events','Traiteur','Nouvelle-Aquitaine','Traiteur cofondé par une cheffe d''origine malgache, avec une touche culinaire malagasy explicite.','','','','https://www.tibouevents.com/','','Moliets-et-Maa (40)','14 rue du Général de Gaulle, 40660 Moliets-et-Maa','05 58 43 12 25',null,null
where not exists (select 1 from public.gastro g where lower(trim(g.name))=lower('Ti Bou Events'));

insert into public.gastro (name,type,region,note,fb,insta,tiktok,site,contact,city,address,phone,lat,lng)
select 'L''Espace Gourmand Chez Didine','Restaurant','Bourgogne-Franche-Comté','Restaurant proposant explicitement une cuisine réunionnaise et malgache.','https://www.facebook.com/Chez-Didine-825381957475294/','','','','','Corbigny (58)','6 rue des Forges, 58800 Corbigny','09 80 59 03 02',null,null
where not exists (select 1 from public.gastro g where lower(trim(g.name))=lower('L''Espace Gourmand Chez Didine'));

insert into public.gastro (name,type,region,note,fb,insta,tiktok,site,contact,city,address,phone,lat,lng)
select 'Auberge du Mesnil','Restaurant','Grand Est','Auberge tenue par Jeannette, originaire de Madagascar, et proposant des spécialités malgaches.','','','','https://aubergedumesnil.com/','','Xouaxange (57)','1 rue de l''École, 57830 Xouaxange','03 87 25 03 44',null,null
where not exists (select 1 from public.gastro g where lower(trim(g.name))=lower('Auberge du Mesnil'));

insert into public.gastro (name,type,region,note,fb,insta,tiktok,site,contact,city,address,phone,lat,lng)
select 'Sakafo — Maison événementielle malgache','Traiteur','Île-de-France','Maison événementielle consacrée à la gastronomie malgache authentique.','','','','https://sakafo.fr/','','Paris et Île-de-France','','',null,null
where not exists (select 1 from public.gastro g where lower(trim(g.name))=lower('Sakafo — Maison événementielle malgache'));

update public.gastro set malagasy_verified=false;

update public.gastro
set malagasy_verified=true
where lower(trim(name)) in (
  lower('Ikala Kara'),
  lower('O''Bol d''Or'),
  lower('La Gourmandise Malgache'),
  lower('Pili Pili Malgache Food'),
  lower('Traiteur Franco-Malagasy Paris'),
  lower('Chez Tiana'),
  lower('Nini + Vous'),
  lower('Au Soleil de Madagascar'),
  lower('Le Rendez-vous Franco-Malgache'),
  lower('Chicken Coco'),
  lower('Ti Bou Events'),
  lower('L''Espace Gourmand Chez Didine'),
  lower('Auberge du Mesnil'),
  lower('Sakafo — Maison événementielle malgache')
);

-- Remplace uniquement la fiche locale générique de Nice si elle avait été copiée en base.
delete from public.gastro
where name='Restaurant Malgache'
  and city ilike '%Nice%'
  and coalesce(fb,'')='https://www.facebook.com/profile.php?id=100068530603400';

-- 3. Profils d'artistes : seulement les liens officiels suffisamment vérifiés.
update public.organisateurs set site='https://linktr.ee/rimkagasy', insta='https://www.instagram.com/rim_kagram_501/' where name='Rimka';
update public.organisateurs set insta='https://www.instagram.com/zakaioff/' where name='Zakai';
update public.organisateurs set site='https://linktr.ee/Mbints.Jmsh' where name='DJ Mbints';
update public.organisateurs set site='https://www.youtube.com/@BastaLion' where name='Basta Lion';
update public.organisateurs set site='https://deniseofficiel.com/', insta='https://www.instagram.com/denise_officiel/' where name='Shyn & Denise';
update public.organisateurs set site='', note='Émission web d''actualités de la diaspora malagasy en France. Ancien domaine indisponible au contrôle du 26 août 2026.' where name='Malagasy en France 2.0';

-- 4. Synchronisation des événements encore locaux pour leur donner un id numérique.
insert into public.events (title,date,location,city,category,image,price,organizer,"ticketUrl",description,"mediaUrls","createdAt")
select 'MIDNIGHT Open Air — Only Tithy & Nawer','2026-08-23','Aubergarden, 210 avenue des Magasins Généraux, 93300 Aubervilliers','Aubervilliers','Soirée','','Billetterie à confirmer','Midnight 261','','MIDNIGHT revient pour clôturer l''été avec une édition Open Air à l''Aubergarden, dimanche 23 août 2026 de 18 h à minuit. Au programme : Afro, Amapiano, Shatta, Dancehall, Kompa, Zouk, Salegy, Gasy et plus encore, avec Only Tithy, Nawer et leurs invités.','[]'::jsonb,'2026-08-13T00:00:00.000Z'
where not exists (select 1 from public.events e where lower(trim(e.title))=lower('MIDNIGHT Open Air — Only Tithy & Nawer') and e.date='2026-08-23');

insert into public.events (title,date,location,city,category,image,price,organizer,"ticketUrl",description,"mediaUrls","createdAt")
select 'Tournoi annuel de pétanque — Firaisankina no Hery','2026-08-15','38 chaussée Jules César, 95520 Osny','Osny','Sport','','20 € par joueur','Firaisankina no Hery','','Tournoi annuel de pétanque en doublette. Inscription obligatoire à l''avance. Repas inclus avec vary sy loaka et lasary offert.','[]'::jsonb,'2026-08-03T00:00:00.000Z'
where not exists (select 1 from public.events e where lower(trim(e.title))=lower('Tournoi annuel de pétanque — Firaisankina no Hery') and e.date='2026-08-15');

insert into public.events (title,date,location,city,category,image,price,organizer,"ticketUrl",description,"mediaUrls","createdAt")
select 'Alin’ny Feo Gasy — Jenny Fuhr, Feo Gasy, Levelo, Noely & Tarika Baobab','2026-09-26','Le Millénaire, Île-de-France','Paris','Culture','','','Alin’ny Feo Gasy','','Grande soirée consacrée aux voix et à la musique malagasy. Horaires, tarifs et réservation à confirmer auprès de l''organisateur.','[]'::jsonb,'2026-07-28T00:00:00.000Z'
where not exists (select 1 from public.events e where lower(trim(e.title))=lower('Alin’ny Feo Gasy — Jenny Fuhr, Feo Gasy, Levelo, Noely & Tarika Baobab') and e.date='2026-09-26');

insert into public.events (title,date,location,city,category,image,price,organizer,"ticketUrl",description,"mediaUrls","createdAt")
select 'Festival International des Films de la Diaspora Africaine — FIFDA 2026','2026-09-04','CGR Paris Lilas & Cinéma Saint-André des Arts, Paris','Paris','Culture','','Pass 45 € / Pass Duo 65 €','FIFDA','https://www.eventbrite.fr/e/fifda-2026-tickets-1994356328465','Le FIFDA revient à Paris du 4 au 6 septembre 2026 avec projections, débats et rencontres autour des cinémas d''Afrique et de ses diasporas.','[]'::jsonb,'2026-07-28T00:00:00.000Z'
where not exists (select 1 from public.events e where lower(trim(e.title))=lower('Festival International des Films de la Diaspora Africaine — FIFDA 2026') and e.date='2026-09-04');

insert into public.events (title,date,location,city,category,image,price,organizer,"ticketUrl",description,"mediaUrls","createdAt")
select 'Mahaleo — concert exceptionnel','2026-10-17','Le Millénaire, Place du 19 Mars 1962, Savigny-le-Temple','Savigny-le-Temple','Culture','','35,64 € prévente / 65,94 € VIP','DMF','https://www.billetweb.fr/mahaleo1','Le groupe Mahaleo se produit en concert exceptionnel au Millénaire le 17 octobre 2026.','[]'::jsonb,'2026-07-28T00:00:00.000Z'
where not exists (select 1 from public.events e where lower(trim(e.title))=lower('Mahaleo — concert exceptionnel') and e.date='2026-10-17');

insert into public.events (title,date,location,city,category,image,price,organizer,"ticketUrl",description,"mediaUrls","createdAt")
select 'MIDNIGHT BUS in Paris — Jonas Androx & DJ P.XIIE','2026-07-31','Hôtel de Ville, 75004 Paris','Paris','Soirée','','20 € — Early Bird','ANDROX','https://www.billetweb.fr/midnight-bus','Expérience nocturne en bus dans Paris avec Jonas Androx et DJ P.XIIE.','[]'::jsonb,'2026-07-26T00:00:00.000Z'
where not exists (select 1 from public.events e where lower(trim(e.title))=lower('MIDNIGHT BUS in Paris — Jonas Androx & DJ P.XIIE') and e.date='2026-07-31');

insert into public.events (title,date,location,city,category,image,price,organizer,"ticketUrl",description,"mediaUrls","createdAt")
select 'Coupe du Monde Gas’Paname IV & Gas’Padel III','2026-10-03','Five de Créteil, Créteil (94)','Paris','Sport','','','Gas''Paname Sport','','Coupe du Monde Gas’Paname et Gas’Padel au Five de Créteil. Horaires, inscriptions et tarifs à confirmer.','[]'::jsonb,'2026-07-29T00:00:00.000Z'
where not exists (select 1 from public.events e where lower(trim(e.title))=lower('Coupe du Monde Gas’Paname IV & Gas’Padel III') and e.date='2026-10-03');

insert into public.events (title,date,location,city,category,image,price,organizer,"ticketUrl",description,"mediaUrls","createdAt")
select 'NBA Gas’Paname I & Coupe du Monde Gas’Paname IV','2026-11-01','Gymnase 94, Choisy-le-Roi (94)','Paris','Sport','','','Gas''Paname Sport','','Double rendez-vous sportif annoncé à Choisy-le-Roi. Horaires, inscriptions et tarifs à confirmer.','[]'::jsonb,'2026-07-29T00:00:00.000Z'
where not exists (select 1 from public.events e where lower(trim(e.title))=lower('NBA Gas’Paname I & Coupe du Monde Gas’Paname IV') and e.date='2026-11-01');

insert into public.events (title,date,location,city,category,image,price,organizer,"ticketUrl",description,"mediaUrls","createdAt")
select 'Foot inter-lycées de Tana Alumni France V & soirée des retrouvailles','2026-12-19','Lieu à confirmer','Paris','Sport','','','Gas''Paname Sport','','Tournoi inter-lycées suivi de la soirée des retrouvailles. Lieu et modalités à confirmer.','[]'::jsonb,'2026-07-29T00:00:00.000Z'
where not exists (select 1 from public.events e where lower(trim(e.title))=lower('Foot inter-lycées de Tana Alumni France V & soirée des retrouvailles') and e.date='2026-12-19');

insert into public.events (title,date,location,city,category,image,price,organizer,"ticketUrl",description,"mediaUrls","createdAt")
select 'BEB’S — rassemblement culturel du vendredi','2026-08-28','Pétanque de Lisses — Piscine du Long Rayage, chemin du Parisis, Lisses','Lisses','Culture','','','BEB’S','','Rassemblement culturel et convivial organisé le vendredi à partir de 19 h, à la Pétanque de Lisses.','[]'::jsonb,'2026-07-29T00:00:00.000Z'
where not exists (select 1 from public.events e where lower(trim(e.title))=lower('BEB’S — rassemblement culturel du vendredi') and e.date='2026-08-28');

-- Relie les correspondances exactes, puis les trois alias explicitement connus.
update public.events e set orga_id=o.id
from public.organisateurs o
where e.orga_id is null and lower(trim(e.organizer))=lower(trim(o.name));

update public.events e set orga_id=o.id
from public.organisateurs o
where e.orga_id is null and (
  (e.organizer='DMF' and o.name='DJ Malagasy de France (DMF)') or
  (e.organizer='BEB’S' and o.name='BEB’S — Sakafo') or
  (e.organizer='RNS - CEN' and o.name='RNS — Rencontre Nationale Sportive')
);

-- 5. Compteurs cumulés : ils survivent au nettoyage des détails après 13 mois.
create table if not exists public.analytics_lifetime_counters (
  singleton boolean primary key default true check (singleton),
  page_views_total bigint not null default 0 check (page_views_total>=0),
  visits_total bigint not null default 0 check (visits_total>=0),
  visitors_total bigint not null default 0 check (visitors_total>=0),
  updated_at timestamptz not null default now()
);

create table if not exists public.analytics_known_sessions (
  session_id uuid primary key,
  first_seen_at timestamptz not null default now()
);

create table if not exists public.analytics_known_visitors (
  visitor_id uuid primary key,
  first_seen_at timestamptz not null default now()
);

alter table public.analytics_lifetime_counters enable row level security;
alter table public.analytics_known_sessions enable row level security;
alter table public.analytics_known_visitors enable row level security;
revoke all on public.analytics_lifetime_counters from public,anon,authenticated;
revoke all on public.analytics_known_sessions from public,anon,authenticated;
revoke all on public.analytics_known_visitors from public,anon,authenticated;

-- Évite qu'une visite soit insérée entre le relevé initial et la pose du déclencheur.
lock table public.analytics_events in share row exclusive mode;

insert into public.analytics_known_sessions(session_id,first_seen_at)
select session_id,min(created_at) from public.analytics_events
where event_name='page_view' and session_id is not null group by session_id
on conflict (session_id) do nothing;

insert into public.analytics_known_visitors(visitor_id,first_seen_at)
select visitor_id,min(created_at) from public.analytics_events
where event_name='page_view' and visitor_id is not null group by visitor_id
on conflict (visitor_id) do nothing;

insert into public.analytics_lifetime_counters(singleton,page_views_total,visits_total,visitors_total)
select true,
  count(*) filter (where event_name='page_view'),
  count(distinct session_id) filter (where event_name='page_view'),
  count(distinct visitor_id) filter (where event_name='page_view')
from public.analytics_events
on conflict (singleton) do update set
  page_views_total=greatest(public.analytics_lifetime_counters.page_views_total,excluded.page_views_total),
  visits_total=greatest(public.analytics_lifetime_counters.visits_total,excluded.visits_total),
  visitors_total=greatest(public.analytics_lifetime_counters.visitors_total,excluded.visitors_total),
  updated_at=now();

create or replace function public.increment_analytics_lifetime()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare new_session int:=0; new_visitor int:=0;
begin
  if new.event_name<>'page_view' then return new; end if;
  if new.session_id is not null then
    insert into public.analytics_known_sessions(session_id,first_seen_at)
    values(new.session_id,new.created_at) on conflict do nothing;
    get diagnostics new_session=row_count;
  end if;
  if new.visitor_id is not null then
    insert into public.analytics_known_visitors(visitor_id,first_seen_at)
    values(new.visitor_id,new.created_at) on conflict do nothing;
    get diagnostics new_visitor=row_count;
  end if;
  insert into public.analytics_lifetime_counters(singleton,page_views_total,visits_total,visitors_total,updated_at)
  values(true,1,new_session,new_visitor,now())
  on conflict (singleton) do update set
    page_views_total=public.analytics_lifetime_counters.page_views_total+1,
    visits_total=public.analytics_lifetime_counters.visits_total+excluded.visits_total,
    visitors_total=public.analytics_lifetime_counters.visitors_total+excluded.visitors_total,
    updated_at=now();
  return new;
end $$;

revoke all on function public.increment_analytics_lifetime() from public,anon,authenticated;
drop trigger if exists analytics_lifetime_after_insert on public.analytics_events;
create trigger analytics_lifetime_after_insert
after insert on public.analytics_events
for each row execute function public.increment_analytics_lifetime();

create or replace function public.analytics_lifetime_totals()
returns table(page_views_total bigint,visits_total bigint,visitors_total bigint,updated_at timestamptz)
language plpgsql
stable
security definer
set search_path=pg_catalog,public
as $$
begin
  if not public.is_admin() then raise exception 'Accès réservé à l''administration'; end if;
  return query select c.page_views_total,c.visits_total,c.visitors_total,c.updated_at
  from public.analytics_lifetime_counters c where c.singleton=true;
end $$;

revoke all on function public.analytics_lifetime_totals() from public,anon;
grant execute on function public.analytics_lifetime_totals() to authenticated;

commit;

-- Vérifications manuelles à faire juste après exécution :
-- select * from public.analytics_lifetime_totals();
-- select id,title,date from public.events where title like '%Gas’Paname%' or title like 'BEB’S%';
-- select name,malagasy_verified,site from public.gastro where malagasy_verified=true order by name;
