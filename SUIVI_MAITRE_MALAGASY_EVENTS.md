# Suivi maître — Malagasy Events

Ce document est le point de suivi unique du projet. Les décisions, lots Supabase, vérifications et états de publication doivent être ajoutés ici plutôt que répartis dans de nouveaux journaux. Les fichiers exécutables indispensables restent séparés, mais sont référencés depuis ce document.

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
