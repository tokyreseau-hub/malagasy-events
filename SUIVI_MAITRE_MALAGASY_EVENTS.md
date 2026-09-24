# Suivi maître — Malagasy Events

Ce document est le point de suivi unique du projet. Les décisions, lots Supabase, vérifications et états de publication doivent être ajoutés ici plutôt que répartis dans de nouveaux journaux. Les fichiers exécutables indispensables restent séparés, mais sont référencés depuis ce document.

## Publication du 22 septembre 2026 — événements reçus et preuve privée

- Validation Toky : les liens de source ne sont plus obligatoires dans la fiche publique. La provenance reçue est conservée en back-office pour pouvoir corriger, retirer ou justifier une publication.
- Lot exécutable : `supabase_event_publication_2026_09_22.sql` — Karibo à Croix, AmbondronA près de Lyon, correction des lieux Gas’Paname des 3 octobre et 1er novembre.
- Les justificatifs sont enregistrés dans `private.event_evidence`, schéma non exposé au site, avec libellé, date de réception, note interne et empreinte SHA-256 de la capture reçue.
- La page publique conserve uniquement le lien permettant de suivre les actualités lorsqu’il est disponible ; le lien utilisé comme preuve interne n’est plus rendu dans la fiche événement.

## État au 1er septembre 2026

### Mise à jour en préparation — messagerie et sources officielles

- État : publiée et vérifiée le 1er septembre 2026.
- Lot Supabase unique : `supabase_messaging_edit_delete_2026_08.sql`.
- Modification des messages : autorisée pendant 30 minutes, contrôlée par l’interface et par la base.
- Suppression : uniquement sur action volontaire, message par message ; le message devient « Message supprimé » pour les participants et aucune suppression physique n’est accordée au membre. Le bouton de suppression en masse d’une conversation est retiré.
- Archive : versions originales stockées dans le schéma privé, visibles uniquement par le super-administrateur via le centre de contrôle ; chaque consultation est tracée.
- Conservation : les messages normaux et l’archive privée n’ont aucune date d’expiration automatique. L’ancienne fonction et l’ancienne tâche de purge sont retirées par le lot.
- Incident corrigé : l’interface demandait la colonne `deleted_at` avant son installation dans la base ; Supabase rejetait toute la requête et l’erreur restait invisible. Une requête de compatibilité, un état de chargement, un message d’erreur et un bouton « Réessayer » sont ajoutés.
- Événements : champs séparés pour la billetterie, l’annonce officielle et la page d’actualités.
- Compatibilité : les anciens liens Facebook, Instagram et Madatsara placés dans la billetterie sont reclassés comme sources d’information.
- Formulaires concernés : proposition publique, publication directe organisateur, ajout/modification administrateur et modification de la fiche événement.
- Information des utilisateurs : CGU et confidentialité mises à jour dans l’interface locale.

### Procédure avant publication

1. Exécuter le lot Supabase unique et vérifier que les six indicateurs retournés sont vrais, notamment `aucune_purge_automatique` et `aucune_suppression_physique_membre`.
2. Tester avec deux comptes : envoi unique, modification avant et après 30 minutes, suppression, lecture du placeholder par le destinataire.
3. Tester avec le compte super-administrateur : ouverture de « Archives messages » et présence de la trace d’accès.
4. Tester une fiche avec billetterie, une fiche avec publication Facebook et une fiche sans lien.
5. Construire la version de production, vérifier l’aperçu local, puis seulement après validation explicite publier.

### Contrôles et publication du 1er septembre 2026

- Base avant/après migration : 65 messages avant, 65 messages après ; aucun message normal supprimé.
- Archive initiale : 65 versions protégées, sans date d’expiration.
- Purge : zéro fonction de purge active, zéro tâche Cron correspondante et zéro politique de suppression physique pour les membres.
- Test transactionnel annulé : modification avant 30 minutes acceptée, suppression volontaire convertie en suppression logique, modification après 30 minutes refusée ; aucune donnée de test conservée.
- Interface : construction locale réussie ; l’échec réseau de génération SEO locale était limité au bac à sable. La construction Vercel a généré 7 annuaires et 100 fiches.
- Publication : déploiement de production `dpl_2Dmwrjb4mLMyvo9MjPrGu8c1Hwnt`, état `Ready`, relié à `www.malagasy-events.com`.
- Fichier public vérifié : `assets/index-DpJlGuHT.js`, contenant l’erreur visible avec « Réessayer », le placeholder « Message supprimé » et la mention de conservation sans suppression automatique ; le bouton de suppression en masse n’y figure plus.

## Ajout éditorial du 30 août 2026

### RNS CEN — journée portes ouvertes et soirée « C’est parti ! »

