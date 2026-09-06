-- LIEUX PRÉCIS DES ÉVÉNEMENTS — Malagasy Events
-- Conserve l'adresse sélectionnée et ses coordonnées afin que la carte
-- pointe exactement sur la salle ou le lieu retenu.

alter table public.events
  add column if not exists address text,
  add column if not exists lat double precision,
  add column if not exists lng double precision;

alter table public.event_submissions
  add column if not exists address text,
  add column if not exists lat double precision,
  add column if not exists lng double precision;

create index if not exists events_coordinates_idx
  on public.events (lat, lng)
  where lat is not null and lng is not null;

