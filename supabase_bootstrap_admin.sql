-- ════════════════════════════════════════════════════════════════
-- CRÉATION DU COMPTE ADMIN — Malagasy Events  (à lancer UNE seule fois)
-- Prérequis : tu t'es déjà inscrit sur le site avec ton email.
--
-- 👉 Remplace  ton-email@exemple.com  par TON email d'inscription,
--    puis clique Run.
-- ════════════════════════════════════════════════════════════════

-- On contourne temporairement le garde-fou anti-usurpation, le temps de
-- désigner le tout premier admin (impossible autrement, c'est voulu).
alter table public.profiles disable trigger trg_protect_profile;

update public.profiles
  set username = 'Malagasy_events_admin'
  where id = (select id from auth.users where email = 'ton-email@exemple.com');

alter table public.profiles enable trigger trg_protect_profile;

-- Vérification : doit afficher UNE ligne avec ton compte.
select p.id, p.username, u.email
from public.profiles p
join auth.users u on u.id = p.id
where p.username = 'Malagasy_events_admin';
