-- MIDNIGHT BUS — ANDROX — 31 juillet 2026
-- Peut être exécuté une seule fois dans l’éditeur SQL Supabase.

insert into public.events
  (title, date, location, city, category, image, price, organizer, "ticketUrl", description, "mediaUrls", "createdAt")
select
  'MIDNIGHT BUS in Paris — Jonas Androx & DJ P.XIIE',
  '2026-07-31',
  'Hôtel de Ville, 75004 Paris',
  'Paris',
  'Soirée',
  'https://www.billetweb.fr/files/page/thumb/midnight-bus.png?v=1784701659',
  '20 € — Early Bird',
  'ANDROX',
  'https://www.billetweb.fr/midnight-bus',
  'Le MIDNIGHT BUS parcourt Paris de nuit pour une expérience mêlant musique, ambiance club et vue sur les monuments illuminés. Rendez-vous vendredi 31 juillet à 23h30 à l’Hôtel de Ville (départ du bus à 23h30 au plus tard), jusqu’à 5h. Au programme : Afro, Shatta, RnB, Gasy et Kompa, bar à bord et line-up Jonas Androx & DJ P.XIIE. Places très limitées, réservation obligatoire.',
  '[]'::jsonb,
  now()
where not exists (
  select 1
  from public.events
  where lower(trim(title)) = lower('MIDNIGHT BUS in Paris — Jonas Androx & DJ P.XIIE')
    and date = '2026-07-31'
);
