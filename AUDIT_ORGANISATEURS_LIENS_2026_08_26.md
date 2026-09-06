# Audit organisateurs, associations et liens

Date de contrôle : 26 août 2026  
État lu dans Supabase : 57 lignes dans `organisateurs`, 17 événements en base et 10 événements éditoriaux encore locaux.

## Conclusion

- La règle validée est respectée : une fiche organisateur devient obligatoire à partir du deuxième événement publié par le même organisateur.
- Revy Revy Vacances et Gas'Paname Sport ont plusieurs événements et disposent bien d'une fiche reliée.
- Les organisateurs d'un seul événement peuvent rester sans fiche ; leur nom continue d'être affiché sur l'événement.
- 39 fiches établies restent visibles publiquement.
- 18 fiches d'artistes « fiche à compléter », sans ville ni lien, sont désormais masquées au public tant qu'elles ne sont pas documentées. Elles restent visibles en administration et ne sont pas supprimées.
- Tous les liens déjà stockés ont été testés. Les réseaux sociaux répondent ; un code HTTP 200 prouve l'accessibilité, pas à lui seul que le compte appartient à la bonne personne. Les profils Facebook numériques et les anciennes billetteries exigent donc encore un contrôle visuel final.
- `malagasyenfrance.com` n'a pas répondu. La fiche conserve son Facebook fonctionnel, mais le site doit être retiré ou remplacé après validation.

## Fiches publiques établies

### Liens directs fonctionnels et cohérents