- État Supabase : ajouté dans `public.events`, identifiant `9016`, sans doublon détecté au 5 septembre.
- Date : samedi 5 septembre 2026.
- Programme : portes ouvertes de 14 h à 17 h 45, puis soirée de 21 h à 4 h (ouverture 20 h 30) avec Macadence Orchestre et Eley Gasy.
- Lieu : Le Millénaire, 3 place du 19-Mars-1962, 77176 Savigny-le-Temple ; accès RER D, gare de Savigny-le-Temple–Nandy.
- Organisateur : `RNS - CEN`, relié à la fiche organisateur Supabase `1` (« RNS — Rencontre Nationale Sportive »).
- Billetterie officielle vérifiée : `https://www.helloasso.com/associations/cen-comite-executif-national/evenements/soiree-c-est-parti` ; tarif affiché au contrôle : 25 €.
- Actualités officielles : `https://www.instagram.com/rns_cen/`.
- Visuel : aucun visuel tiers recopié dans le site ; la fiche utilise la couverture neutre tant que les droits de republication ne sont pas confirmés.
- Publication : déploiement Vercel de production `dpl_Gxw9RntcmrPR7bPWmoHsW77RXmKT`, état `Ready`, relié à `www.malagasy-events.com`.
- Vérification publique : fiche visible avec la bonne date, le lieu, le tarif et le programme ; bouton « Acheter mes billets » actif vers l’URL HelloAsso exacte ; bouton organisateur actif vers la fiche RNS et son site officiel.
- Correction géographique et éditoriale : la commune est explicitement `Savigny-le-Temple` (et non Paris), l’adresse est fixée au `3 place du 19-Mars-1962` et la carte utilise les coordonnées du Millénaire (`48.5829635, 2.5759079`). La description distingue désormais la journée portes ouvertes de 14 h à 17 h 45 et la soirée avec Macadence Orchestre et Eley Gasy, tout en précisant qu’il s’agit de deux temps successifs du même rendez-vous CEN.
- Publication de la correction : déploiement Vercel de production `dpl_29TE3sW5YQeWn39HAEViYpTx8vCg`, état `Ready`. Contrôle public effectué : titre localisé à Savigny-le-Temple, nouveau programme complet affiché et iframe cartographique ciblée sur `48.5829635, 2.5759079`.

## Mise en ligne du 2 septembre 2026 — Petites annonces

- État : fonctionnalité installée dans Supabase, publiée sur Vercel et contrôlée sur `https://www.malagasy-events.com/petites-annonces`.
- Interface publique : nouvel onglet `📌 Petites annonces`, consultation publique, recherche, filtres par type et catégorie, espace `Mes annonces`, publication gratuite réservée aux comptes connectés et contact par messagerie interne.
- Formulaire membre : choix entre une catégorie existante et une nouvelle catégorie proposée, titre, description, ville, département, budget ou tarif, et trois photos maximum.
- Modération : toute annonce passe par l’état `pending`. L’administration dispose des informations de l’auteur, du contenu, des coordonnées non publiques, des images, de l’historique et des actions approuver, demander une modification, refuser ou retirer.
- Catégories proposées : l’administrateur peut les rattacher à une catégorie existante ou créer la nouvelle catégorie avant approbation ; elles ne sont jamais publiées automatiquement.
- Conservation : fermeture, expiration après 30 jours ou retrait logique ; aucune politique de suppression physique n’est accordée aux membres.
- Notifications : création d’une notification administrateur à chaque soumission et notification de l’auteur à chaque décision de modération.
- Supabase : le lot isolé `supabase_petites_annonces_2026_09.sql` a été exécuté sur le projet `oqprdoluwpnykyrvvbmo`. Les six contrôles de présence, sécurité, notification et absence de suppression physique sont revenus à `true`.
- Durcissement Supabase : un contrôle indépendant a détecté un droit `DELETE` hérité pour les comptes authentifiés. Ce droit a été révoqué sur les annonces et catégories ; l’écriture directe dans l’historique d’audit a également été retirée. Les contrôles `aucun_delete_membre` et `aucune_policy_delete_membre` sont revenus à `true`.
- Routage : l’initialisation de l’URL a été corrigée pour que `/petites-annonces` reste accessible au chargement direct ; le parcours menu mobile → Petites annonces a été contrôlé.
- Correction de relation : les lectures PostgREST utilisent explicitement `classifieds_user_id_fkey`, afin d’éviter l’ambiguïté créée par les relations auteur et modérateur vers les profils.
- SEO demandé : `/petites-annonces` est ajouté au sitemap ; `/offres` en est absent, n’est plus lié dans le pied de page, porte l’en-tête `X-Robots-Tag: noindex, nofollow` et son ancien titre « Une offre pour chaque rôle » a été remplacé. Le lien « Restaurants malgaches » vers `/gastronomie` reste présent dans le maillage principal.
- Contrôles locaux : analyse ciblée de `src/Classifieds.jsx` réussie ; construction Vite finale réussie avec `assets/index-BOgAXcjq.js`. Le générateur SEO local n’a pas pu lire Supabase depuis le bac à sable (`fetch failed`) mais la construction s’est terminée correctement.
- Publication Vercel : déploiement de production `dpl_Ax4n8K6xe9vT6M81td14s2g6MyyA`, état `Ready`, alias officiel `https://www.malagasy-events.com`, ressource JavaScript publique `assets/index-CJgj9oSQ.js`.
- Vérification publique : page, titre, sept catégories, filtres, état vide et ouverture de la connexion pour publier contrôlés sur le domaine officiel ; aucun journal d’erreur navigateur. Le sitemap public contient `/gastronomie` et `/petites-annonces`, sans `/offres`, et la réponse de `/offres` expose bien le `noindex`.
- Limite de vérification : aucune fausse annonce n’a été créée en production ; le cycle membre → soumission → modération reste à valider lors de la première vraie annonce avec deux comptes réels.

### Activation à effectuer après validation

