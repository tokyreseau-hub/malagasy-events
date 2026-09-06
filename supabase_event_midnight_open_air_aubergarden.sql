-- MIDNIGHT OPEN AIR — AUBERGARDEN — 23 août 2026
-- Requête idempotente : elle n'ajoute pas de doublon si l'événement existe déjà.

insert into public.events
  (title, date, location, city, category, image, price, organizer, "ticketUrl", description, "mediaUrls", "createdAt")
select
  'MIDNIGHT Open Air — Only Tithy & Nawer',
  '2026-08-23',
  'Aubergarden, 210 avenue des Magasins Généraux, 93300 Aubervilliers',
  'Aubervilliers',
  'Soirée',
  '/posters/midnight-open-air-aubergarden.svg',
  'Billetterie à confirmer',
  'Midnight 261',
  '',
  'MIDNIGHT revient pour clôturer l’été avec une édition Open Air à l’Aubergarden, dimanche 23 août 2026 de 18 h à minuit. Au programme : Afro, Amapiano, Shatta, Dancehall, Kompa, Zouk, Salegy, Gasy et plus encore, avec Only Tithy, Nawer et leurs invités. Le lien officiel de billetterie sera activé dès qu’il aura été vérifié.',
  '[]'::jsonb,
  now()
where not exists (
  select 1
  from public.events
  where lower(trim(title)) = lower('MIDNIGHT Open Air — Only Tithy & Nawer')
    and date = '2026-08-23'
);
