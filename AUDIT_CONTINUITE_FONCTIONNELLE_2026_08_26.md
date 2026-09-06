# Audit de continuité fonctionnelle

Date : 26 août 2026  
Référence : version blanche dans `projets-recuperes/malagasy-events`.

## Résumé exécutif

La version blanche n'a pas été remplacée. Les corrections ont été faites uniquement dans sa copie locale, sans commit, sans déploiement et sans écriture volontaire dans Supabase.

Les dysfonctionnements confirmés sont :

1. Les statistiques appelées « visites du site » étaient une fenêtre glissante de 7, 30 ou 90 jours. Elles pouvaient donc baisser lorsque d'anciennes lignes sortaient de la période.
2. La lecture du trafic était plafonnée par une seule requête à 10 000 lignes, ce qui pouvait sous-compter une période chargée.
3. Les détails bruts sont supprimés après 13 mois ; ils ne peuvent pas servir de compteur historique permanent.
4. L'aperçu local envoyait encore ses pages vues dans la table de production. Quelques ouvertures de prévisualisation réalisées avant la découverte de ce point peuvent donc avoir ajouté des lignes locales au trafic.
5. Dix événements éditoriaux ont un identifiant texte local, alors que `entraide.event_id` attend un entier Supabase. L'Entraide échouait silencieusement sur ces événements.
6. Quatre annonces Entraide existent pour `event_id=9003`, mais aucun événement actuel ne porte cet identifiant. Elles sont orphelines et ne peuvent pas apparaître dans le fil global.
7. Dix-huit profils artistes vides étaient exposés comme de vraies fiches publiques.

## État des données lu sans modification

| Table | Lignes observées | Observation |
|---|---:|---|
| `events` | 17 | Identifiants numériques ; fonctions sociales compatibles. |
| Événements locaux supplémentaires | 10 | Identifiants texte ; synchronisation nécessaire. |
| `gastro` | 18 | Complétées localement par les fiches vérifiées absentes. |
| `organisateurs` | 57 | 39 fiches établies + 18 profils artistes incomplets. |
| `entraide` | 4 | Les 4 lignes pointent vers l'événement absent 9003. |

## Corrections locales réalisées

### Statistiques

- Blocage complet du tracking quand le domaine est `localhost`, `127.0.0.1` ou `::1`.
- Pagination des lectures Supabase par blocs de 1 000, jusqu'à 50 000 actions, au lieu d'un plafond silencieux à 10 000.
- Libellés corrigés : « sur 7/30/90 jours » pour rendre la fenêtre glissante explicite.
- Alias visiteurs déterministes à partir de l'identifiant pseudonyme, sans charger un registre incomplet de 10 000 lignes.
- Ajout dans le lot SQL en attente de trois compteurs cumulés : pages vues, visites et visiteurs depuis le début. Ils sont incrémentés par déclencheur et ne diminuent jamais quand les détails anciens sont purgés.
- Accès aux totaux uniquement via une fonction réservée à l'administration ; tables internes protégées par RLS et privilèges retirés aux rôles publics.

### Entraide et fonctions sociales d'événement

- Sur un événement numérique existant, l'onglet charge bien et propose la création d'une annonce.
- Sur un événement local non synchronisé, l'interface explique précisément la synchronisation en attente au lieu d'afficher « arrive bientôt » ou d'échouer sans message.
- Les erreurs de création et de suppression sont maintenant affichées.
- Les comparaisons entre identifiants texte/nombre sont normalisées dans le fil global.
- Favoris et intérêts sont bloqués proprement avec une explication sur les événements non synchronisés.
- Le lot SQL en attente crée les dix événements en base, sans doublon par titre + date, ce qui rétablit ensuite toutes les interactions.

### Visuels d'événements

- Chaque catégorie possède désormais une couleur dominante sur toute la couverture : rouge soirée, vert culture, orange gastronomie, bleu sport, or religion et violet autre.
- Si les photos sous licence sont réactivées plus tard, une teinte de catégorie couvre aussi l'ensemble de la photo.
- Le fond blanc général, le liseré du drapeau et la lisibilité sont conservés.

### Annuaires

- L'annuaire gastronomie public est désormais limité à 14 fiches au lien malagasy explicite ; les sites vérifiés sont devenus des boutons cliquables.
- Les liens indisponibles ou insuffisamment confirmés ne sont pas affichés comme sites officiels.
- Les profils organisateurs vides sont masqués au public, sans suppression de données.

## Lot Supabase préparé mais non exécuté

Le fichier `supabase_batch_audit_2026_08_26.sql` regroupe en une transaction :

- colonnes organisateur public dans les propositions d'événement ;
- `events.orga_id` et index ;
- `gastro.site`, `gastro.malagasy_verified`, liens vérifiés et nouvelles fiches strictement malagasy ;
- synchronisation des dix événements locaux ;
- liens artistes suffisamment vérifiés ;
- compteurs de trafic cumulés, registres pseudonymes, déclencheur et fonction admin.

Aucune instruction de ce lot n'a été envoyée à Supabase.

## Vérifications techniques effectuées

- Compilation Vite réussie.
- Avertissement connu : le paquet JavaScript principal dépasse 500 kB ; ce n'est pas un échec de compilation mais une optimisation future.
- Le générateur SEO local n'a pas accès à Supabase dans l'environnement isolé et a généré 0 fiche dynamique. Le dossier `dist` de cette session ne doit pas être déployé.
- Vérification navigateur réelle sur l'aperçu local : version blanche, fiche organisateur cliquable, teinte Culture dominante, Entraide active sur un événement numérique, message explicite sur un événement local, annuaire gastronomie et bouton de site officiel.
- Les clés d'affichage des cartes organisateurs ont été rendues uniques ; la page a été reconstruite et rechargée après correction.
- Les journaux de gestion Vercel/Supabase n'ont pas pu être lus avec les connecteurs actuels (droits refusés). Les données publiques ont pu être contrôlées en lecture seule. Cette limite empêche de certifier l'absence d'erreur serveur historique.

## Risques et décisions avant publication

1. Ne pas déployer le `dist` créé dans l'environnement isolé : ses pages SEO dynamiques sont absentes.
2. Faire une sauvegarde/export Supabase avant d'exécuter le lot unique.
3. Contrôler le lot dans une transaction de test ou sur une branche de prévisualisation si l'accès de gestion est rétabli.
4. Décider du sort des quatre annonces orphelines de l'événement 9003 : rattachement manuel si l'événement est identifié, sinon suppression après accord explicite.
5. Après application du lot, vérifier en production une annonce Entraide, un favori, un intérêt, les compteurs cumulés et les liens d'annuaire.
6. Ne faire le commit/déploiement qu'après approbation visuelle du propriétaire.