1. Exécuter `supabase_petites_annonces_2026_09.sql` dans l’éditeur SQL Supabase et vérifier les six indicateurs finaux.
2. Tester avec un compte membre : soumission, proposition de catégorie, modification, fermeture et accès à la messagerie interne.
3. Tester avec le compte administrateur : notification, fiche complète, création ou fusion de catégorie, demande de correction, approbation, refus et retrait.
4. Contrôler la visibilité publique d’une annonce approuvée et son expiration à 30 jours.
5. Publier sur Vercel uniquement après validation explicite de l’aperçu et de ces tests.

## Règle de suivi

## Ajout du 8 septembre 2026 — deux événements

- État : ajouté dans Supabase, publié et vérifié sur le domaine officiel le 8 septembre 2026.
- Lot Supabase unique : `supabase_events_2026_09_08.sql`, relançable sans doublon sur le couple titre + date.
- Sport : `Coupe de France — Mimosa Mada-Sport vs FC Gournay 93`, dimanche 13 septembre 2026 à 14 h 30, Parc des sports Plaine Nord n°1, 94600 Choisy-le-Roi. Tarif non communiqué. Actualités : compte Instagram `mimosa.madasport1` visible sur la publication fournie.
- Culture : `Tana–Paris–Tana — théâtre musical`, samedi 3 octobre 2026 à partir de 19 h, Espace Maison Blanche, 2 avenue Saint-Exupéry, 92320 Châtillon. Tarif unique 20 €, réservations au 06 03 82 72 28 ou 06 18 40 81 37, buffet malgache payant.
- Billetterie : aucun lien inventé. La deuxième affiche donne uniquement des réservations téléphoniques ; aucune ancienne page d’un autre événement n’est recyclée.
- Organisateurs : première occurrence enregistrée pour chacun dans ce catalogue ; aucune fiche organisateur automatique créée à ce stade, conformément à la règle de création à partir du deuxième événement.
- Visuels : utilisés comme sources de saisie, sans republication sur le site tant que les droits d’utilisation ne sont pas confirmés.
- Supabase : deux lignes présentes après insertion, identifiants `9017` et `9018`, avec les titres, dates, lieux et tarifs attendus.
- Contrôle local : construction Vite réussie avec `assets/index-FPDz-GaX.js`. La génération SEO locale n’a pas pu joindre Supabase depuis le bac à sable, sans bloquer la construction.
- Publication Vercel : déploiement de production `dpl_BLZsUUw7pt4rk2S33jeWbzbgVXAF`, état `READY`, alias `https://www.malagasy-events.com`.
- Vérification publique : les deux fiches et leurs détails s’ouvrent sur le domaine officiel ; la fiche du match affiche le lien Instagram exact, et la fiche du théâtre affiche les deux numéros de réservation. Les deux URL sont présentes dans le sitemap public.
- Partenariat confirmé : Sehatra Ba Gasy France est partenaire de Malagasy Events. L’affiche officielle fournie est donc autorisée sur la carte et la fiche de `Tana–Paris–Tana`. L’autorisation reste limitée à cet événement et ne réactive aucun autre visuel non vérifié.
- Billetterie officielle ajoutée le 10 septembre 2026 : `https://www.helloasso.com/associations/sehatra-ba-gasy-france/evenements/paris-tana-paris-sbgf`. La page HelloAsso de Sehatra Ba Gasy France confirme le spectacle du 3 octobre 2026 à 19 h, à l’Espace Maison Blanche de Châtillon, au tarif unique de 20 €.
- Publication du visuel partenaire : fichier officiel optimisé à 580 Ko, déploiement Vercel `dpl_DKqxRMcVwV1eumWcVFr1MnMCZBq9`, état `READY`. Contrôle public effectué : l’affiche apparaît sur la carte et dans la fiche détaillée, avec le bon titre ; les autres événements conservent leur couverture neutre.
- Partenariat RNS–CEN confirmé le 8 septembre 2026 : logo récupéré sur le site officiel `rns-cen.com` et affecté à la fiche organisateur `1`. Les affiches réelles enregistrées pour les prochains événements dont l’organisateur est `RNS - CEN` sont désormais autorisées automatiquement ; une fiche sans affiche conserve la couverture neutre.
- Publication RNS : déploiement Vercel `dpl_DyWEeifWT1oFUzKm9FUXBUfDZHt2`, état `READY`. La fiche publique affiche le logo officiel, le statut partenaire dans sa présentation, son Instagram et son site ; aucun visuel n’a été inventé pour `Madadiaspora Foot — RNS`, dont l’affiche reste absente de la base.
- Présentation des événements RNS : la fiche partenaire affiche désormais chaque événement RNS sous forme de carte illustrée ouvrant sa fiche complète. L’événement du 5 septembre reprend les deux affiches publiées sur `rns-cen.com` (journée portes ouvertes et soirée) et pointe vers l’annonce officielle exacte. `Madadiaspora Foot — RNS` conserve le logo RNS et la mention « Affiche officielle à venir » : au 8 septembre 2026, aucune affiche ni annonce confirmant sa date estimée du 19 décembre n’a été trouvée sur les canaux officiels contrôlés.
- Publication de cette présentation : mise à jour Supabase contrôlée sur la ligne `9016`, puis déploiement Vercel `dpl_BKuejaTg1yXa5Pp7qF6Gvn4YnTHP`, état `READY`. Vérification sur `www.malagasy-events.com` : deux cartes RNS visibles, ouverture de la fiche du 5 septembre, deux affiches officielles affichées et lien exact vers la source RNS.
- Ajout du 9 septembre 2026 — `MAGE 4 à Paris — Le Millénaire` : concert vérifié le samedi 12 septembre 2026 à 21 h 30, au Millénaire, 3 place du 19-Mars-1962, 77176 Savigny-le-Temple. Tarifs annoncés : 35 € en prévente et 40 € sur place ; billetterie et source officielle : `https://mage4.ivenco.net/concert-paris` ; identifiant Supabase `9019`.
- Règle partenaire appliquée à MAGE 4 / IVENCO : aucune affiche ni photo officielle n’est diffusée sur Malagasy Events car il ne s’agit pas d’un partenaire. La fiche utilise la couverture neutre du site. L’offre de 50 invitations est attribuée explicitement à Gaspaname, avec demande de vérification et de contact en message privé sur `gas_paname_sport` ; le texte précise que l’opération n’est pas proposée par Malagasy Events.
- Publication MAGE 4 : déploiement Vercel `dpl_3xyAQ5wohtvbVMbnbmyAtsf1kS2F`, état `READY`, alias `https://www.malagasy-events.com`. Contrôle public réussi : titre, date, lieu, tarifs, texte des 50 invitations Gaspaname, avertissement « non par Malagasy Events », lien Instagram Gaspaname et billetterie officielle visibles ; aucune affiche MAGE 4 rendue et aucun journal d’erreur navigateur.
- Ajout publié le 9 septembre 2026 — `KOSMO — Back to School` : soirée annoncée pour le samedi 26 septembre 2026 à l’Infinity Club, 94 rue d’Amsterdam, 75009 Paris. Ambiances : shatta, dancehall, salegy, bouyon et zouk ; line-up lu sur l’annonce : Tamy, Yoyo, Nawer et Yastonpêche. Source et actualités : `https://www.instagram.com/kosmo.fr/`. Aucun horaire, tarif ou lien de billetterie n’est inventé. KOSMO n’étant pas déclaré partenaire, l’affiche fournie sert uniquement de source et la fiche conserve la couverture neutre Malagasy Events. Construction locale réussie avec `assets/index-Ck93CBQc.js`, publication Git `7f1f8c9` et contrôle public réussi sur la fiche (titre, date, adresse, profil KOSMO, source Instagram, carte et absence d’erreur navigateur). L’écriture directe Supabase a été refusée par les permissions de la connexion ; l’insertion reste prête dans le lot consolidé `supabase_events_2026_09_08.sql`, sans empêcher l’affichage public assuré par l’ajout éditorial embarqué.