| Fiche | Liens contrôlés | État |
|---|---|---|
| RNS — Rencontre Nationale Sportive | [Site](https://www.rns-cen.com) · [Facebook](https://www.facebook.com/rns.cen) | Accessibles ; alias événement `RNS - CEN` connu. |
| Gasy Sport Lille | [Facebook](https://www.facebook.com/gslille) | Accessible et relié à l'événement. |
| SPORTIL | [Facebook](https://www.facebook.com/SportilParis1) | Accessible. |
| Gas'Paname Sport | [Facebook](https://www.facebook.com/genialis.mg) · [Instagram](https://www.instagram.com/gas_paname_sport/) | Accessibles ; trois événements éditoriaux à synchroniser. |
| Solidarité France Diégo — ASFD | [Facebook](https://www.facebook.com/assosfd) | Accessible ; téléphone et e-mail publics présents. |
| Association Malgache Franco-Guyanaise | [Facebook](https://www.facebook.com/AssociationFrancoMalgacheGuyanaise) | Accessible. |
| ACFM | [Site](https://association-culturelle-franco-malgache.com) · [Facebook](https://www.facebook.com/profile.php?id=61550882390310) | Accessibles ; contrôle visuel Facebook conseillé. |
| Que Calor Paris | [Instagram](https://www.instagram.com/quecalorparis) | Accessible. |
| Un Malgache à Paris | [Site](https://unmalgacheaparis.com) · [Facebook](https://facebook.com/unmalgacheaparis) · [Instagram](https://instagram.com/unmalgacheaparis) | Accessibles et cohérents. |
| Malagasy En France | [Groupe Facebook](https://www.facebook.com/groups/204379976640842) | Accessible. |
| Diaspora Malagasy | [Groupe Facebook](https://www.facebook.com/groups/2461198107341793) | Accessible. |
| Gasy Ka Manja à Lyon | [Groupe Facebook](https://www.facebook.com/groups/577969292365884) | Accessible. |
| FETYBE | [Facebook](https://www.facebook.com/fetybe) | Accessible. |
| Gasy Unit Paris | [Weezevent](https://my.weezevent.com/gasy-unit) | Accessible, mais c'est une billetterie d'événement, pas une fiche officielle durable. |
| Gasy Moov | [Weezevent](https://my.weezevent.com/gasy-moov-3-strasbourg) | Accessible, mais à remplacer par un réseau durable. |
| Festi-Gasy Marseille | [Weezevent](https://my.weezevent.com/festi-gasy-marseille) | Accessible, mais à remplacer par un réseau durable. |
| KOSMO | [Facebook](https://www.facebook.com/profile.php?id=61570846886143) | Accessible ; contrôle visuel conseillé. |
| DJ Gouty Madagascar | [Facebook](https://www.facebook.com/djgouty) | Accessible. |
| Dj DiNA | [Facebook](https://www.facebook.com/dinadeejay) | Accessible. |
| DJ Malagasy de France (DMF) | [Groupe Facebook](https://www.facebook.com/groups/djmalagasydefrance) | Accessible ; alias événement `DMF` connu. |
| Hypemada | [Facebook](https://www.facebook.com/hypemada) | Accessible. |
| Soirée Gasy France Officiel | [Groupe Facebook](https://www.facebook.com/groups/soireegasyfrance) | Accessible. |
| Gasy Aty France | [Groupe Facebook](https://www.facebook.com/groups/2049048968643577) | Accessible. |
| Gasy Jiaby de France | [Groupe Facebook](https://www.facebook.com/groups/1044706243008430) | Accessible. |
| Le Bon Coin Gasy de France | [Groupe Facebook](https://www.facebook.com/groups/2072223663014016) | Accessible. |
| Saomavibe | [Instagram](https://www.instagram.com/saomavibe_/) | Accessible. |
| Ny Aina VoaArinavalona | [Site](https://www.nyainavrn.com) · [Instagram](https://www.instagram.com/nyaina_vrn/) | Accessibles et cohérents. |

### Liens accessibles mais identité à confirmer visuellement

- Collectif Sport Malagasy — CSM : [Facebook numérique](https://www.facebook.com/profile.php?id=100064795630232).
- ASM Paris : [Facebook numérique](https://www.facebook.com/profile.php?id=100064645391225).
- Ligue Clichy Madagascar : [Facebook numérique](https://www.facebook.com/profile.php?id=100063642368550).
- Club Mad' : [Facebook numérique](https://www.facebook.com/profile.php?id=100064524732458).
- Fitia'Havana Toulouse : [Facebook numérique](https://www.facebook.com/profile.php?id=100072412716681).
- Fiesta Lyon : [Facebook numérique](https://www.facebook.com/profile.php?id=100009852315220).

Ces URL répondent, mais le test automatique ne peut pas lire de façon fiable le nom affiché par Facebook sans session.

### Fiches sans lien public à compléter

- Revy Revy Vacances (Angle 360)
- Mada Mifety
- Gasy Feeling
- Rodman
- BEB’S — Sakafo

Elles restent visibles car elles portent déjà une information utile ou sont reliées à des événements. Aucun contact privé n'est inventé.

### Anomalie de lien

- Malagasy en France 2.0 : [Facebook](https://www.facebook.com/malagasydiasporanews) accessible ; `https://malagasyenfrance.com` indisponible au contrôle. Action : garder Facebook et retirer le domaine du prochain lot sauf preuve de réactivation.

## Profils artistes incomplets masqués au public

Les 18 lignes suivantes étaient visibles alors qu'elles ne contenaient ni ville, ni réseau, ni contact et portaient la note « fiche à compléter » :

- Gaei
- Zakai
- Rimka
- RJ
- DJ Mbints
- Basta Lion
- Mad Max
- Mr Sayda
- Shyn & Denise
- DJ Skull
- Big MJ
- Njakatiana
- Samoela
- Njara Marcel
- Mahaleo
- Rija Ramanantoanina
- Nathan Gabri
- Oashna

Le lot SQL en attente complète uniquement les liens dont l'identité officielle est suffisamment établie :

- Rimka : [Linktree officiel](https://linktr.ee/rimkagasy) et Instagram `rim_kagram_501`.
- Zakai : Instagram `zakaioff`, également référencé dans les métadonnées de sa chaîne officielle.
- DJ Mbints : [Linktree officiel](https://linktr.ee/Mbints.Jmsh).
- Basta Lion : [chaîne YouTube officielle](https://www.youtube.com/@BastaLion).
- Shyn & Denise : [site de Denise](https://deniseofficiel.com/) et Instagram `denise_officiel`.

Les 13 autres restent masqués jusqu'à l'identification d'un compte officiel non ambigu.

## Couverture des organisateurs d'événements

### Plusieurs événements : fiche exigée et présente

- Revy Revy Vacances : 3 événements en base ; fiche présente, alias exact contrôlé.
- Gas'Paname Sport : 3 événements éditoriaux ; fiche présente, synchronisation numérique incluse dans le lot SQL.

### Un événement ou une seule série : absence de fiche admise

Association Soa, Malagasy Lyon, Une Ruche Un Enfant, Association La Petite Mandarine, La Lagune, Maison pour tous Melina Mercouri, Espace Magnan, Midnight 261, Firaisankina no Hery, Alin’ny Feo Gasy, FIFDA et ANDROX.

Ces noms ne doivent pas déclencher une création prématurée. Au deuxième événement publié, l'application crée automatiquement la fiche et ne reprend que les contacts expressément fournis comme publics.

### Fiches/alias déjà disponibles pour des événements uniques ou récurrents

- Gasy Sport Lille
- Collectif Sport Malagasy — CSM
- Ligue Clichy Madagascar
- RNS — Rencontre Nationale Sportive
- DJ Malagasy de France (DMF)
- BEB’S — Sakafo

## Actions restantes avant publication

1. Ouvrir manuellement les six profils Facebook numériques et confirmer le nom visible.
2. Retirer `malagasyenfrance.com` si le propriétaire ne confirme pas sa remise en ligne.
3. Remplacer les trois billetteries Weezevent par des profils officiels durables dès qu'ils sont fournis.
4. Compléter les 13 profils artistes encore masqués, sans deviner de comptes.
5. Exécuter une seule fois le lot Supabase validé, puis tester chaque bouton en production.
