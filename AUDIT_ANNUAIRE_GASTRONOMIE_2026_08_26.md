# Audit strict de l'annuaire gastronomie

Date de contrôle : 26 août 2026  
Périmètre : France, sites officiels, pages publiques déclarées par les établissements et sources locales récentes.

## Règle retenue

Une fiche reste visible seulement si au moins un élément public permet de confirmer :

- une activité présentée explicitement comme malagasy ;
- une offre culinaire malagasy clairement revendiquée ;
- ou une fondatrice, un fondateur ou une cheffe déclarant une origine malagasy et reliant cette origine à l'activité.

Une simple cuisine « des îles », un nom évocateur, une fiche sans description ou la présence ponctuelle d'un plat malagasy ne suffisent pas. Les fiches écartées ne sont pas supprimées définitivement par le lot SQL : elles sont marquées non vérifiées et peuvent être réactivées après nouvelle preuve.

## Résultat

- 14 fiches malagasy confirmées sont conservées dans l'aperçu local.
- 13 anciennes fiches ou ressources insuffisamment justifiées sont retirées de l'affichage public, puis une fiche officielle `Sakafo` est ajoutée.
- `Mascareignes Café`, `Cacao des Îles`, `Le Tana`, `Chez Maman Mada`, `Chez Daben`, `Naffees Traiteur`, `La Cuisine de Gabriel`, `Malak Traiteur`, `Harena Sisters`, `Cuisine Malgache et d'ailleurs`, `Ari Nao` et `Resto Gasy` ne sont plus publiés dans l'annuaire strict.
- `Sakafo — Maison événementielle malgache` remplace l'ancienne fiche ambiguë `Sakafo Street`.
- Aucun établissement n'est présenté comme le seul de sa ville ou de sa région.

## Fiches conservées

| Fiche | Zone | Justification publique | Lien retenu |
|---|---|---|---|
| Ikala Kara | Marseille | L'office de tourisme le décrit comme restaurant malgache et annonce des spécialités de Madagascar. | [Facebook](https://www.facebook.com/Ikalakara) |
| O'Bol d'Or | Vitry-sur-Seine | Le site officiel revendique des plats traditionnels malgaches et la soupe Tamatave. | [Site officiel](https://oboldor.com/) |
| La Gourmandise Malgache | Lillers | La page professionnelle se présente comme traiteur de plats malgaches faits maison. | [Facebook](https://www.facebook.com/profile.php?id=100076189512327) |
| Pili Pili Malgache Food | Réguisheim | Le site officiel se présente comme « Traiteur Malgache ». | [Site officiel](https://www.pilipilimalgachefood.com/) |
| Traiteur Franco-Malagasy Paris | Paris | L'identité et la page professionnelle revendiquent explicitement l'activité franco-malagasy. | [Facebook](https://www.facebook.com/wenddingtraiteurmalagasy) |
| Chez Tiana | Paris 14e | La page professionnelle propose explicitement ravitoto et mofo gasy. | [Facebook](https://www.facebook.com/Cheztiana) |
| Nini + Vous | Bordeaux | Le site officiel décrit une cuisine franco-malgache et dix ans à la tête d'un restaurant malgache. | [Site officiel](https://www.ninietvous.fr/) |
| Au Soleil de Madagascar | Cachan | L'activité est présentée comme food truck de recettes malgaches authentiques. | [Facebook](https://www.facebook.com/AuSoleildeMadagascar) |
| Le Rendez-vous Franco-Malgache | L'Isle-sur-la-Sorgue | L'établissement se présente comme restaurant franco-malgache proposant un voyage culinaire à Madagascar. | [Facebook](https://www.facebook.com/profile.php?id=100092651710205) |
| Chicken Coco | Vendée / Challans | La fondatrice indique une mère malgache et relie cette histoire aux saveurs de Madagascar. | [Site officiel](https://www.chickencoco.fr/) |
| Ti Bou Events | Moliets-et-Maa | Une cofondatrice est déclarée d'origine mauricienne et malgache ; la prestation revendique une touche malagasy. | [Site officiel](https://tibouevents.com/) |
| L'Espace Gourmand Chez Didine | Corbigny | L'établissement est référencé comme restaurant proposant une cuisine réunionnaise et malgache. | [Facebook](https://www.facebook.com/Chez-Didine-825381957475294/) |
| Auberge du Mesnil | Xouaxange | Le site officiel présente Jeannette comme originaire de Madagascar et des spécialités malgaches. | [Site officiel](https://aubergedumesnil.com/) |
| Sakafo — Maison événementielle malgache | Paris et Île-de-France | Le site officiel se présente comme maison événementielle consacrée à la gastronomie malgache. | [Site officiel](https://sakafo.fr/) |

## Fiches retirées de l'affichage

| Fiche | Motif |
|---|---|
| Le Tana | Lien malagasy ancien mais statut actuel et domaine insuffisamment confirmés. |
| Chez Maman Mada | Nom et réseaux évocateurs, mais activité, zone et identité professionnelle insuffisamment documentées. |
| Chez Daben | Affirmation malagasy présente dans l'ancienne base, sans source publique assez précise lors du contrôle. |
| Naffees Traiteur | Offre très large ; identité malagasy principale non établie. |
| La Cuisine de Gabriel | Aucun lien malagasy fiable retrouvé. |
| Malak Traiteur | Aucun lien malagasy fiable retrouvé. |
| Harena Sisters | Nom évocateur mais aucune preuve publique assez précise retrouvée. |
| Cuisine Malgache et d'ailleurs | Groupe de recettes, pas un restaurant, traiteur ou food truck. |
| Sakafo Street | Compte distinct insuffisamment documenté ; ne pas le confondre avec `sakafo.fr`. |
| Mascareignes Café | Restaurant de l'océan Indien incluant Madagascar, sans identité malagasy principale établie. |
| Ari Nao | Page culturelle ; activité de guide gastronomique non confirmée. |
| Resto Gasy | Lien malagasy clair, mais activité actuelle non confirmée et sources contradictoires sur la fermeture. |
| Cacao des Îles | Cuisine de plusieurs îles et liquidation judiciaire publiée en 2024 ; identité malagasy principale non établie. |

## Fonctionnement prévu dans Supabase

Le lot ajoute le champ `malagasy_verified` à la table `gastro`. Les 14 fiches ci-dessus passent à `true`. Les autres restent conservées dans la base avec la valeur `false`, donc récupérables mais non publiées.

Le fichier `supabase_batch_audit_2026_08_26.sql` reste en attente de validation et n'a pas été exécuté.