## Veille vérifiée du 10 septembre 2026

- Principe : Ketriketrika sert uniquement de piste de veille. Une annonce n’est retenue qu’après confirmation indépendante sur une page officielle de l’organisateur ou de sa billetterie ; aucun texte ni visuel concurrent n’est recopié.
- Six ajouts confirmés sur HelloAsso : `Conférence « Filles du Roi » — FPMA` (12–13 septembre, Paris), `Tongasoa Festival Lyon` (12–13 septembre, Meyzieu), `10e Nuit Malgache` (10 octobre, La Grande-Motte), `Revy Mahaleo à Nantes` (31 octobre), `Revy Mahaleo à Tourcoing` (20 novembre) et `Amy & Andy — concert solidaire LACIM Madagascar` (21 novembre, Éveux).
- Correction confirmée : le `Tournoi de la Solidarité 2026 — CSM & MASOVA` se tient les 24 et 25 octobre au Complexe sportif Saint-Exupéry de Villebon-sur-Yvette, et non le 31 octobre. Le tarif reste formulé `Tarifs selon discipline` afin de ne pas afficher un montant insuffisamment établi.
- Fiches : chaque ajout affiche sa source officielle et son bouton HelloAsso. Les couvertures restent neutres, les organisateurs concernés n’ayant pas été déclarés partenaires de Malagasy Events.
- Éléments écartés faute de confirmation assez solide ou à cause d’informations contradictoires : `Un dimanche à Mada`, AmbondronA à Longjumeau, Feo Gasy à Saint-Loup-Cammas, Zazakely à Drusenheim et la séance cinéma de Strasbourg. Ils restent des pistes, pas des événements publiés.
- Base : les insertions et la correction sont regroupées dans `supabase_events_2026_09_08.sql`, relançable sans doublon. L’écriture Supabase distante n’est pas autorisée depuis la connexion actuelle ; le lot est donc préparé mais non exécuté.
- Contrôle local : construction Vite réussie et fiche directe `Tongasoa Festival Lyon` ouverte avec date, lieu, tarif, description, carte et lien officiel. La liste locale affiche 22 événements à venir.
- Recontrôle général du 10 septembre : la fiche `Rija Ramanantoanina` reste confirmée au samedi 17 octobre 2026 à 19 h 30. L’adresse a été complétée (`31 rue Louis-de-Coppet, 06000 Nice`), le tarif normalisé à `30 €` et la source remplacée par la fiche de l’Office de tourisme Nice Côte d’Azur.
- Trois dates purement estimées ont été retirées temporairement de l’agenda public, sans suppression de leur historique : `Soirée d’intégration GS Lille 2026-2027`, `Tournoi de Noël — Ligue Clichy Madagascar` et `Madadiaspora Foot — RNS`. Elles pourront revenir dès publication d’une date 2026 par leur organisateur.

