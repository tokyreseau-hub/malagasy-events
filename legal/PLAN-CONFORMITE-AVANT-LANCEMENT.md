# Plan de conformité — Malagasy Events

Version de travail : 29 juillet 2026  
Territoire principal : France / Union européenne

Ce dossier est un socle opérationnel. Il doit être complété avec l’identité
juridique réelle de l’éditeur et relu par un avocat avant le lancement
commercial ou l’encaissement d’abonnements.

## Mesures déjà intégrées au site

- Toutes les affiches et photos d’événements sont masquées, y compris celles
  déjà stockées en base. Une couverture Malagasy Events neutre est utilisée.
- Les nouveaux formulaires d’événements n’acceptent plus d’affiche.
- Les métadonnées sociales et les données structurées n’exposent plus les
  anciennes affiches.
- Chaque événement rappelle que Malagasy Events est une plateforme indépendante.
- Chaque événement donne accès à une procédure de signalement, correction,
  revendication et retrait.
- Pages publiées : mentions légales, CGU, confidentialité, cookies, modération,
  référencement/classement et exercice des droits.
- Formulaire RGPD : accès, rectification, opposition, effacement, portabilité,
  revendication, signalement et contestation d’une modération.
- Migration Supabase préparée pour enregistrer les demandes, les preuves
  d’autorisation et les décisions de modération.

## Les 10 protections à appliquer

### 1. Autorisation des visuels

Ne jamais publier une affiche, un logo, une photo ou une vidéo de tiers sans
preuve écrite. Utiliser le modèle `AUTORISATION-VISUEL-EVENEMENT.md`. Enregistrer
la preuve dans le registre `event_visual_licenses`. Vérifier la durée, les
supports autorisés, le territoire et l’identité du donneur d’autorisation.

### 2. Fiches factuelles et sources

Limiter une fiche non revendiquée aux éléments nécessaires : intitulé, date,
lieu, catégorie, tarif indicatif, organisateur et lien officiel. Conserver en
interne la source et la date de vérification. Ne pas recopier une description
créative ou un article entier.

### 3. Mention d’indépendance

Afficher sur chaque fiche :

> Malagasy Events est une plateforme indépendante. Sauf mention contraire,
> elle n’est ni l’organisateur ni le vendeur des billets. Vérifiez les
> informations auprès de la source officielle.

Ne jamais utiliser « partenaire », « officiel », « vérifié » ou le logo d’une
structure sans preuve correspondante.

### 4. Correction, revendication et retrait

La page `/mes-droits` doit rester accessible sans compte. Toute demande reçoit
un numéro interne, une date et un statut. Accusé de réception recommandé sous
72 heures. Réponse RGPD en principe sous un mois. Une demande plausible portant
sur un risque sérieux entraîne le masquage conservatoire de la fiche.

### 5. Modération et signalements

Traiter en priorité : menace, haine, usurpation, donnée privée, contenu sexuel
non consenti, atteinte manifeste au droit d’auteur ou à une marque. Journaliser
la décision et son fondement. Informer l’auteur du contenu lorsque cela est
possible et proposer une contestation.

### 6. Billetteries

N’activer un bouton « Billets » qu’après ouverture manuelle du lien, contrôle du
domaine, cohérence entre événement et vendeur, et conservation de la date de
vérification. Ne jamais encaisser pour le compte d’un organisateur sans contrat,
processus de remboursement et conformité paiement. En cas de doute, afficher
seulement « Billetterie non confirmée ».

### 7. Transparence Premium

Toute visibilité influencée par un paiement doit afficher clairement « À la
une », « Sponsorisé » ou « Mise en avant payante ». Publier les critères de
classement et de déréférencement. Le paiement ne doit jamais empêcher une
modération ou garantir une appréciation positive.

### 8. Documents et informations obligatoires

Compléter immédiatement :

- identité ou dénomination de l’éditeur ;
- forme juridique ;
- adresse de l’éditeur ;
- SIREN/SIRET si applicable ;
- directeur de publication ;
- e-mail `contact@malagasy-events.com` réellement opérationnel ;
- région Supabase et garanties de transfert ;
- prestataire de paiement, fiscalité et médiateur avant toute vente.

### 9. RGPD et sécurité

Exécuter `supabase_legal_compliance_2026_07.sql`. Tenir un registre des
traitements : comptes, communauté, messagerie, événements, annuaires, demandes,
paiements, sécurité et mesure d’audience. Limiter les accès administrateurs,
activer l’authentification forte, contrôler les règles RLS et documenter les
durées de conservation. Ne jamais demander une pièce d’identité avant qu’elle
soit réellement nécessaire.

### 10. Assurance et validation

Souscrire une RC professionnelle couvrant l’édition numérique, les contenus
utilisateurs et les atteintes aux droits de tiers. Faire relire les pages
juridiques, l’offre Premium, la procédure de billetterie et les contrats
organisateurs par un avocat français en droit du numérique.

## Routine avant publication d’un événement

1. Identifier la source et l’organisateur.
2. Vérifier date, heure, lieu, tarif et statut d’annulation.
3. Ouvrir le lien de billetterie et vérifier le vendeur.
4. Écarter tout texte ou donnée non nécessaire.
5. Ne pas utiliser de visuel sans autorisation archivée.
6. Ne pas afficher un logo sans autorisation de marque.
7. Vérifier qu’aucune personne reconnaissable n’est exposée sans base valable.
8. Ajouter la mention d’indépendance.
9. Noter la date de dernière vérification.
10. Prévoir un nouveau contrôle 72 heures avant l’événement.

## Délais internes recommandés

- Danger immédiat / contenu manifestement grave : examen dès connaissance.
- Atteinte documentée à une marque, une photo ou une affiche : masquage
  conservatoire sous 24 heures.
- Erreur factuelle : correction sous 48 heures.
- Revendication de fiche : accusé de réception sous 72 heures.
- Demande RGPD : réponse sous un mois, sauf prolongation légalement justifiée.

