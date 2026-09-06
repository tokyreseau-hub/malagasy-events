-- ARTISTES & DJ — Malagasy Events
-- Ajoute les fiches à la catégorie « DJ & artistes » sans écraser
-- une fiche qui existerait déjà.

with nouvelles_fiches(name) as (
  values
    ('Gaei'),
    ('Zakai'),
    ('Rimka'),
    ('RJ'),
    ('DJ Mbints'),
    ('Basta Lion'),
    ('Mad Max'),
    ('Mr Sayda'),
    ('Shyn & Denise'),
    ('DJ Skull'),
    ('Big MJ'),
    ('Njakatiana'),
    ('Samoela'),
    ('Njara Marcel'),
    ('Mahaleo'),
    ('Rija Ramanantoanina'),
    ('Nathan Gabri'),
    ('Oashna')
)
insert into public.organisateurs (name, type, city, region, followers, note, fb, insta, site, contact)
select
  n.name,
  'DJ & artistes',
  '', '', '',
  'Artiste / DJ malagasy — fiche à compléter.',
  '', '', '', ''
from nouvelles_fiches n
where not exists (
  select 1
  from public.organisateurs o
  where lower(o.name) = lower(n.name)
);