À l’avenir, compléter ce document par date et par thème. Ne créer un autre rapport que lorsqu’un format exécutable ou réglementaire l’impose, puis ajouter ici son chemin et son statut.

## Mise en conformité Petites annonces — 21 septembre 2026

- État : interface et lot SQL préparés localement ; construction réussie ; aucune publication ni modification distante effectuée dans ce lot.
- Formulaire : distinction obligatoire `Particulier` / `Professionnel`, acceptation explicite des CGU, de la modération et de la confidentialité, rappel des contenus interdits et horodatage `legal_accepted_at` préparé.
- Confidentialité : les cartes publiques n’affichent plus le pseudonyme de l’annonceur ; le téléphone, l’adresse e-mail et l’adresse postale restent absents de l’annonce, et les échanges passent par la messagerie interne.
- Signalement : bouton `Signaler` ajouté à chaque annonce. Un membre connecté crée un signalement lié à l’annonce ; une personne non connectée est dirigée vers `/mes-droits` pour déposer un signalement sans compte.
- Transparence : avertissement visible indiquant que Malagasy Events héberge et met en relation, sans devenir vendeur, employeur, bailleur ou partie à la transaction. Liens directs vers CGU, confidentialité, modération et demande d’effacement.
- Textes juridiques : CGU, confidentialité et page de modération complétées pour les petites annonces ; version affichée mise à jour au 21 septembre 2026. Les mentions légales conservent les champs d’identité de l’éditeur à compléter avec les informations réelles avant commercialisation.
- Base : `supabase_petites_annonces_2026_09.sql` complété de façon idempotente avec `advertiser_type`, `legal_accepted_at`, contrôles serveur et RLS existante conservée. La documentation Supabase actuelle confirme l’usage combiné des grants, de RLS et de politiques `TO authenticated` avec propriété par `auth.uid()`.
- Vérifications : `npm run build` réussi ; `src/Classifieds.jsx` passe ESLint sans erreur. Le contrôle ESLint global reste en échec sur des problèmes antérieurs de `src/App.jsx`, sans lien avec ce lot. Vérification navigateur locale réussie sur `/petites-annonces` : page non vide, aucun overlay Vite, aucune erreur console, avertissement, badge annonceur, anonymisation, bouton de signalement et liens légaux visibles.
- Étapes distantes restantes : exécuter le lot SQL dans Supabase, tester les parcours membre/admin et le signalement, puis déployer sur Vercel uniquement après validation explicite.

## Veille complète concurrentielle — règle validée le 10 septembre 2026

- Ketriketrika devient une source de détection couvrant les rendez-vous, l’annuaire et les démarches, mais jamais une preuve suffisante ni une source de contenu à recopier.
- Photographie de départ affichée par le site concurrent : 39 rendez-vous à venir, 245 adresses et 55 fiches démarches. Son annuaire annonce 25 fiches « Manger », 15 « Acheter », 100 associations, 89 cultes, 10 sports et 6 réseaux.
- Chaque entrée absente de Malagasy Events doit être contrôlée indépendamment sur une source officielle et actuelle. Les textes sont réécrits, les liens officiels sont ajoutés et aucun visuel tiers n’est repris sans autorisation.
- Les démarches sont reconstruites à partir des organismes compétents : Service-Public.fr, France-Visas, ministères, Campus France, CAF, Assurance Maladie, impots.gouv.fr, Action Logement, Crous, ADIL et autres opérateurs publics selon le sujet.
- Le fonctionnement et la lisibilité de leurs fiches peuvent inspirer une amélioration de parcours, sans reproduire leur rédaction, leur identité visuelle ni leur architecture à l’identique.
- La veille quotidienne existante est élargie à toutes ces rubriques. Elle prépare des éléments vérifiés et signale les doublons, fermetures, annulations et informations obsolètes ; aucune publication automatique n’est autorisée sans contrôle final.
- Ajout vérifié le 10 septembre 2026 : `Jeunesse Dorée — Red Island`, vendredi 18 septembre de 23 h à 5 h au 145, 145 route de Paris, 31140 Saint-Alban. DJ Nawer et DJ Naud ; salegy, shatta, bouyon et amapiano. Tarif Weezevent vérifié : 12 €. Billetterie officielle : `https://my.weezevent.com/jeunesse-doree`. La seconde capture fournie montre le profil du même organisateur et non un deuxième événement distinct ; le second événement annoncé par Toky reste donc à recevoir.

## Veille complète Ketriketrika — 13 septembre 2026

