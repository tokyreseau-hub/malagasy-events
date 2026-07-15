-- ════════════════════════════════════════════════════════════════
-- BOUTIQUES & ARTISANAT — extension n°2 (recherche web du 14/07/2026)
-- 5 nouvelles adresses vérifiées. Sans risque, idempotent.
-- ════════════════════════════════════════════════════════════════

insert into public.lieux (id,category,name,denom,city,address,note,site,fb) values
 -- 🛍️ BOUTIQUES / ÉPICERIES
 (105,'boutique','Equinoxe Madagascar','Épicerie fine & épices','Lyon 5e','5 rue Jean Carriès, 69005 Lyon','Épices de Madagascar en direct des producteurs, artisanat et coffrets cadeaux. Boutique physique à Lyon.','https://www.equinoxemadagascar.fr',''),
 (106,'boutique','J''M Vanille','Vanille & épices','Sireuil (16)','23 route des Hauts de la Côte, 16440 Sireuil','Vanille de la région SAVA, épices, poivres, paniers et objets en corne de zébu. Boutique en Charente + réseau de points de vente.','https://www.jmvanille.com','https://www.facebook.com/jmvanilles'),
 (107,'boutique','Alsace Vanille','Vanille & épices','Alsace · en ligne','','Couple franco-malgache en contact direct avec les producteurs de vanille de la région SAVA. Vente en ligne.','https://alsacevanille.fr',''),
 (108,'boutique','Mada Vanille','Vanille & épices','Maromme (76)','','Vanille et épices de Madagascar — présent sur les salons gastronomiques, foires et marchés à thème.','https://www.madavanille.fr',''),
 -- 🧵 ARTISANAT
 (206,'artisanat','Artisanat de Madagascar','Artisanat d''art','Lyon 6e','60 rue Masséna, 69006 Lyon','Pièces uniques faites main par des artisans malgaches : sculptures en bois, bijoux en pierres, vannerie, sacs en cuir, textiles brodés, nacre et coco.','','https://www.facebook.com/p/Artisanat-de-Madagascar-100063555843178/')
on conflict (id) do nothing;

select setval(pg_get_serial_sequence('public.lieux','id'), greatest((select coalesce(max(id),1) from public.lieux),1));
