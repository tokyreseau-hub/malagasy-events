-- ════════════════════════════════════════════════════════════════
-- MISE À JOUR ADRESSES & CATÉGORIES GASTRONOMIE — juillet 2026
-- Adresses vérifiées sur le web + villes du tableau de veille.
-- À exécuter dans Supabase → SQL Editor → Run. Sans risque, idempotent.
-- ════════════════════════════════════════════════════════════════

-- Ikala Kara — adresse vérifiée (ikala-kara.fr / office de tourisme Marseille)
update public.gastro set
  city='Marseille (13)', address='40 rue Saint-Savournin, 13001 Marseille',
  phone='09 80 67 41 54', contact='www.ikala-kara.fr',
  note='Restaurant malgache & karaoké (ven-sam), quartier La Plaine',
  lat=43.2989, lng=5.3872
where name='Ikala Kara';

-- O'Bol d'Or — adresse vérifiée (oboldor.com)
update public.gastro set
  region='Île-de-France', city='Vitry-sur-Seine (94)',
  address='72 avenue Anatole France, 94400 Vitry-sur-Seine',
  contact='www.oboldor.com',
  note='Restaurant — spécialités asiatiques & malgaches (soirées Ari Nao)',
  lat=48.7899, lng=2.3938
where name='O''Bol d''Or';

-- La Gourmandise Malgache — ville du tableau (Lillers, 62)
update public.gastro set
  region='Hauts-de-France', city='Lillers (62)',
  note='Plats et apéritifs malgaches faits maison',
  lat=50.5636, lng=2.4819
where name='La Gourmandise Malgache';

-- Pili Pili Malgache Food — adresse vérifiée (pilipilimalgachefood.com / PagesJaunes)
update public.gastro set
  region='Grand Est', city='Réguisheim (68)', address='Grand Rue, 68890 Réguisheim',
  contact='www.pilipilimalgachefood.com',
  lat=47.9929, lng=7.3721
where name='Pili Pili Malgache Food';

-- Chez Tiana — ville du tableau (Paris 14e)
update public.gastro set
  region='Île-de-France', city='Paris 14e', lat=48.8331, lng=2.3264
where name='Chez Tiana';

-- Naffees Traiteur — ville du tableau (Argenteuil)
update public.gastro set
  region='Île-de-France', city='Argenteuil (95)', lat=48.9472, lng=2.2467
where name='Naffees Traiteur';

-- Nini + Vous — vérifié : chef à Bordeaux (ninietvous.fr), ex-resto à Toulouse
update public.gastro set
  contact='www.ninietvous.fr',
  note='Chef à domicile & traiteur franco-malgache — 10 ans de restaurant malgache à Toulouse, formée à Ferrandi'
where name='Nini + Vous';

-- Au Soleil de Madagascar — ville du tableau (Cachan)
update public.gastro set
  region='Île-de-France', city='Cachan (94)',
  note='Food truck & traiteur, spécialités malgaches',
  lat=48.7919, lng=2.3319
where name='Au Soleil de Madagascar';

-- Cuisine Malgache et d'ailleurs — recatégorisé (groupe, pas un traiteur)
update public.gastro set
  type='Communauté',
  note='4 600 membres — groupe de partage de recettes malgaches et du monde'
where name='Cuisine Malgache et d''ailleurs';
