# Audit global avant la prochaine mise à jour

Date d'ouverture : 26 août 2026

## Règle de livraison

- Aucun nouveau déploiement, commit ou changement Supabase avant la fin de cet audit.
- Regrouper les corrections validées dans un seul lot.
- Montrer l'aperçu local et le rapport de vérification avant toute publication.
- Ne jamais remplacer ou restaurer une autre version du site : la version blanche actuelle est la référence.

## Périmètre enregistré

### Organisateurs liés aux événements

- Un premier événement peut afficher seulement le nom de l'organisateur.
- À partir du deuxième événement publié par le même organisateur, créer sa fiche automatiquement.
- Relier ses événements à cette fiche avec une correspondance exacte, sans rapprochement approximatif.
- Ne reprendre que les contacts explicitement fournis comme publics.

### Restaurants et gastronomie

- Vérifier chaque établissement actuellement affiché.
- Rechercher d'autres établissements malagasy dans la même zone.
- Ne jamais affirmer qu'un établissement est le seul sans preuve suffisante ; indiquer plutôt la date et le périmètre de recherche.
- Ajouter uniquement les sites et réseaux officiels vérifiés.
- Signaler les établissements fermés, introuvables ou insuffisamment documentés.

### Organisateurs et associations

- Vérifier que les profils pertinents sont présents sans doublons.
- Tester chaque site et chaque réseau social disponible.
- Corriger ou retirer les liens morts, ambigus ou non officiels.

### Visuels des événements

- La couleur de catégorie doit occuper la majorité du visuel ou de sa teinte, et pas seulement un indicateur discret.
- Conserver la lisibilité, l'identité blanche du site et les couleurs de la marque.
- Vérifier le rendu sur ordinateur et mobile.

### Entraide

- Tester l'onglet et toutes ses actions : demande, réponse, connexion, enregistrement et affichage.
- Corriger les erreurs côté interface et côté données.

### Statistiques et continuité

- Auditer ce qui a pu être interrompu lors de la restauration de la vraie version blanche.
- Vérifier la collecte des visites, visiteurs, pages et campagnes.
- Distinguer une période glissante d'un compteur total.
- Un compteur présenté comme total cumulé ne doit jamais diminuer.
- Vérifier les erreurs, règles d'accès, vues, données et affichage administrateur.

## État

- [x] Périmètre consigné
- [x] État actuel et données publiques vérifiés
- [ ] Logs de gestion Vercel/Supabase (accès refusé avec les droits actuels)
- [x] Annuaire gastronomie vérifié
- [x] Annuaire organisateurs vérifié
- [x] Visuels d'événements corrigés et testés localement
- [x] Entraide corrigée et testée localement
- [x] Statistiques corrigées localement ; compteurs cumulés préparés dans le lot SQL
- [x] Rapports d'audit rédigés
- [ ] Aperçu approuvé par le propriétaire du site
- [ ] Lot unique autorisé pour commit / Supabase / publication