- Périmètre contrôlé sans publication : agenda rendu, annuaire complet et démarches, puis comparaison normalisée avec le site public, `src/App.jsx` et tous les lots SQL. Photographie du jour : 36 rendez-vous à venir, 229 fiches d’annuaire dans 106 villes et 61 démarches. Le 10 septembre, les compteurs étaient respectivement 39, 245 et 55.
- Agenda — `vérifié après correction` : une seule nouvelle URL a été détectée depuis le précédent inventaire, la messe mensuelle de la Communauté catholique malgache de Grenoble. Ketriketrika l’affiche au 27 septembre ; le calendrier officiel de la CCMGr confirme le **dimanche 20 septembre 2026, de 10 h à 18 h**, quartier Saint-Joseph, église Saint-Jacques, 2 place Louis-Baillé-Barrelle, 38130 Échirolles. Version réécrite, sans visuel tiers, préparée dans `src/App.jsx` et dans `supabase_events_2026_09_08.sql`. Source officielle contrôlée le 13 septembre : `https://catholique-malgache-grenoble.fr/`.
- Agenda — `obsolète` : quatre URL du précédent inventaire ne sont plus dans l’agenda concurrent (`Conférence Filles du Roi`, `Feo Gasy — tournée des 30 ans`, `Tongasoa Festival Lyon`, `Un dimanche à Mada`). Les deux premières dates du 12–13 septembre sont arrivées à échéance ; aucune suppression n’est appliquée au projet. Les fiches historiques déjà documentées restent distinctes de l’agenda à venir.
- Agenda — `à confirmer` : Ketriketrika continue d’afficher `Soirée d’intégration GS Lille`, `Tournoi de Noël de la Ligue Clichy Madagascar` et `Madadiaspora Foot de la RNS`. Malagasy Events les a déjà retirés de l’agenda public faute de date 2026 publiée par leurs organisateurs ; la veille concurrente ne suffit pas à les réactiver.
- Annuaire — `aucun ajout prêt à valider` : le compteur a diminué de 16 fiches. La seule suppression identifiable par comparaison d’URL est `Salle des fêtes municipale`; les sorties antérieures ne permettaient pas de reconstruire de façon fiable le détail des quinze autres écarts. Les 229 fiches actuelles ont été comparées au corpus local : 119 noms ne correspondent pas textuellement à `src/App.jsx` ou aux lots SQL, mais ce sont des pistes anciennes à contrôler une par une, pas des ajouts vérifiés. Aucun établissement n’est déclaré fermé sur la seule base de cette baisse.
- Démarches — six nouvelles pistes détectées : orientation générale pour faire venir sa famille, regroupement familial, réunification d’une personne protégée, conjoint d’un Français, enfants et parents. La fiche Malagasy Events `Faire venir sa famille` couvre déjà le besoin général : statut `doublon partiel`, enrichi plutôt que dupliqué.
- Démarches — `vérifié` : le regroupement familial concerne en principe le conjoint majeur et les enfants mineurs d’un étranger en séjour régulier ; les parents en sont exclus et relèvent éventuellement d’un autre visa. Source officielle contrôlée le 13 septembre : `https://www.service-public.fr/particuliers/vosdroits/F11166`.
- Démarches — `vérifié` : la réunification familiale concerne certains proches d’un réfugié, apatride ou bénéficiaire de la protection subsidiaire et ne reprend pas les conditions de durée préalable de séjour, de ressources et de logement du regroupement familial. Source officielle contrôlée le 13 septembre : `https://www.ofpra.gouv.fr/la-reunification-familiale`.
- Démarches — `vérifié` : conjoint, enfant ou ascendant d’un Français suivent des parcours distincts selon le lien, la durée et l’objectif du séjour. Les liens France-Visas et Service-Public sont ajoutés à la fiche existante : `https://www.france-visas.gouv.fr/motif-familial`, `https://www.france-visas.gouv.fr/famille-de-francais` et `https://www.service-public.fr/particuliers/vosdroits/F1764`.
- État technique : `src/App.jsx`, le suivi maître et le lot événementiel consolidé sont modifiés localement. Le projet n’a pas de table Supabase dédiée aux guides ; créer une migration uniquement pour ces textes serait techniquement artificiel. Le seul ajout SQL est donc l’événement vérifié, idempotent sur titre + date. Aucune commande Supabase distante, migration, publication Git ou déploiement n’a été exécuté.
- Décision attendue de Toky : valider ou refuser (1) la fiche corrigée de la messe CCMGr et (2) l’enrichissement du guide `Faire venir sa famille`. Les 119 pistes d’annuaire restent en file de vérification indépendante et ne sont pas prêtes à publier.

## Veille complète Ketriketrika — 16 septembre 2026

- État de l’exécution : `bloqué côté source`. L’accès à `https://ketriketrika.com/` a été refusé par la politique de sécurité du navigateur intégré. Aucun contournement, autre navigateur, extraction indirecte ou réutilisation de données concurrentes anciennes comme photographie du jour n’a été tenté.
- Conséquence : il n’est pas possible de certifier aujourd’hui l’inventaire des rendez-vous, de l’annuaire (gastronomie, boutiques, associations, cultes, sport et réseaux) ni des démarches, ni d’effectuer une comparaison entrée par entrée avec le domaine public, `src/App.jsx` et les lots Supabase. Les compteurs du 13 septembre restent uniquement un instantané historique.
- Contrôle local : les propositions du 13 septembre sont toujours présentes sous forme de modifications locales non publiées dans `src/App.jsx`, `supabase_events_2026_09_08.sql` et ce suivi maître. Les autres modifications en cours du dépôt, notamment le lot `supabase_orga_team.sql`, ont été laissées intactes.
- Statuts inchangés : la messe CCMGr reste `vérifié après correction` et prête à valider ; le guide `Faire venir sa famille` reste un `doublon partiel` enrichi à valider ; les 119 pistes d’annuaire restent `à confirmer`, sans ajout publiable.
- Publication et base : aucun ajout éditorial, aucune insertion Supabase, aucune migration, aucun commit et aucun déploiement n’ont été effectués pendant cette exécution.
- Reprise requise : relancer la veille lorsque l’accès autorisé à Ketriketrika est rétabli, puis comparer uniquement les écarts depuis le dernier instantané fiable et vérifier chaque piste auprès d’une source officielle avant toute nouvelle proposition à Toky.

