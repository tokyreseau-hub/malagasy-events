-- ════════════════════════════════════════════════════════════════
-- BOUTIQUES & ARTISANAT malagasy — Malagasy Events
-- Ajoute des lieux trouvés par recherche web (à vérifier / compléter).
-- À exécuter APRÈS supabase_lieux_setup.sql. Sans risque, idempotent.
-- ════════════════════════════════════════════════════════════════

insert into public.lieux (id,category,name,denom,city,address,note,site,fb) values
 -- 🛍️ BOUTIQUES / ÉPICERIES
 (101,'boutique','Épicerie de Madagascar','Épicerie','Paris 13e','3 rue Philibert Lucot, 75013 Paris','Épicerie malgache et produits bien-être de Madagascar. Ouvert du lundi au samedi 10h-20h.','https://epiceriedemadagascar.com','https://www.facebook.com/epiciedemadagascar'),
 (102,'boutique','Le Soleil de Madagascar','Épicerie & cosmétique','Bussy-Saint-Georges','','Huiles végétales et essentielles, cosmétiques bio, miels rares, épices, bijoux en pierres de Madagascar.','https://www.lesoleildemadagascar.com',''),
 (103,'boutique','Jedia-Soa','Boutique en ligne','En ligne · France','','Produits typiques malgaches (épicerie & artisanat) avec livraison en France.','https://www.jedia-soa.com',''),
 (104,'boutique','Miamland','Grossiste','En ligne · France','','Grossiste de produits alimentaires de Madagascar, pour particuliers et professionnels.','https://www.miamland.com',''),
 -- 🧵 ARTISANAT
 (201,'artisanat','Comptoir Malgache','Artisanat & déco','Thann (68)','','Boutique d''artisanat malgache depuis 2008 : paniers et chapeaux en raphia, bijoux en pierres, textiles brodés main.','https://www.comptoir-malgache.fr',''),
 (202,'artisanat','Raphia & Cie','Raphia','Tours (37)','','Confections en raphia naturel faites main à Madagascar, conçues à Tours. Disponible en Touraine et en France.','https://www.raphiaetcompagnie.com',''),
 (203,'artisanat','Tany Mafana','Artisanat','En ligne · France','','Produits faits main par des artisans malgaches, matériaux naturels (raphia…).','https://tanymafana.com',''),
 (204,'artisanat','Couleurs Raphia','Raphia & vannerie','En ligne · France','','Artisanat malgache en raphia issu d''ateliers et artisans de Madagascar.','https://www.couleurs-raphia.fr',''),
 (205,'artisanat','Tongasoa Artisanal','Vannerie (grossiste)','En ligne · France','','Fabricant et grossiste de vannerie de Madagascar : paniers, sacs et chapeaux en raphia et fibres naturelles.','https://tongasoa-artisanal.com','')
on conflict (id) do nothing;

select setval(pg_get_serial_sequence('public.lieux','id'), greatest((select coalesce(max(id),1) from public.lieux),1));