## Veille complète Ketriketrika — 17 septembre 2026

- État du passage : `bloqué à la collecte`, sans publication. Le navigateur intégré a refusé l’accès à `https://ketriketrika.com/` pour cette tâche et a interdit toute tentative de contournement par une autre surface de navigation.
- Conséquence : aucun inventaire du 17 septembre n’a pu être établi pour les rendez-vous, l’annuaire ou les démarches. Les compteurs et écarts du 13 septembre restent un historique, pas une photographie actuelle.
- Comparaison : aucune nouvelle entrée concurrente n’étant observable de manière autorisée, aucun rapprochement nouveau et défendable n’a pu être mené contre `www.malagasy-events.com`, `src/App.jsx` ou les lots Supabase.
- Décision éditoriale : aucun statut `vérifié`, `à confirmer`, `doublon`, `fermé`, `annulé` ou `obsolète` n’est attribué à une nouveauté supposée. Les 119 pistes d’annuaire déjà connues restent non vérifiées et ne sont pas recyclées comme résultats du jour.
- État technique : aucun ajout n’a été fait à `src/App.jsx` ni aux lots Supabase pendant ce passage. Aucune commande Supabase distante, publication Git ou mise en production n’a été exécutée.
- File de validation inchangée : la fiche corrigée de la messe CCMGr et l’enrichissement du guide `Faire venir sa famille`, préparés le 13 septembre, restent en attente de décision de Toky.
- Décisions déjà ouvertes du 13 septembre : la fiche CCMGr corrigée et l’enrichissement du guide famille.

## Veille complète Ketriketrika — 21 septembre 2026

- État de l’exécution : `bloqué côté sources`. Le navigateur intégré a refusé l’accès à `https://ketriketrika.com/`, puis à `https://www.malagasy-events.com/`, en indiquant que ces domaines ne devaient pas être utilisés dans cette session. Conformément à cette restriction, aucun contournement par requête directe, autre navigateur, moteur de recherche ou extraction indirecte n’a été tenté.
- Conséquence : aucun inventaire daté du 21 septembre ne peut être certifié pour les rendez-vous, l’annuaire (gastronomie, boutiques, associations, cultes, sport et réseaux) ou les démarches. La comparaison entrée par entrée avec le site public n’a pas pu être exécutée. L’instantané fiable du 13 septembre — 36 rendez-vous, 229 fiches d’annuaire dans 106 villes et 61 démarches — reste historique et ne vaut pas photographie actuelle.
- Comparaison locale : `src/App.jsx`, `supabase_events_2026_09_08.sql` et le présent suivi conservent les propositions non publiées du 13 septembre. Les autres modifications en cours dans le dépôt ont été laissées intactes. Aucun nouvel élément Ketriketrika n’a été ajouté, réécrit ou classé sur la base de données anciennes.
- Agenda — `obsolète pour publication à venir` : la messe CCMGr d’Échirolles, vérifiée pour le 20 septembre 2026, est désormais passée. Sa vérification historique reste documentée, mais elle n’est plus un ajout d’agenda prêt à valider le 21 septembre. Aucune suppression automatique n’est appliquée à `src/App.jsx` ou au lot SQL tant que Toky n’a pas statué sur les modifications locales déjà présentes.
- Annuaire — `à confirmer` : les 119 absences textuelles issues de l’inventaire du 13 septembre restent des pistes non vérifiées, sans ajout publiable et sans conclusion de fermeture.
- Démarches — `doublon partiel à valider` : l’enrichissement du guide `Faire venir sa famille` reste la seule proposition ouverte. Aucune source administrative n’a été recontrôlée pendant ce run bloqué ; la date de vérification demeure le 13 septembre 2026.
- Résultat du run : aucun ajout prêt à valider, aucune instruction Supabase nouvelle, aucune commande distante, aucune migration, aucun commit, aucun déploiement et aucune publication.
- Reprise requise : rétablir explicitement l’autorisation d’accès aux deux domaines dans le navigateur, puis reprendre les écarts depuis le dernier instantané fiable et vérifier chaque piste auprès de sa source officielle avant présentation à Toky.

## Application mobile Capacitor — 22 septembre 2026

- État : première fondation mobile créée localement à partir du site React/Vite existant. Le contenu, les comptes et les données Supabase restent communs avec le site ; aucune deuxième base de données n’a été créée.
- Projets natifs : dossiers `ios/` et `android/` générés avec Capacitor 8.5.2. Identifiant d’application commun : `com.malagasy.events` ; nom affiché : `Malagasy Events`.
- Configuration : `capacitor.config.json` utilise le build web `dist`. Les commandes `npm run mobile:sync`, `npm run mobile:ios` et `npm run mobile:android` ont été ajoutées. Les marges de sécurité des écrans mobiles ont été préparées dans `src/index.css` et le viewport accepte désormais `viewport-fit=cover`.
- Vérifications : construction Vite réussie, puis synchronisation des fichiers web vers les projets iOS et Android réussie. L’audit des dépendances de production retourne zéro vulnérabilité connue. L’application native elle-même n’a pas encore été lancée dans un simulateur.
- Limites de la machine : Xcode, Android Studio et Java ne sont pas installés. Ils sont nécessaires pour compiler, ouvrir les simulateurs, signer les applications et préparer les fichiers destinés aux stores.
- Identité visuelle restante : préparer une icône officielle carrée de 1024 × 1024 px, sans transparence pour l’App Store, puis générer les icônes et écrans de lancement natifs. Les icônes actuellement présentes dans les projets natifs ne sont pas déclarées comme livrables définitifs.
- Publication : aucune modification Supabase distante, aucun commit, aucun déploiement Vercel et aucune soumission App Store ou Play Store n’ont été effectués. La publication restera une étape séparée après validation sur appareils et simulateurs.

## Classement honnête et visibilité des partenaires — préparation du 24 septembre 2026

- Rappel retrouvé : le tri `Les plus visibles` repose à 65 % sur les consultations réelles des fiches Malagasy Events et à 35 % sur l’audience publique vérifiée des réseaux. Les vues et l’audience restent affichées séparément ; aucune note, aucun avis et aucun compteur ne doivent être inventés.
- Navigation : le tri `A–Z`, déjà prévu dans le calcul, est désormais un véritable bouton public à côté de `Les plus visibles`. Le texte explicatif change selon le tri choisi.
- Partenaires : ils restent dans le même classement et ne reçoivent aucun point artificiel. Leur carte est cependant mieux identifiable grâce à une bordure verte, une ombre légère et le badge `Partenaire`, conformément à l’objectif de leur donner davantage de visibilité sans tromper le public.
- Audience sociale : le classement n’utilise plus les anciens champs `followers` non sourcés. Il attend désormais `audience_facebook`, `audience_instagram`, `audience_total`, `audience_checked_at`, `audience_source` et `audience_verified`. Une valeur ne compte que si `audience_verified` est vraie.
- Base : `supabase_page_popularity.sql` regroupe la table des vues, son déclencheur d’incrémentation, la reprise de l’historique et les nouvelles colonnes d’audience vérifiée des organisateurs. Ce lot n’est pas encore exécuté sur Supabase.
- Contrôle local : construction Vite réussie après l’ajout du tri A–Z et de la mise en évidence partenaire. L’aperçu local est ouvert sur `/organisateurs`. La génération SEO dynamique n’a pas pu joindre Supabase depuis l’environnement local et n’a donc généré que les pages d’annuaire ; ce point doit être recontrôlé avec accès réseau avant publication.
- Publication restante : recevoir ou confirmer les liens Facebook et Instagram des organisateurs, saisir les audiences avec source et date, exécuter puis tester le lot Supabase, contrôler le classement avec de vraies vues, vérifier les fiches en navigation réelle, puis seulement committer et déployer après accord explicite de Toky.
- Partenaires activés dans l’aperçu du 24 septembre : `RNS — Rencontre Nationale Sportive` et `Sehatra Ba Gasy France`. Le lot `supabase_orga_team.sql` les marque comme partenaires et crée la fiche Sehatra Ba Gasy France seulement si elle n’existe pas déjà. Leur avantage est graphique (badge, bordure, contenus autorisés), jamais ajouté au score de popularité.
- Popularité réelle : le lot ne compte plus chaque rechargement brut. Une même personne, identifiée par `visitor_id` ou à défaut par sa session, compte une seule fois par fiche et par jour. La table de déduplication est conservée dans le schéma privé ; les anciens événements analytiques sont recalculés selon la même règle avant publication.
- Mise en avant partenaire : un bandeau compact `Nos partenaires` est ajouté au-dessus du classement avec accès direct à leurs fiches. Les partenaires restent également présents dans la liste générale à leur position calculée par la popularité réelle ; le bandeau n’ajoute aucun point au score et l’indique explicitement par la mention `Classement indépendant`.
- Ajustement demandé ensuite : la mise en avant est réduite à une rangée de logos officiels cliquables, sans carte promotionnelle ni texte descriptif. Un partenaire sans logo officiel fourni n’est pas remplacé par des initiales ou un visuel inventé ; il conserve son badge dans l’annuaire en attendant son logo.

## Petites annonces — cartes uniformes et lecture complète — 23 septembre 2026

- État : publiée en production le 23 septembre 2026 sur `https://www.malagasy-events.com/petites-annonces`, sans modification Supabase.
- Grille : toutes les cartes utilisent désormais le même gabarit. Le titre et la description sont volontairement limités dans la liste afin qu’une annonce longue ne déforme plus toute la ligne.
- Images : une zone visuelle de hauteur constante est conservée ; sans photo, un visuel discret lié à la catégorie remplit cet espace.
- Lecture : un clic sur la carte ou sur « Voir l’annonce complète » ouvre une fenêtre détaillée avec le texte intégral, les informations pratiques, les autres photos et les actions autorisées.
- Vérification : construction Vercel réussie, domaine principal réassigné à la nouvelle version et fichier public contrôlé avec la présence de « Voir l’annonce complète ».
