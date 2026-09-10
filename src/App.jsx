import { useState, useEffect, useRef } from "react"
import QRCode from "qrcode"
import { supabase } from './supabase'
import { ClassifiedsAdmin, ClassifiedsPage } from './Classifieds'

const RED = "#C8102E", GREEN = "#007A3D", WHITE = "#FFFFFF"
// Billetterie : passe à true quand un vrai partenariat billetterie est en place.
// En attendant la billetterie Malagasy Events, les boutons ouvrent les
// billetteries externes officielles renseignées sur chaque événement.
const BILLETTERIE_ACTIVE = true
const ADMIN_USERNAME = "Malagasy_events_admin" // l'accès admin = être connecté avec ce compte (vérifié aussi côté serveur par RLS)
const OFFICIAL_USERNAME = "Malagasy_events_admin"
const isOfficial = u => u === OFFICIAL_USERNAME
// Packs membres : avantages et badges
const PLAN_BADGE = {
  organisateur:{emoji:"🎪",label:"Pro",bg:"#fde8ec",color:"#C8102E"},
  pro:{emoji:"⭐",label:"Premium",bg:"linear-gradient(135deg,#b8860b,#e6b31e)",color:"#fff"},
}
const PlanBadge = ({ plan, size=9 }) => {
  const b = PLAN_BADGE[plan]; if (!b) return null
  return <span style={{background:b.bg,color:b.color,fontSize:size,fontWeight:800,padding:"2px 6px",borderRadius:99,whiteSpace:"nowrap"}}>{b.emoji} {b.label}</span>
}
// Badge du compte officiel (onDark : sur fond rouge/foncé)
const OfficialBadge = ({ size=9, onDark }) => (
  <span style={{background:onDark?"#fff":"#C8102E",color:onDark?"#C8102E":"#fff",fontSize:size,fontWeight:800,padding:"2px 6px",borderRadius:99,whiteSpace:"nowrap"}}>✓ OFFICIEL</span>
)
// Seul l'Organisateur publie ses événements directement (le Pro est un membre premium, pas un orga)
const canPublishDirect = profile => profile?.plan==="organisateur"
// Badges fans (gagnés à l'activité, override admin possible)
const FAN_TIERS = [
  {min:50, key:"ray",      emoji:"👑", label:"Ray aman-dReny", bg:"#EEEDFE", color:"#3C3489"},
  {min:20, key:"mafana",   emoji:"🔥", label:"Mpankafy Mafana", bg:"#FAECE7", color:"#993C1D"},
  {min:5,  key:"mpankafy", emoji:"🎶", label:"Mpankafy",        bg:"#E6F1FB", color:"#185FA5"},
  {min:0,  key:"vahiny",   emoji:"🌱", label:"Vahiny",          bg:"#EAF3DE", color:"#3B6D11"},
]
const fanTier = profile => profile?.fan_badge
  ? FAN_TIERS.find(t=>t.key===profile.fan_badge)
  : FAN_TIERS.find(t=>(profile?.fan_points||0)>=t.min)
const FanBadge = ({ profile, size=9 }) => {
  const t = fanTier(profile); if (!t) return null
  return <span title={`Badge fan : ${t.label}`} style={{background:t.bg,color:t.color,fontSize:size,fontWeight:800,padding:"2px 6px",borderRadius:99,whiteSpace:"nowrap"}}>{t.emoji} {t.label}</span>
}
const SITE_URL = "https://www.malagasy-events.com"
const LEGAL_CONTACT = "malagasyevent33@gmail.com"
// Seuls les visuels dont l'autorisation a été confirmée sont diffusés.
// La liste reste volontairement fermée pour ne pas réactiver les anciennes
// images non vérifiées présentes dans la base.
const APPROVED_EVENT_VISUALS = {
  "tana–paris–tana — théâtre musical":"/posters/tana-paris-tana-sehatra-ba-gasy-2026.jpg",
  "journée portes ouvertes & soirée c’est parti ! — rns cen":"/posters/rns-journee-portes-ouvertes-2026.jpg",
}
const APPROVED_PARTNER_POSTERS = {
  "journée portes ouvertes & soirée c’est parti ! — rns cen":[
    "/posters/rns-journee-portes-ouvertes-2026.jpg",
    "/posters/rns-soiree-c-est-parti-2026.jpg",
  ],
}
const APPROVED_EVENT_VISUAL_ORGANIZERS = new Set(["rns - cen","rns — rencontre nationale sportive","cen / rns"])
const approvedEventImage = event => {
  const exact = APPROVED_EVENT_VISUALS[String(event?.title||"").trim().toLowerCase()]
  if (exact) return exact
  const organizer = String(event?.organizer||"").trim().toLowerCase().replace(/\s+/g," ")
  const image = String(event?.image||"").trim()
  return APPROVED_EVENT_VISUAL_ORGANIZERS.has(organizer) && (/^https:\/\//i.test(image)||image.startsWith("/")) ? image : ""
}
const approvedPartnerPosters = event => APPROVED_PARTNER_POSTERS[String(event?.title||"").trim().toLowerCase()]||[]
const EVENT_MEDIA_ENABLED = false
const OFFICIAL_SOCIALS = {
  facebook:"https://www.facebook.com/share/192VCsFaBB/",
  instagram:"https://www.instagram.com/malagasy.events/",
}
const INTERFACE_LANGUAGES = {
  fr:{label:'Français',flag:'🇫🇷',tagline:'La communauté malagasy en France',login:"S'inscrire / se connecter",events:'📅 Événements',diaspora:'🤝 Rejoindre',guide:'🧭 Guide',aftermovies:'🎬 After-movies',gastro:'🍽️ Gastronomie',professionals:'💼 Professionnels',churches:'⛪ Églises',sports:'🏆 Sportifs',tournaments:'🏅 Tournois',shops:'🛍️ Boutiques',community:'👥 Communauté',classifieds:'📌 Petites annonces',premium:'💜 Premium',pro:'💎 Pro',admin:'🔓 Administration'},
  en:{label:'English',flag:'🇬🇧',tagline:'The Malagasy community in France',login:'Sign up / Log in',events:'📅 Events',diaspora:'🤝 Join',guide:'🧭 Guide',aftermovies:'🎬 After-movies',gastro:'🍽️ Food',professionals:'💼 Professionals',churches:'⛪ Churches',sports:'🏆 Sports',tournaments:'🏅 Tournaments',shops:'🛍️ Shops',community:'👥 Community',classifieds:'📌 Classifieds',premium:'💜 Premium',pro:'💎 Pro',admin:'🔓 Administration'},
  mg:{label:'Malagasy',flag:'🇲🇬',tagline:'Ny fiarahamonina malagasy eto Frantsa',login:'Hisoratra anarana / Hiditra',events:'📅 Hetsika',diaspora:'🤝 Hiditra',guide:'🧭 Torolalana',aftermovies:'🎬 Horonantsary',gastro:'🍽️ Sakafo',professionals:'💼 Matihanina',churches:'⛪ Fiangonana',sports:'🏆 Fanatanjahantena',tournaments:'🏅 Fifaninanana',shops:'🛍️ Fivarotana',community:'👥 Fiarahamonina',classifieds:'📌 Filazana',premium:'💜 Premium',pro:'💎 Pro',admin:'🔓 Fitantanana'},
}
// Traductions contrôlées : uniquement les libellés de l'interface.
// Les contenus publiés (noms, événements, posts, descriptions) restent fidèles
// à leur langue d'origine et ne sont jamais envoyés à un service externe.
const CONTROLLED_UI_TRANSLATIONS = {
  en:{
    'Accueil':'Home','Événements':'Events','Gastronomie':'Food','Organisateurs':'Organizers','Églises':'Churches','Boutiques & artisanat':'Shops & crafts','Communauté':'Community','Notifications':'Notifications','Mon profil':'My profile','Se connecter':'Log in',"S'inscrire":'Sign up',"S'inscrire / se connecter":'Sign up / Log in','Déconnexion':'Log out','Administration':'Administration','Ajouter un événement':'Add an event','Proposer un événement':'Submit an event','Nom de l’événement *':'Event name *','Nom de l\'événement *':'Event name *','Date *':'Date *','Catégorie':'Category','Ville':'City','Lieu / salle':'Venue / hall','Salle, adresse ou ville (choisir une proposition)':'Venue, address or city (select a suggestion)','Organisateur *':'Organizer *','Lien billetterie (optionnel)':'Ticket link (optional)',"Lien de l'affiche (optionnel)":'Poster link (optional)','Description':'Description','Envoyer ma proposition':'Send my submission','Envoi...':'Sending...','Fermer':'Close','Annuler':'Cancel','Enregistrer':'Save','Sauvegarder':'Save','Modifier':'Edit','Supprimer':'Delete','Publier':'Publish',"Publier l'événement":'Publish event','Prix':'Price','Prix non renseigné':'Price not provided','Gratuit':'Free','Lieu':'Venue','Date':'Date','Organisateur':'Organizer','Informations':'Information','Intéressé':'Interested','Commenter':'Comment','Message':'Message','Messages':'Messages','Rechercher':'Search','Rechercher par nom ou ville...':'Search by name or city...','Tous':'All','Toutes':'All','Voir →':'View →','Suivre':'Follow','Abonnés':'Followers','Abonnements':'Following','Partager':'Share','Ajouter à Google Agenda':'Add to Google Calendar','Me le rappeler':'Remind me','Photos & vidéos':'Photos & videos','Carte':'Map','À la une':'Featured','Mise en avant terminée':'Promotion ended','Prix (ex. Gratuit)':'Price (e.g. Free)','Prix (ex: 15€)':'Price (e.g. €15)','Adresse complète':'Full address','Code postal':'Postcode','Pseudo':'Username','Avatar':'Profile photo','Importer une photo':'Upload a photo','Choisis une image.':'Choose an image.','Paramètres':'Settings','Mon compte':'My account','Mes abonnés':'My followers','Mes abonnements':'Following','Organisateurs suivis':'Followed organizers','Aucune notification pour le moment':'No notifications yet','Tout marquer comme lu':'Mark all as read','Chargement…':'Loading…','Chargement...':'Loading...','Aucun résultat':'No result','Retour':'Back','Voir les événements':'View events','Calendrier':'Calendar','Liste':'List','Événements vérifiés':'Verified events','Toute la France':'All across France','Une vraie communauté':'A real community','Connecte-toi pour partager avec la communauté 🇲🇬':'Log in to share with the community 🇲🇬','Partage quelque chose avec la communauté 🇲🇬...':'Share something with the community 🇲🇬...','Ajouter une photo':'Add a photo','Envoyer':'Send','Répondre':'Reply','Nouveau message…':'New message…','Aucune notification':'No notifications','Choisir une proposition pour enregistrer l’adresse, la ville et la position exacte sur la carte.':'Select a suggestion to save the full address, city and exact map position.'
  },
  mg:{
    'Accueil':'Fandraisana','Événements':'Hetsika','Gastronomie':'Sakafo','Organisateurs':'Mpikarakara','Églises':'Fiangonana','Boutiques & artisanat':'Fivarotana sy asa-tanana','Communauté':'Fiarahamonina','Notifications':'Fampandrenesana','Mon profil':'Ny mombamomba ahy','Se connecter':'Hiditra',"S'inscrire":'Hisoratra anarana',"S'inscrire / se connecter":'Hisoratra anarana / Hiditra','Déconnexion':'Hivoaka','Administration':'Fitantanana','Ajouter un événement':'Hanampy hetsika','Proposer un événement':'Hanolo-kevitra hetsika','Nom de l’événement *':'Anaran’ny hetsika *','Nom de l\'événement *':'Anaran’ny hetsika *','Date *':'Daty *','Catégorie':'Sokajy','Ville':'Tanàna','Lieu / salle':'Toerana / efitrano','Salle, adresse ou ville (choisir une proposition)':'Efitrano, adiresy na tanàna (fidio ny soso-kevitra)','Organisateur *':'Mpikarakara *','Lien billetterie (optionnel)':'Rohy tapakila (tsy voatery)',"Lien de l'affiche (optionnel)":'Rohy afisy (tsy voatery)','Description':'Fanazavana','Envoyer ma proposition':'Alefa ny soso-kevitro','Envoi...':'Mandefa...','Fermer':'Akatona','Annuler':'Aoka','Enregistrer':'Tehirizo','Sauvegarder':'Tehirizo','Modifier':'Ovay','Supprimer':'Fafao','Publier':'Hamoaka','Publier l’événement':'Hamoaka hetsika','Prix':'Vidiny','Prix non renseigné':'Tsy voalaza ny vidiny','Gratuit':'Maimaim-poana','Lieu':'Toerana','Date':'Daty','Organisateur':'Mpikarakara','Informations':'Fanazavana','Intéressé':'Liana','Commenter':'Haneho hevitra','Message':'Hafatra','Messages':'Hafatra','Rechercher':'Hikaroka','Rechercher par nom ou ville...':'Hikaroka amin’ny anarana na tanàna...','Tous':'Rehetra','Toutes':'Rehetra','Voir →':'Jereo →','Suivre':'Araho','Abonnés':'Mpanaraka','Abonnements':'Araho','Partager':'Hizara','Ajouter à Google Agenda':'Ampidiro ao amin’ny Google Agenda','Me le rappeler':'Ampahatsiahivo aho','Photos & vidéos':'Sary sy horonantsary','Carte':'Sarintany','À la une':'Asongadina','Mise en avant terminée':'Tapitra ny fampisongadinana','Prix (ex. Gratuit)':'Vidiny (oh: Maimaim-poana)','Prix (ex: 15€)':'Vidiny (oh: €15)','Adresse complète':'Adiresy feno','Code postal':'Kaody paositra','Pseudo':'Solon’anarana','Avatar':'Sary mombamomba','Importer une photo':'Hampiditra sary','Choisis une image.':'Misafidiana sary.','Paramètres':'Fikirakirana','Mon compte':'Ny kaontiko','Mes abonnés':'Mpanaraka ahy','Mes abonnements':'Arahiako','Organisateurs suivis':'Mpikarakara arahina','Aucune notification pour le moment':'Tsy misy fampandrenesana izao','Tout marquer comme lu':'Mariho ho novakiana daholo','Chargement…':'Miandry…','Chargement...':'Miandry...','Aucun résultat':'Tsy misy valiny','Retour':'Miverina','Voir les événements':'Jereo ny hetsika','Calendrier':'Kalandrie','Liste':'Lisitra','Événements vérifiés':'Hetsika voamarina','Toute la France':'Manerana an’i Frantsa','Une vraie communauté':'Fiarahamonina tena izy','Connecte-toi pour partager avec la communauté 🇲🇬':'Midira raha hizara amin’ny fiarahamonina 🇲🇬','Partage quelque chose avec la communauté 🇲🇬...':'Mizarà zavatra amin’ny fiarahamonina 🇲🇬...','Ajouter une photo':'Hanampy sary','Envoyer':'Alefa','Répondre':'Hamaly','Nouveau message…':'Hafatra vaovao…','Aucune notification':'Tsy misy fampandrenesana','Choisir une proposition pour enregistrer l’adresse, la ville et la position exacte sur la carte.':'Fidio ny soso-kevitra hitahirizana ny adiresy feno, tanàna ary ny toerana marina amin’ny sarintany.'
  }
}
Object.assign(CONTROLLED_UI_TRANSLATIONS.en,{
  'Diaspora':'Diaspora','Guide':'Guide','Professionnels':'Professionals','Sportifs':'Sports','Boutiques':'Shops','After-movies':'Highlights',
  'Connexion':'Log in','Connexion ou inscription':'Log in or sign up','Ouvrir le menu':'Open menu',"Retour à l'accueil":'Back to home',
  'Mes abonnements':'My plans','Rejoindre la communauté':'Join the community','Voir les structures':'View organizations',"Découvrir l’offre Pro":'Discover the Pro plan',
  'Communauté malgache en France':'Malagasy community in France','La diaspora malagasy en France':'The Malagasy diaspora in France',
  'Un point d’entrée pour découvrir les événements, associations, artistes, restaurants et initiatives de la communauté malgache en France.':'A starting point to discover events, associations, artists, restaurants and initiatives from the Malagasy community in France.',
  'Une communauté nombreuse et active':'A large and active community','Événements malagasy':'Malagasy events','Associations & organisateurs':'Associations & organizers',
  'Gastronomie malgache':'Malagasy food','Boutiques & artisanat':'Shops & crafts','Découvrir →':'Discover →','Malagasy, malgache ou gasy ?':'Malagasy, Malgache or Gasy?',
  'Notre mission':'Our mission','À propos de Malagasy Events':'About Malagasy Events','Rendre la diaspora plus visible et plus proche':'Making the diaspora more visible and connected',
  'Un agenda utile':'A useful calendar','Une communauté':'A community','Une vitrine':'A showcase','Découvrir les événements →':'Discover events →',
  'Échangeons':"Let's talk",'Contacter Malagasy Events':'Contact Malagasy Events','Choisissez le sujet de votre demande pour être dirigé vers le bon espace.':'Choose the subject of your request to reach the right section.',
  'Référencer une structure':'List an organization','Partenariat & visibilité':'Partnership & visibility','Centre d’aide':'Help center','Questions fréquentes':'Frequently asked questions',
  'Tout savoir sur Malagasy Events et son fonctionnement.':'Everything you need to know about Malagasy Events.','Nous contacter →':'Contact us →',
  'Démarches utiles':'Useful steps','Bien démarrer en France':'Getting started in France',
  'Un guide simple pour les étudiants, jeunes diplômés, professionnels et personnes ayant besoin d’un accompagnement juridique fiable.':'A simple guide for students, graduates, professionals and people who need reliable legal support.',
  'À vérifier avant chaque démarche.':'Check before each step.','Section 1':'Section 1','Section 2':'Section 2','Section 3':'Section 3','Section 4':'Section 4',
  'Étudiant qui arrive en France':'Student arriving in France','Fin d’études & recherche d’emploi':'Graduation & job search','Arrivée en France pour le travail':'Moving to France for work',
  'Sans titre de séjour : trouver une aide fiable':'Without a residence permit: finding reliable help','Dès l’arrivée':'Upon arrival','Dans les 3 mois':'Within 3 months',
  'Avant l’inscription définitive':'Before final enrollment','Premiers jours':'First days','Santé et logement':'Health and housing',
  'Avant l’expiration du titre étudiant':'Before your student permit expires','Préparer la recherche':'Prepare your job search','Offres partenaires':'Partner job offers',
  'Avant le départ':'Before departure','À l’arrivée':'Upon arrival','Pour bien démarrer':'To get started','D’abord, être conseillé':'Get advice first',
  'Aide gratuite et confidentielle':'Free and confidential help','Se protéger':'Stay safe','Valider un VLS-TS':'Validate a VLS-TS','Assurance Maladie':'Health insurance',
  'Conditions CAF 2026':'2026 CAF conditions','Après les études':'After graduation','Autorisation de travail':'Work permit','Salarié étranger en France':'Foreign employee in France',
  'Avocat gratuit / Point-justice':'Free lawyer / Point-justice','Aide juridictionnelle':'Legal aid','Défenseur des droits':'Defender of Rights',
  'Ces repères ne remplacent pas l’avis d’une administration, d’un établissement ou d’un avocat. Informations vérifiées le 26 juillet 2026.':'These guidelines do not replace advice from an authority, educational institution or lawyer. Information checked on 26 July 2026.',
  'Installe-toi, préviens ton établissement et conserve ensemble passeport, visa, acte de naissance traduit si demandé, justificatif de domicile et attestation d’inscription.':'Get settled, notify your institution and keep your passport, visa, translated birth certificate if requested, proof of address and enrollment certificate together.',
  'Si tu as un visa long séjour valant titre de séjour (VLS-TS), valide-le en ligne sur le portail officiel de l’administration des étrangers.':'If you hold a long-stay visa equivalent to a residence permit (VLS-TS), validate it online through the official foreign nationals portal.',
  'Règle la CVEC si tu es concerné, puis finalise ton inscription au campus pour obtenir carte étudiante et accès numériques.':'Pay the CVEC if it applies to you, then finalize campus enrollment to receive your student card and online access.',
  'Compare un compte bancaire, un forfait mobile et l’abonnement de transport local. Ne choisis pas une marque par défaut : vérifie les frais et les conditions.':'Compare bank accounts, mobile plans and local transport passes. Check fees and conditions instead of choosing a provider by default.',
  'Inscris-toi à l’Assurance Maladie via le portail étudiant étranger si nécessaire. Simule ensuite tes droits CAF : depuis juillet 2026, les conditions d’aide au logement ont changé pour certains étudiants extracommunautaires.':'Register for French health insurance through the foreign student portal if needed. Then check your CAF eligibility: since July 2026, housing benefit rules have changed for some non-EU students.',
  'Vérifie rapidement si tu peux demander un titre ou une autorisation « recherche d’emploi / création d’entreprise ». Les conditions dépendent du diplôme et de la situation.':'Quickly check whether you can apply for a job-search or business-creation permit. Eligibility depends on your qualification and circumstances.',
  'Mets à jour CV, LinkedIn et portfolio, puis consulte France Travail, l’Apec et 1 jeune 1 solution. Vérifie avec l’employeur si une autorisation de travail est nécessaire.':'Update your CV, LinkedIn and portfolio, then check France Travail, Apec and 1 jeune 1 solution. Ask the employer whether a work permit is required.',
  'Nous attendons des entreprises partenaires avant de publier ici des emplois vérifiés pour la communauté.':'We are waiting for partner companies before publishing verified job opportunities for the community here.',
  'Confirme avec l’employeur le contrat, l’autorisation de travail éventuelle, le visa adapté, le lieu de travail et les premières solutions de logement.':'Confirm the contract, any required work permit, the appropriate visa, workplace and initial housing options with your employer.',
  'Valide le VLS-TS dans les 3 mois si ton visa l’exige. Prépare ensuite domicile, banque, transport, Assurance Maladie et assurance habitation.':'Validate your VLS-TS within three months if required by your visa. Then arrange housing, banking, transport, health insurance and home insurance.',
  'Demande un rendez-vous d’intégration à ton employeur et conserve tous tes documents. Cette rubrique accueillera prochainement des partenaires logement, mobilité et emploi vérifiés.':'Ask your employer for an onboarding meeting and keep all your documents. Verified housing, mobility and employment partners will be added here soon.',
  'Chaque situation est différente. Un avocat en droit des étrangers ou une association spécialisée doit étudier le dossier avant toute démarche de régularisation ou recours.':'Every situation is different. An immigration lawyer or specialist association should review the case before any regularization application or appeal.',
  'Les Point-justice proposent des consultations juridiques gratuites. L’aide juridictionnelle peut aussi prendre en charge tout ou partie des frais selon la situation et les ressources.':'Point-justice centers offer free legal consultations. Legal aid may also cover some or all costs depending on circumstances and income.',
  'Ne remets jamais ton passeport original et n’envoie pas d’argent à un intermédiaire inconnu. Utilise les sites officiels et les associations reconnues.':'Never hand over your original passport or send money to an unknown intermediary. Use official websites and recognized associations.',
  'Agenda de la diaspora malgache':'Malagasy diaspora calendar','Trouver un événement malagasy en France':'Find a Malagasy event in France',
  'Événements malagasy':'Malagasy events','Restaurants malgaches':'Malagasy restaurants','Boutiques malgaches':'Malagasy shops','Diaspora malagasy':'Malagasy diaspora',
  'À propos':'About','Nos offres':'Our plans','Conception & développement : Malagasy Events · assistance technique Codex':'Design & development: Malagasy Events · technical assistance by Codex'
})
Object.assign(CONTROLLED_UI_TRANSLATIONS.mg,{
  'Diaspora':'Diaspora','Guide':'Torolalana','Professionnels':'Matihanina','Sportifs':'Fanatanjahantena','Boutiques':'Fivarotana','After-movies':'Tamberina',
  'Connexion':'Hiditra','Connexion ou inscription':'Hiditra na hisoratra anarana','Ouvrir le menu':'Sokafy ny sakafo',"Retour à l'accueil":'Hiverina amin’ny fandraisana',
  'Mes abonnements':'Ny tolotro','Rejoindre la communauté':'Hiditra amin’ny fiarahamonina','Voir les structures':'Jereo ireo fikambanana',"Découvrir l’offre Pro":'Jereo ny tolotra Pro',
  'Communauté malgache en France':'Fiarahamonina malagasy eto Frantsa','La diaspora malagasy en France':'Ny diaspora malagasy eto Frantsa',
  'Un point d’entrée pour découvrir les événements, associations, artistes, restaurants et initiatives de la communauté malgache en France.':'Toerana iray hahitana ny hetsika, fikambanana, artista, trano fisakafoanana ary tetikasan’ny Malagasy eto Frantsa.',
  'Une communauté nombreuse et active':'Fiarahamonina maro sy mavitrika','Événements malagasy':'Hetsika malagasy','Associations & organisateurs':'Fikambanana sy mpikarakara',
  'Gastronomie malgache':'Sakafo malagasy','Boutiques & artisanat':'Fivarotana sy asa-tanana','Découvrir →':'Jereo →','Malagasy, malgache ou gasy ?':'Malagasy, malgache sa gasy?',
  'Notre mission':'Ny iraka ataonay','À propos de Malagasy Events':'Momba ny Malagasy Events','Rendre la diaspora plus visible et plus proche':'Hampifandray sy hampiseho kokoa ny diaspora',
  'Un agenda utile':'Kalandrie mahasoa','Une communauté':'Fiarahamonina','Une vitrine':'Sehatra fampahafantarana','Découvrir les événements →':'Jereo ny hetsika →',
  'Échangeons':'Mifandraisa amintsika','Contacter Malagasy Events':'Hifandray amin’ny Malagasy Events','Choisissez le sujet de votre demande pour être dirigé vers le bon espace.':'Safidio ny anton’ny fangatahanao mba hahatongavana amin’ny toerana mety.',
  'Référencer une structure':'Hampiditra fikambanana','Partenariat & visibilité':'Fiaraha-miasa sy fampahafantarana','Centre d’aide':'Foibe fanampiana','Questions fréquentes':'Fanontaniana matetika',
  'Tout savoir sur Malagasy Events et son fonctionnement.':'Fantaro ny Malagasy Events sy ny fomba fiasany.','Nous contacter →':'Hifandray aminay →',
  'Démarches utiles':'Dingana mahasoa','Bien démarrer en France':'Hanomboka tsara eto Frantsa',
  'Un guide simple pour les étudiants, jeunes diplômés, professionnels et personnes ayant besoin d’un accompagnement juridique fiable.':'Torolalana tsotra ho an’ny mpianatra, nahazo diplaoma, matihanina ary izay mila fanampiana ara-dalàna azo antoka.',
  'À vérifier avant chaque démarche.':'Hamarino alohan’ny dingana tsirairay.','Section 1':'Fizarana 1','Section 2':'Fizarana 2','Section 3':'Fizarana 3','Section 4':'Fizarana 4',
  'Étudiant qui arrive en France':'Mpianatra tonga eto Frantsa','Fin d’études & recherche d’emploi':'Faran’ny fianarana sy fitadiavana asa','Arrivée en France pour le travail':'Tonga eto Frantsa hiasa',
  'Sans titre de séjour : trouver une aide fiable':'Tsy manana taratasy: mitady fanampiana azo antoka','Dès l’arrivée':'Vao tonga','Dans les 3 mois':'Ao anatin’ny 3 volana',
  'Avant l’inscription définitive':'Alohan’ny fisoratana anarana farany','Premiers jours':'Andro voalohany','Santé et logement':'Fahasalamana sy trano',
  'Avant l’expiration du titre étudiant':'Alohan’ny hahataperan’ny taratasy maha-mpianatra','Préparer la recherche':'Miomana hitady asa','Offres partenaires':'Asa avy amin’ny mpiara-miombon’antoka',
  'Avant le départ':'Alohan’ny hiaingana','À l’arrivée':'Rehefa tonga','Pour bien démarrer':'Mba hanombohana tsara','D’abord, être conseillé':'Mangataha torohevitra aloha',
  'Aide gratuite et confidentielle':'Fanampiana maimaim-poana sy tsiambaratelo','Se protéger':'Miaro tena','Valider un VLS-TS':'Manamarina VLS-TS','Assurance Maladie':'Fiantohana ara-pahasalamana',
  'Conditions CAF 2026':'Fepetra CAF 2026','Après les études':'Aorian’ny fianarana','Autorisation de travail':'Fahazoan-dalana hiasa','Salarié étranger en France':'Mpiasa vahiny eto Frantsa',
  'Avocat gratuit / Point-justice':'Mpisolovava maimaim-poana / Point-justice','Aide juridictionnelle':'Fanampiana ara-pitsarana','Défenseur des droits':'Défenseur des droits',
  'Ces repères ne remplacent pas l’avis d’une administration, d’un établissement ou d’un avocat. Informations vérifiées le 26 juillet 2026.':'Ireo toromarika ireo dia tsy misolo ny torohevitry ny fitondrana, sekoly na mpisolovava. Nohamarina tamin’ny 26 Jolay 2026 ny vaovao.',
  'Installe-toi, préviens ton établissement et conserve ensemble passeport, visa, acte de naissance traduit si demandé, justificatif de domicile et attestation d’inscription.':'Miorena, ampahafantaro ny sekolinao ary tehirizo miaraka ny pasipaoro, visa, kopia nahaterahana nadika raha ilaina, porofon’ny adiresy ary taratasy fisoratana anarana.',
  'Si tu as un visa long séjour valant titre de séjour (VLS-TS), valide-le en ligne sur le portail officiel de l’administration des étrangers.':'Raha manana VLS-TS ianao dia hamarino an-tserasera ao amin’ny tranonkala ofisialin’ny fitondrana.',
  'Règle la CVEC si tu es concerné, puis finalise ton inscription au campus pour obtenir carte étudiante et accès numériques.':'Aloavy ny CVEC raha voakasika ianao, ary farano ny fisoratana anarana hahazoana karatra mpianatra sy fidirana an-tserasera.',
  'Compare un compte bancaire, un forfait mobile et l’abonnement de transport local. Ne choisis pas une marque par défaut : vérifie les frais et les conditions.':'Ampitahao ny kaonty banky, forfait finday ary fitaterana. Hamarino ny sarany sy ny fepetra alohan’ny hisafidianana.',
  'Inscris-toi à l’Assurance Maladie via le portail étudiant étranger si nécessaire. Simule ensuite tes droits CAF : depuis juillet 2026, les conditions d’aide au logement ont changé pour certains étudiants extracommunautaires.':'Misorata amin’ny Assurance Maladie raha ilaina. Hamarino koa ny zo CAF satria niova tamin’ny Jolay 2026 ny fepetra ho an’ny mpianatra sasany ivelan’ny Vondrona Eoropeana.',
  'Vérifie rapidement si tu peux demander un titre ou une autorisation « recherche d’emploi / création d’entreprise ». Les conditions dépendent du diplôme et de la situation.':'Hamarino haingana raha afaka mangataka fahazoan-dalana hitady asa na hanangana orinasa ianao. Miankina amin’ny diplaoma sy ny toe-javatra izany.',
  'Mets à jour CV, LinkedIn et portfolio, puis consulte France Travail, l’Apec et 1 jeune 1 solution. Vérifie avec l’employeur si une autorisation de travail est nécessaire.':'Havaozy ny CV, LinkedIn ary portfolio, ary jereo ny France Travail, Apec sy 1 jeune 1 solution. Anontanio ny mpampiasa raha mila fahazoan-dalana hiasa.',
  'Nous attendons des entreprises partenaires avant de publier ici des emplois vérifiés pour la communauté.':'Miandry orinasa mpiara-miombon’antoka izahay vao hamoaka asa voamarina ho an’ny fiarahamonina eto.',
  'Confirme avec l’employeur le contrat, l’autorisation de travail éventuelle, le visa adapté, le lieu de travail et les premières solutions de logement.':'Hamarino amin’ny mpampiasa ny fifanarahana, fahazoan-dalana hiasa raha ilaina, visa, toeram-piasana ary vahaolana voalohany amin’ny trano.',
  'Valide le VLS-TS dans les 3 mois si ton visa l’exige. Prépare ensuite domicile, banque, transport, Assurance Maladie et assurance habitation.':'Hamarino ao anatin’ny telo volana ny VLS-TS raha takian’ny visa. Omano avy eo ny trano, banky, fitaterana ary fiantohana.',
  'Demande un rendez-vous d’intégration à ton employeur et conserve tous tes documents. Cette rubrique accueillera prochainement des partenaires logement, mobilité et emploi vérifiés.':'Mangataha fotoana fampidirana amin’ny mpampiasa ary tehirizo ny antontan-taratasy rehetra. Hampidirina eto tsy ho ela ireo mpiara-miombon’antoka voamarina.',
  'Chaque situation est différente. Un avocat en droit des étrangers ou une association spécialisée doit étudier le dossier avant toute démarche de régularisation ou recours.':'Samy hafa ny toe-javatra tsirairay. Tokony hijery ny antontan-taratasy aloha ny mpisolovava momba ny vahiny na fikambanana manampahaizana.',
  'Les Point-justice proposent des consultations juridiques gratuites. L’aide juridictionnelle peut aussi prendre en charge tout ou partie des frais selon la situation et les ressources.':'Manolotra torohevitra ara-dalàna maimaim-poana ny Point-justice. Mety handoa ampahany na ny sarany rehetra koa ny fanampiana ara-pitsarana.',
  'Ne remets jamais ton passeport original et n’envoie pas d’argent à un intermédiaire inconnu. Utilise les sites officiels et les associations reconnues.':'Aza omena olon-tsy fantatra ny pasipaoro tena izy ary aza mandefa vola amin’ny mpanelanelana tsy fantatra. Ampiasao ny tranonkala ofisialy sy fikambanana ekena.',
  'Agenda de la diaspora malgache':'Kalandrien’ny diaspora malagasy','Trouver un événement malagasy en France':'Mitadiava hetsika malagasy eto Frantsa',
  'Restaurants malgaches':'Trano fisakafoanana malagasy','Boutiques malgaches':'Fivarotana malagasy','Diaspora malagasy':'Diaspora malagasy',
  'À propos':'Momba anay','Nos offres':'Ny tolotray','Conception & développement : Malagasy Events · assistance technique Codex':'Famolavolana sy fanamboarana: Malagasy Events · fanampiana teknika Codex'
})
Object.assign(CONTROLLED_UI_TRANSLATIONS.en,{
  'La France accueille une importante diaspora malgache, estimée à environ 160 000 personnes par France Diplomatie. Elle se rassemble autour de la culture, du sport, de la musique, de la gastronomie, de la solidarité et de nombreuses associations locales.':'France is home to a large Malagasy diaspora, estimated at around 160,000 people by France Diplomatie. The community comes together through culture, sport, music, food, solidarity and many local associations.',
  'Ces termes sont couramment employés pour parler de Madagascar et de sa communauté. Malagasy Events utilise naturellement les expressions diaspora malagasy, diaspora malgache, communauté gasy et événements malgaches afin que chacun puisse retrouver facilement les informations recherchées.':'These terms are commonly used to refer to Madagascar and its community. Malagasy Events naturally uses the expressions Malagasy diaspora, Malagasy community, Gasy community and Malagasy events so everyone can easily find the information they need.',
  'La communauté malagasy de France':'The Malagasy community in France','Tous les événements malagasy,':'All Malagasy events,','au même endroit.':'all in one place.',
  'Soirées, concerts, tournois, gastronomie et rencontres partout en France.':'Parties, concerts, tournaments, food and gatherings throughout France.',
  'Rechercher un événement, une ville, une catégorie...':'Search for an event, city or category...','Voir les événements →':'View events →','Proposer un événement →':'Submit an event →',
  'Événements vérifiés':'Verified events','Partout en France':'Throughout France','Les prochains rendez-vous':'Upcoming events',
  'Malagasy Events, aussi recherché sous les noms Malagasy Event ou agenda gasy, rassemble les événements malgaches en France : soirées gasy, concerts, festivals, tournois sportifs, sorties culturelles et rencontres de la communauté.':'Malagasy Events, also searched as Malagasy Event or Gasy calendar, brings together Malagasy events in France: Gasy parties, concerts, festivals, sports tournaments, cultural outings and community gatherings.',
  'Où trouver les événements malagasy en France ?':'Where can I find Malagasy events in France?','Sur cet agenda : soirées, concerts, festivals, sport et sorties malgaches dans toute la France.':'On this calendar: parties, concerts, festivals, sports and Malagasy outings throughout France.',
  'Comment trouver une soirée gasy ?':'How can I find a Gasy party?','Filtre les événements par ville pour découvrir les prochaines soirées près de chez toi.':'Filter events by city to discover upcoming parties near you.',
  'Où manger malgache en France ?':'Where can I eat Malagasy food in France?','Consulte l’annuaire des restaurants, traiteurs et food trucks malgaches.':'Browse the directory of Malagasy restaurants, caterers and food trucks.',
  'Comment publier un événement ?':'How do I publish an event?','Les associations et organisateurs peuvent proposer leurs événements à la communauté.':'Associations and organizers can submit their events to the community.',
  'L’agenda de référence pour trouver les événements malagasy en France : soirées, concerts, culture, sport, restaurants, associations et bonnes adresses de la diaspora malgache.':'The leading calendar for Malagasy events in France: parties, concerts, culture, sports, restaurants, associations and trusted diaspora addresses.',
  'Guide France':'France Guide','Gastronomie malagasy':'Malagasy food','Restaurants, traiteurs et food trucks de la communauté —':'Community restaurants, caterers and food trucks —',
  'adresses':'addresses','adresse sur la carte':'address on the map','adresses sur la carte':'addresses on the map','Type':'Type','Région':'Region',
  'Restaurants':'Restaurants','Traiteurs':'Caterers','Food trucks':'Food trucks','Guides':'Guides','Communautés':'Communities','SUR LA CARTE':'ON THE MAP',
  'Professionnels & associations':'Professionals & associations','La base des professionnels de la communauté malagasy en France —':'The directory of Malagasy community professionals in France —',
  'structures recensées':'listed organizations','Ta structure manque ? Crée ton compte et réclame ta fiche !':'Is your organization missing? Create your account and claim your listing!',
  'Églises malagasy':'Malagasy churches','Paroisses et communautés chrétiennes malagasy en France':'Malagasy parishes and Christian communities in France',
  'Sportifs malagasy':'Malagasy sports','Clubs, associations sportives et organisateurs de tournois de la communauté malagasy —':'Malagasy community clubs, sports associations and tournament organizers —',
  'Boutiques & artisanat malagasy':'Malagasy shops & crafts','Produits, épiceries et artisanat de Madagascar en France':'Products, grocery shops and crafts from Madagascar in France',
  'référencé':'listed','référencés':'listed'
  ,'✓ Événements vérifiés':'✓ Verified events','NOUVEAU':'NEW','Billets':'Tickets','Soirée':'Party','Culture':'Culture','Sport':'Sports','Religion':'Religion','Autre':'Other',
  'Événements passés':'Past events','Proposer un event':'Submit an event','À LA UNE':'FEATURED','encore':'remaining',
  'Réseaux sociaux officiels Malagasy Events':'Official Malagasy Events social media','Malagasy Events sur Facebook':'Malagasy Events on Facebook','Malagasy Events sur Instagram':'Malagasy Events on Instagram','Liens utiles Malagasy Events':'Useful Malagasy Events links'
})
Object.assign(CONTROLLED_UI_TRANSLATIONS.mg,{
  'La France accueille une importante diaspora malgache, estimée à environ 160 000 personnes par France Diplomatie. Elle se rassemble autour de la culture, du sport, de la musique, de la gastronomie, de la solidarité et de nombreuses associations locales.':'Misy diaspora malagasy lehibe eto Frantsa, tombanana ho 160 000 eo ho eo araka ny France Diplomatie. Mivondrona amin’ny kolontsaina, fanatanjahantena, mozika, sakafo, fifanampiana ary fikambanana maro izy ireo.',
  'Ces termes sont couramment employés pour parler de Madagascar et de sa communauté. Malagasy Events utilise naturellement les expressions diaspora malagasy, diaspora malgache, communauté gasy et événements malgaches afin que chacun puisse retrouver facilement les informations recherchées.':'Ireo teny ireo dia samy ampiasaina hilazana an’i Madagasikara sy ny fiarahamoniny. Mampiasa ny teny hoe diaspora malagasy, diaspora malgache, communauté gasy ary événements malgaches ny Malagasy Events mba hahitan’ny rehetra mora ny vaovao tadiaviny.',
  'La communauté malagasy de France':'Ny fiarahamonina malagasy eto Frantsa','Tous les événements malagasy,':'Ny hetsika malagasy rehetra,','au même endroit.':'amin’ny toerana iray.',
  'Soirées, concerts, tournois, gastronomie et rencontres partout en France.':'Fety, kaonseritra, fifaninanana, sakafo ary fihaonana manerana an’i Frantsa.',
  'Rechercher un événement, une ville, une catégorie...':'Hikaroka hetsika, tanàna na sokajy...','Voir les événements →':'Jereo ny hetsika →','Proposer un événement →':'Hanolo-kevitra hetsika →',
  'Événements vérifiés':'Hetsika voamarina','Partout en France':'Manerana an’i Frantsa','Les prochains rendez-vous':'Ireo hetsika manaraka',
  'Malagasy Events, aussi recherché sous les noms Malagasy Event ou agenda gasy, rassemble les événements malgaches en France : soirées gasy, concerts, festivals, tournois sportifs, sorties culturelles et rencontres de la communauté.':'Ny Malagasy Events, izay tadiavina koa amin’ny anarana Malagasy Event na agenda gasy, dia manangona ireo hetsika malagasy eto Frantsa: fety gasy, kaonseritra, festivaly, fifaninanana ara-panatanjahantena, kolontsaina ary fihaonan’ny fiarahamonina.',
  'Où trouver les événements malagasy en France ?':'Aiza no ahitana hetsika malagasy eto Frantsa?','Sur cet agenda : soirées, concerts, festivals, sport et sorties malgaches dans toute la France.':'Ao amin’ity kalandrie ity no ahitana fety, kaonseritra, festivaly, fanatanjahantena ary hetsika malagasy manerana an’i Frantsa.',
  'Comment trouver une soirée gasy ?':'Ahoana no hahitana fety gasy?','Filtre les événements par ville pour découvrir les prochaines soirées près de chez toi.':'Sivano araka ny tanàna ireo hetsika mba hahitana ny fety manaraka akaiky anao.',
  'Où manger malgache en France ?':'Aiza no hihinanana sakafo malagasy eto Frantsa?','Consulte l’annuaire des restaurants, traiteurs et food trucks malgaches.':'Jereo ny lisitry ny trano fisakafoanana, mpahandro ary food truck malagasy.',
  'Comment publier un événement ?':'Ahoana no hamoahana hetsika?','Les associations et organisateurs peuvent proposer leurs événements à la communauté.':'Afaka manolotra ny hetsiny ho an’ny fiarahamonina ny fikambanana sy ny mpikarakara.',
  'L’agenda de référence pour trouver les événements malagasy en France : soirées, concerts, culture, sport, restaurants, associations et bonnes adresses de la diaspora malgache.':'Kalandrie ahitana ny hetsika malagasy eto Frantsa: fety, kaonseritra, kolontsaina, fanatanjahantena, trano fisakafoanana, fikambanana ary adiresy mahasoa ho an’ny diaspora.',
  'Guide France':'Torolalana Frantsa','Gastronomie malagasy':'Sakafo malagasy','Restaurants, traiteurs et food trucks de la communauté —':'Trano fisakafoanana, mpahandro ary food truck ao amin’ny fiarahamonina —',
  'adresses':'adiresy','adresse sur la carte':'adiresy eo amin’ny sarintany','adresses sur la carte':'adiresy eo amin’ny sarintany','Type':'Karazana','Région':'Faritra',
  'Restaurants':'Trano fisakafoanana','Traiteurs':'Mpahandro','Food trucks':'Food truck','Guides':'Torolalana','Communautés':'Fiarahamonina','SUR LA CARTE':'EO AMIN’NY SARINTANY',
  'Professionnels & associations':'Matihanina sy fikambanana','La base des professionnels de la communauté malagasy en France —':'Ny lisitry ny matihanina ao amin’ny fiarahamonina malagasy eto Frantsa —',
  'structures recensées':'rafitra voatanisa','Ta structure manque ? Crée ton compte et réclame ta fiche !':'Tsy ao ve ny rafitrao? Mamoròna kaonty ary angataho ny pejinao!',
  'Églises malagasy':'Fiangonana malagasy','Paroisses et communautés chrétiennes malagasy en France':'Paroasy sy fiarahamonina kristianina malagasy eto Frantsa',
  'Sportifs malagasy':'Fanatanjahantena malagasy','Clubs, associations sportives et organisateurs de tournois de la communauté malagasy —':'Klioba, fikambanana ara-panatanjahantena ary mpikarakara fifaninanana malagasy —',
  'Boutiques & artisanat malagasy':'Fivarotana sy asa-tanana malagasy','Produits, épiceries et artisanat de Madagascar en France':'Vokatra, fivarotana sakafo ary asa-tanana avy any Madagasikara eto Frantsa',
  'référencé':'voatanisa','référencés':'voatanisa'
  ,'✓ Événements vérifiés':'✓ Hetsika voamarina','NOUVEAU':'VAOVAO','Billets':'Tapakila','Soirée':'Fety','Culture':'Kolontsaina','Sport':'Fanatanjahantena','Religion':'Fivavahana','Autre':'Hafa',
  'Événements passés':'Hetsika efa lasa','Proposer un event':'Hanolo-kevitra hetsika','À LA UNE':'ASONGADINA','encore':'sisa',
  'Réseaux sociaux officiels Malagasy Events':'Tambajotra ofisialin’ny Malagasy Events','Malagasy Events sur Facebook':'Malagasy Events ao amin’ny Facebook','Malagasy Events sur Instagram':'Malagasy Events ao amin’ny Instagram','Liens utiles Malagasy Events':'Rohy mahasoa Malagasy Events'
})
const UI_TEXT_ORIGINS = new WeakMap()
const translateControlledText = (value, language) => {
  if (!value || language==="fr") return value
  const dictionary = CONTROLLED_UI_TRANSLATIONS[language]||{}
  const leading = value.match(/^(\s*)/)?.[0]||""
  const trailing = value.match(/(\s*)$/)?.[0]||""
  const core = value.trim()
  if (dictionary[core]) return leading + dictionary[core] + trailing
  const emoji = core.match(/^((?:[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F\u200D]+\s*)+)(.+)$/u)
  return emoji && dictionary[emoji[2]] ? leading + emoji[1] + dictionary[emoji[2]] + trailing : value
}
const translateFixedInterface = (root, language) => {
  if (!root) return
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node
  while ((node=walker.nextNode())) {
    if (node.parentElement?.closest('[data-no-translate="true"]')) continue
    let state=UI_TEXT_ORIGINS.get(node)
    if (!state) state={original:node.nodeValue,lastApplied:node.nodeValue}
    else if (node.nodeValue!==state.lastApplied) state.original=node.nodeValue
    const next = translateControlledText(state.original,language)
    if (node.nodeValue!==next) node.nodeValue = next
    state.lastApplied=next
    UI_TEXT_ORIGINS.set(node,state)
  }
  root.querySelectorAll?.('[placeholder],[title],[aria-label]').forEach(el=>{
    ;['placeholder','title','aria-label'].forEach(attr=>{
      if (!el.hasAttribute(attr)) return
      const key = `i18nOriginal${attr.replace(/-([a-z])/g,(_,c)=>c.toUpperCase()).replace(/^./,c=>c.toUpperCase())}`
      if (!el.dataset[key]) el.dataset[key]=el.getAttribute(attr)
      const next = translateControlledText(el.dataset[key],language)
      if (el.getAttribute(attr)!==next) el.setAttribute(attr,next)
    })
  })
}
// Avatar réutilisable : affiche la vraie photo si dispo, sinon l'initiale
function Avatar({ url, name, size=40, bg, fontSize }) {
  const letter = (name||"?")[0].toUpperCase()
  return (
    <div style={{width:size,height:size,borderRadius:"50%",background:bg||"#C8102E",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0}}>
      {url ? <img src={url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <span style={{color:"#fff",fontWeight:800,fontSize:fontSize||Math.round(size*0.42)}}>{letter}</span>}
    </div>
  )
}
// Sécurité : n'autorise que http(s) et mailto/tel — bloque javascript:, data:, etc.
// (protège contre un lien piégé mis par un organisateur/établissement dans sa fiche)
const safeUrl = u => {
  if (!u) return ""
  const s = String(u).trim()
  if (/^(https?:|mailto:|tel:)/i.test(s)) return s
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return "" // schéma non autorisé → neutralisé
  return "https://" + s // sans schéma → on force https
}
// Le bouton Billets ne devient actif que pour une vraie plateforme de
// billetterie reconnue. Les pages Facebook, articles, URL raccourcies ou
// simples pages d'information conservent l'interface « arrive bientôt ».
const VERIFIED_EVENT_TICKETS = [
  "https://www.billetweb.fr/midnight-bus",
  "https://www.helloasso.com/associations/association-la-petite-mandarine/evenements/hajazz-13-aout-grange-rouge",
  "https://www.helloasso.com/associations/cen-comite-executif-national/evenements/soiree-c-est-parti",
  "https://mage4.ivenco.net/concert-paris",
  "https://www.helloasso.com/associations/fpma-stk/evenements/inscription-evenement-filles-du-roi",
  "https://www.helloasso.com/associations/isla-primera/evenements/tongasoa-festival-lyon",
  "https://www.helloasso.com/associations/association-zazakely-pour-les-enfants-d-ambodivondava-alasora/evenements/10-eme-nuit-malgache",
  "https://www.helloasso.com/associations/hetsika-accueil-arts-et-culture-de-madagascar/evenements/revy-mahaleo",
  "https://www.helloasso.com/associations/gasy-de-l-ile/evenements/revy-mahaleo-tournee-europeenne-2026-metropole-lilloise",
  "https://www.helloasso.com/associations/lacim/evenements/amy-et-andy-en-duo-pop-rock-et-folk-concert-solidaire-lacim-madagascar",
  "https://www.helloasso.com/associations/association-masova-madagascar-solidarite-volontariat-et-action/evenements/tournoi-de-la-solidarite-2026-collaboration-masova-csm",
  "https://www.helloasso.com/associations/sehatra-ba-gasy-france/evenements/paris-tana-paris-sbgf",
  "https://my.weezevent.com/jeunesse-doree",
]
const isVerifiedTicketUrl = value => {
  const url = safeUrl(value)
  if (!url) return false
  try {
    const normalized = new URL(url)
    normalized.hash = ""
    normalized.search = ""
    return VERIFIED_EVENT_TICKETS.includes(normalized.toString().replace(/\/$/,""))
  } catch {
    return false
  }
}

const isObviousInformationSource = value => {
  const url=safeUrl(value)
  if(!url)return false
  try {
    const host=new URL(url).hostname.replace(/^www\./,'').toLowerCase()
    return ['facebook.com','m.facebook.com','instagram.com','madatsara.com'].some(domain=>host===domain||host.endsWith('.'+domain))
  } catch { return false }
}
const eventOfficialSourceUrl = event => safeUrl(event?.official_source_url||event?.officialSourceUrl||(isObviousInformationSource(event?.ticketUrl)?event.ticketUrl:''))
const eventUpdatesUrl = event => safeUrl(event?.updates_url||event?.updatesUrl||'')
const eventTicketUrl = event => isObviousInformationSource(event?.ticketUrl)?'':safeUrl(event?.ticketUrl)
const sourceHost = value => {
  try { return new URL(safeUrl(value)).hostname.replace(/^www\./,'') } catch { return 'source officielle' }
}
const safeHexColor = c => /^#[0-9a-f]{6}$/i.test(String(c||'')) ? c : ''
const slugify = t => String(t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")
const normalizedOrgaName = value => slugify(value).replace(/-/g," ").trim()
const ORGA_NAME_ALIASES = {
  "rns": "rns rencontre nationale sportive",
  "rns cen": "rns rencontre nationale sportive",
  "collectif sport malagasy": "collectif sport malagasy csm",
  "csm": "collectif sport malagasy csm",
  "revy revy vacances": "revy revy vacances angle 360",
  "dmf": "dj malagasy de france dmf",
  "beb s": "beb s sakafo",
}
const canonicalOrgaName = value => {
  const normalized = normalizedOrgaName(value)
  return ORGA_NAME_ALIASES[normalized]||normalized
}
const eventBelongsToOrga = (event, orga) => {
  if (!event || !orga) return false
  if (event.orga_id != null && String(event.orga_id)===String(orga.id)) return true
  const eventName=canonicalOrgaName(event.organizer)
  const orgaName=canonicalOrgaName(orga.name)
  return !!eventName && eventName===orgaName
}
const resolveEventOrganizer = (event, orgas=[]) => {
  if (!event) return null
  if (event.orga_id != null) {
    const byId = orgas.find(orga=>String(orga.id)===String(event.orga_id))
    if (byId) return byId
  }
  return orgas.find(orga=>eventBelongsToOrga(event,orga))||null
}
const organizerPublicContacts = source => ({
  site:safeUrl(source?.organizer_site||source?.site||""),
  fb:safeUrl(source?.organizer_facebook||source?.fb||""),
  insta:safeUrl(source?.organizer_instagram||source?.insta||""),
  contact:String(source?.organizer_contact||source?.contact||"").trim(),
})
const linkEventsToOrganizer = (events, organizerName, orgaId) => {
  const key = canonicalOrgaName(organizerName)
  if (!key || orgaId==null) return events
  return events.map(event=>canonicalOrgaName(event.organizer)===key?{...event,orga_id:orgaId}:event)
}
const ensureRepeatOrganizerProfile = async ({event, events=[], orgas=[], contacts={}, ownerId=null}) => {
  const organizerName=String(event?.organizer||"").trim()
  const key=canonicalOrgaName(organizerName)
  if (!key) return null

  const published=[...events]
  if (!published.some(item=>String(item.id)===String(event.id))) published.push(event)
  const matching=published.filter(item=>canonicalOrgaName(item.organizer)===key)
  if (matching.length<2) return null

  const publicContacts=organizerPublicContacts(contacts)
  let organizer=resolveEventOrganizer(event,orgas)
  let created=false
  if (!organizer) {
    const payload={
      name:organizerName,
      type:"Organisateur",
      city:event.city||"France",
      region:"",
      followers:"",
      note:"Fiche créée automatiquement après la publication de deux événements sur Malagasy Events.",
      ...publicContacts,
      ...(ownerId?{owner_id:ownerId}:{}),
    }
    const {data,error}=await supabase.from('organisateurs').insert(payload).select().single()
    if (error) return {error,organizer:null,key}
    organizer=data; created=true
  } else {
    const patch={}
    for (const field of ["site","fb","insta","contact"]) {
      if (!organizer[field] && publicContacts[field]) patch[field]=publicContacts[field]
    }
    if (Object.keys(patch).length) {
      const {data}=await supabase.from('organisateurs').update(patch).eq('id',organizer.id).select().maybeSingle()
      if (data) organizer={...organizer,...data}
    }
  }

  const ids=matching.map(item=>item.id).filter(id=>/^\d+$/.test(String(id)))
  if (ids.length) await supabase.from('events').update({orga_id:organizer.id}).in('id',ids)
  return {organizer,created,key}
}
const normalizedUsername = value => String(value||"").trim().toLocaleLowerCase("fr-FR")
const normalizedDirectoryName = value => {
  const clean = String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .toLocaleLowerCase("fr-FR").replace(/['’`]/g,"").replace(/[^a-z0-9]+/g," ").trim()
  // Les variantes singulier/pluriel désignent ici la même marque officielle.
  return /^malagasy events?$/.test(clean) ? "malagasy events" : clean
}
const usernameAlreadyUsed = async (value, exceptId = null) => {
  const wanted = normalizedUsername(value)
  if (!wanted) return false
  const {data,error} = await supabase.from("profiles").select("id,username").limit(1000)
  if (error) return false // la règle unique de la base reste l'autorité finale
  return (data||[]).some(profile=>profile.id!==exceptId && normalizedUsername(profile.username)===wanted)
}
const fetchBlockedUserIds = async userId => {
  if (!userId) return []
  const {data} = await supabase.from("blocks").select("blocker_id,blocked_id")
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`)
  return [...new Set((data||[]).map(row=>row.blocker_id===userId?row.blocked_id:row.blocker_id))]
}
const dedupeByName = rows => {
  const merged = new Map()
  ;(rows||[]).forEach(row=>{
    const key=normalizedDirectoryName(row.name)
    if (!key) return
    const previous=merged.get(key)
    merged.set(key,previous
      ? {...row,...previous,fb:previous.fb||row.fb,insta:previous.insta||row.insta,site:previous.site||row.site,contact:previous.contact||row.contact,note:previous.note||row.note}
      : row)
  })
  return [...merged.values()]
}
const normalizeGastroRow = row => {
  const contact=String(row?.contact||"").trim()
  const contactIsUrl=/^(https?:\/\/|www\.)/i.test(contact)
  return {...row,site:safeUrl(row?.site||""),contact:contactIsUrl?"":contact}
}
const dedupeEvents = rows => {
  const merged = new Map()
  ;(rows||[]).forEach(row=>{
    const key=[normalizedDirectoryName(row.title),String(row.date||""),normalizedDirectoryName(row.location||row.city)].join("|")
    if (!normalizedDirectoryName(row.title)) return
    const previous=merged.get(key)
    merged.set(key,previous
      ? {...row,...previous,image:previous.image||row.image,ticketUrl:previous.ticketUrl||row.ticketUrl,official_source_url:previous.official_source_url||row.official_source_url,updates_url:previous.updates_url||row.updates_url,description:previous.description||row.description,mediaUrls:(previous.mediaUrls?.length?previous.mediaUrls:row.mediaUrls)||[]}
      : row)
  })
  return [...merged.values()]
}
const priceDisplay = price => {
  const value=String(price??'').trim()
  if (!value) return 'Prix non renseigné'
  if (/^gratuit$/i.test(value)) return 'Gratuit'
  return /^\d+(?:[,.]\d+)?$/.test(value) ? `€ ${value}` : value
}
function PriceInput({ value, onChange, style, placeholder='15' }) {
  return <div style={{position:'relative'}}><span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontWeight:900,color:'#555',pointerEvents:'none'}}>€</span><input value={value} onChange={e=>onChange(e.target.value)} inputMode="decimal" placeholder={placeholder} style={{...style,paddingLeft:30}}/></div>
}
function LocationAutocomplete({ value, onChange, onChoose, style, placeholder='Salle, adresse ou ville' }) {
  const [items,setItems]=useState([])
  const [loading,setLoading]=useState(false)
  const [open,setOpen]=useState(false)
  useEffect(()=>{
    const q=(value||'').trim()
    if(q.length<3){setItems([]);return}
    const timer=setTimeout(async()=>{
      setLoading(true)
      try {
        const r=await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=fr&q=${encodeURIComponent(q)}`)
        const data=await r.json()
        setItems(Array.isArray(data)?data:[]); setOpen(true)
      } catch { setItems([]) }
      setLoading(false)
    },350)
    return ()=>clearTimeout(timer)
  },[value])
  const choose=item=>{
    const a=item.address||{}
    const city=a.city||a.town||a.village||a.municipality||a.county||''
    onChoose?.({location:item.display_name, address:item.display_name, city, lat:Number(item.lat), lng:Number(item.lon)})
    setItems([]); setOpen(false)
  }
  return <div style={{position:'relative'}}><input value={value} onChange={e=>{onChange(e.target.value);setOpen(true)}} onFocus={()=>items.length&&setOpen(true)} placeholder={placeholder} style={style}/>{loading&&<span style={{position:'absolute',right:10,top:11,fontSize:11,color:'#888'}}>Recherche…</span>}{open&&items.length>0&&<div style={{position:'absolute',zIndex:20,top:'calc(100% + 4px)',left:0,right:0,background:WHITE,border:'1px solid #ddd',borderRadius:10,boxShadow:'0 8px 20px rgba(0,0,0,.14)',overflow:'hidden',maxHeight:220,overflowY:'auto'}}>{items.map(item=><button type="button" key={item.place_id} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(item)} style={{display:'block',width:'100%',textAlign:'left',padding:'10px 12px',background:WHITE,border:'none',borderBottom:'1px solid #f1f1f1',cursor:'pointer',fontSize:12.5,color:'#333'}}>📍 {item.display_name}</button>)}</div>}</div>
}
// Upload d'image r\u00e9utilisable (photos import\u00e9es \u2192 stockage Supabase, pas de liens)
async function uploadImage(file, userId, folder="divers") {
  if (!file) return {error:"no file"}
  if (!userId) { const {data}=await supabase.auth.getUser(); userId=data?.user?.id }
  if (!userId) return {error:"Connecte-toi pour importer une image."}
  if (file.size > 5*1024*1024) return {error:"Image trop lourde (max 5 Mo)."}
  if (!file.type.startsWith("image/")) return {error:"Choisis une image."}
  const ext = (file.name.split(".").pop()||"jpg").toLowerCase()
  const path = `${userId}/${folder}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('avatars').upload(path, file, {upsert:true, cacheControl:"3600"})
  if (error) return {error:error.message}
  return { url: supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl }
}
// Logo organisateur : compression locale pour éviter les blocages de stockage mobile.
async function imageFileToCompactDataUrl(file, maxSide=640) {
  if (!file) return {error:'Choisis une image.'}
  if (!file.type.startsWith('image/')) return {error:'Choisis une image.'}
  if (file.size > 8*1024*1024) return {error:'Image trop lourde (max 8 Mo).'}
  return new Promise(resolve=>{
    const reader = new FileReader()
    reader.onerror = ()=>resolve({error:"Impossible de lire cette image."})
    reader.onload = () => {
      const image = new Image()
      image.onerror = ()=>resolve({error:"Cette image n'est pas utilisable."})
      image.onload = () => {
        const ratio = Math.min(1,maxSide/Math.max(image.width,image.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1,Math.round(image.width*ratio)); canvas.height = Math.max(1,Math.round(image.height*ratio))
        canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height)
        const url = canvas.toDataURL('image/jpeg',0.82)
        if (url.length > 1100000) resolve({error:"Image encore trop grande. Choisis une photo plus légère."})
        else resolve({url})
      }
      image.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}
const PAGE_PATHS = {home:"/", aftermovies:"/after-movies", gastro:"/gastronomie", orgas:"/organisateurs", sportifs:"/sportifs", tournaments:"/tournois", pro:"/pro", premium:"/premium", offers:"/offres", eglises:"/eglises", boutiques:"/boutiques", artisanat:"/artisanat", diaspora:"/diaspora-malgache-france", guide:"/guide-france", about:"/a-propos", contact:"/contact", faq:"/faq", community:"/communaute", classifieds:"/petites-annonces", notifications:"/notifications", legal:"/mentions-legales", cgu:"/cgu", privacy:"/confidentialite", cookies:"/cookies", moderation:"/moderation", ranking:"/referencement", rights:"/mes-droits"}
const PAGE_META = {
  home:       ["Malagasy Events | Agenda des événements malgaches en France","L’agenda gasy en France : événements malagasy, soirées, concerts, sorties, sport, restaurants et associations de la diaspora malgache."],
  aftermovies:["After-movies & vidéos — Malagasy Events","Revivez les événements malagasy de France en vidéo : after-movies, teasers et portraits de la communauté."],
  gastro:     ["Restaurants & traiteurs malgaches en France — Malagasy Events","L'annuaire de la gastronomie malagasy en France : restaurants, traiteurs et food trucks, avec carte, adresses et contacts."],
  orgas:      ["Organisateurs & associations malagasy en France — Malagasy Events","Annuaire des associations sportives et culturelles, organisateurs de soirées, médias et groupes de la communauté malagasy en France."],
  sportifs:   ["Associations et clubs sportifs malagasy en France — Malagasy Events","Annuaire des clubs, associations sportives et organisateurs de tournois de la communauté malagasy en France."],
  tournaments:["Tournois et compétitions sportives malagasy en France — Malagasy Events","Calendriers, résultats, classements et équipes des tournois sportifs de la communauté malagasy en France."],
  eglises:    ["Églises malagasy en France — Malagasy Events","Annuaire des paroisses et communautés chrétiennes malagasy en France : FJKM, FLM, FPMA, catholiques. Paris, Meaux, Rennes, Orléans et plus."],
  boutiques:  ["Boutiques & épiceries malgaches en France — Malagasy Events","Où acheter des produits de Madagascar en France : épiceries, boutiques en ligne, vanille, épices et spécialités malgaches."],
  artisanat:  ["Artisanat malgache en France — Malagasy Events","Créateurs et boutiques d'artisanat malgache en France : raphia, vannerie, bijoux et objets faits main de Madagascar."],
  pro:        ["Offres Pro pour organisateurs & commerces malagasy — Malagasy Events","Boostez vos événements malagasy : mise en avant, rappels aux intéressés, calendrier intégrable et fiches premium pour restaurants et boutiques."],
  premium:    ["Membre Premium — avantages exclusifs dans la communauté malagasy","Devenez Membre Premium Malagasy Events : badge doré, réductions chez les restaurants et boutiques malgaches partenaires, accès prioritaire aux billets et tombolas exclusives."],
  offers:     ["Les offres Malagasy Events — Membres et organisateurs","Comparez l’offre Membre Premium et l’offre Organisateur de Malagasy Events."],
  diaspora:   ["Rejoindre la communauté malagasy en France | Malagasy Events","Rejoignez les groupes publics Malagasy Events sur WhatsApp ou demandez l’accès au réseau professionnel de la diaspora malagasy en France."],
  guide:      ["Guide pratique : arriver, étudier et travailler en France — Malagasy Events","Démarches officielles pour les étudiants et professionnels arrivant en France, recherche d’emploi et accès au droit des étrangers."],
  about:      ["À propos de Malagasy Events — L’agenda de la diaspora","Découvrez la mission de Malagasy Events : rendre visibles les événements, associations et bonnes adresses de la communauté malagasy en France."],
  contact:    ["Contacter Malagasy Events — Événements et partenariats","Proposez un événement, référencez une structure ou préparez un partenariat avec Malagasy Events en France."],
  faq:        ["FAQ Malagasy Events — Questions fréquentes","Réponses aux questions sur l’agenda, la publication d’événements, les associations, restaurants et services de Malagasy Events."],
  community:  ["Communauté & entraide — Malagasy Events","Covoiturage et hébergement pour les événements malagasy, discussions et membres de la communauté malagasy de France."],
  classifieds:["Petites annonces de la communauté malagasy — Malagasy Events","Cours, services, logement, covoiturage, vente, don et entraide entre membres de la communauté malagasy en France."],
  notifications:["Notifications — Malagasy Events","Vos messages, abonnements et actualités de la communauté Malagasy Events."],
  legal:      ["Mentions légales — Malagasy Events","Éditeur, hébergeurs, propriété intellectuelle et contact légal de Malagasy Events."],
  cgu:        ["Conditions générales d’utilisation — Malagasy Events","Règles d’utilisation, de publication et de modération de Malagasy Events."],
  privacy:    ["Politique de confidentialité — Malagasy Events","Traitement des données personnelles et droits RGPD sur Malagasy Events."],
  cookies:    ["Cookies et traceurs — Malagasy Events","Informations sur les traceurs strictement nécessaires et la mesure d’audience."],
  moderation: ["Modération et signalement — Malagasy Events","Règles de publication, procédure de signalement et traitement des réclamations."],
  ranking:    ["Référencement et classement — Malagasy Events","Règles de référencement, déréférencement, classement et mises en avant payantes."],
  rights:     ["Exercer mes droits — Malagasy Events","Demander l’accès, la rectification, l’opposition, la portabilité ou l’effacement de données personnelles."],
}
const setMeta = (title, desc, { image = SITE_URL + "/og-image.png", index = true } = {}) => {
  document.title = title
  const ensure = (sel, create) => { let el = document.querySelector(sel); if (!el) { el = create(); document.head.appendChild(el) } return el }
  ensure('meta[name="description"]', ()=>{ const m=document.createElement("meta"); m.name="description"; return m }).content = desc
  ensure('meta[name="robots"]', ()=>{ const m=document.createElement("meta"); m.name="robots"; return m }).content = index
    ? "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
    : "noindex, nofollow"
  const canonical = SITE_URL + window.location.pathname
  const set = (sel, attr, value, create) => { const el=ensure(sel,create); el.setAttribute(attr,value) }
  set('meta[property="og:title"]',"content",title,()=>{const m=document.createElement("meta");m.setAttribute("property","og:title");return m})
  set('meta[property="og:description"]',"content",desc,()=>{const m=document.createElement("meta");m.setAttribute("property","og:description");return m})
  set('meta[property="og:url"]',"content",canonical,()=>{const m=document.createElement("meta");m.setAttribute("property","og:url");return m})
  set('meta[property="og:image"]',"content",image,()=>{const m=document.createElement("meta");m.setAttribute("property","og:image");return m})
  set('meta[name="twitter:title"]',"content",title,()=>{const m=document.createElement("meta");m.name="twitter:title";return m})
  set('meta[name="twitter:description"]',"content",desc,()=>{const m=document.createElement("meta");m.name="twitter:description";return m})
  set('meta[name="twitter:image"]',"content",image,()=>{const m=document.createElement("meta");m.name="twitter:image";return m})
  ensure('link[rel="canonical"]', ()=>{ const l=document.createElement("link"); l.rel="canonical"; return l }).href = canonical
}
const setJsonLd = (id, data) => {
  let el = document.getElementById(id)
  if (!data) { if (el) el.remove(); return }
  if (!el) { el = document.createElement("script"); el.type = "application/ld+json"; el.id = id; document.head.appendChild(el) }
  el.textContent = JSON.stringify(data)
}

// Mesure d'audience interne, sans cookie publicitaire, identité, e-mail ou adresse IP enregistrée dans l'application.
const audienceOptedOut = () => { try { return localStorage.getItem('mev_audience_optout')==='true' } catch { return false } }
const trackingSession = (()=>{
  try { if(audienceOptedOut())return null;let id=sessionStorage.getItem('mev_tracking_session'); if(!id){id=crypto.randomUUID();sessionStorage.setItem('mev_tracking_session',id)} return id } catch { return null }
})()
const trackingVisitor = (()=>{
  try {
    if(audienceOptedOut())return null
    const key='mev_tracking_visitor',maxAge=13*30.4375*24*60*60*1000
    const raw=localStorage.getItem(key);let saved=null
    try{saved=raw?JSON.parse(raw):null}catch{saved=raw?{id:raw,createdAt:Date.now()}:null}
    if(!saved?.id||!saved.createdAt||Date.now()-saved.createdAt>=maxAge){saved={id:crypto.randomUUID(),createdAt:Date.now()};localStorage.setItem(key,JSON.stringify(saved))}
    else if(raw&&!raw.trim().startsWith('{'))localStorage.setItem(key,JSON.stringify(saved))
    return saved.id
  } catch { return null }
})()
const trackingDevice = () => {
  const ua=navigator.userAgent
  return {
    device:/iPad|Tablet/i.test(ua)?'tablet':/Android|iPhone|Mobile/i.test(ua)?'mobile':'desktop',
    browser:/Edg\//.test(ua)?'Edge':/Firefox\//.test(ua)?'Firefox':/CriOS|Chrome\//.test(ua)?'Chrome':/Safari\//.test(ua)?'Safari':'Autre',
    os:/iPhone|iPad/.test(ua)?'iOS':/Android/.test(ua)?'Android':/Windows/.test(ua)?'Windows':/Mac OS/.test(ua)?'macOS':/Linux/.test(ua)?'Linux':'Autre',
  }
}
const readCampaign = () => {
  const p=new URLSearchParams(window.location.search)
  let source=(p.get('utm_source')||'').toLowerCase(), medium=p.get('utm_medium')||'', campaign=p.get('utm_campaign')||'', content=p.get('utm_content')||''
  if(!source){ try { const host=new URL(document.referrer).hostname.toLowerCase(); source=host.includes('instagram')?'instagram':host.includes('facebook')||host.includes('fb.')?'facebook':host?host.replace(/^www\./,''):'direct'; medium=source==='direct'?'none':'referral' } catch { source='direct';medium='none' } }
  return {source:source.slice(0,80),medium:medium.slice(0,80),campaign:campaign.slice(0,120),content:content.slice(0,120)}
}
const campaignContext = readCampaign()
const isLocalPreview = () => ['localhost','127.0.0.1','::1'].includes(window.location.hostname)
const trackVisitEvent = (eventName, extra={}) => {
  // Une prévisualisation locale ne doit jamais polluer les statistiques de production.
  if(isLocalPreview()||audienceOptedOut()||!trackingSession||!trackingVisitor)return
  const payload={event_name:eventName,page_path:window.location.pathname.slice(0,500),session_id:trackingSession,visitor_id:trackingVisitor,...trackingDevice(),...campaignContext,...extra}
  supabase.from('analytics_events').insert(payload).then(({error})=>{
    // Compatibilité pendant la courte période précédant l'ajout des nouvelles colonnes.
    if(error&&/visitor_id|device|browser|os|schema cache|column/i.test(error.message||'')){
      const {visitor_id,device,browser,os,...legacyPayload}=payload
      supabase.from('analytics_events').insert(legacyPayload).then(()=>{}).catch(()=>{})
    }
  }).catch(()=>{})
}
const eventJsonLd = e => ({
  "@type":"Event", name:e.title, startDate:e.date,
  eventAttendanceMode:"https://schema.org/OfflineEventAttendanceMode",
  eventStatus:"https://schema.org/EventScheduled",
  location:{"@type":"Place", name:e.location||e.city, address:{"@type":"PostalAddress", streetAddress:e.address||e.location, addressLocality:e.city, addressCountry:"FR"}},
  ...(e.image?{image:[e.image.startsWith("http")?e.image:SITE_URL+e.image]}:{}),
  description:e.description||e.title,
  organizer:{"@type":"Organization", name:e.organizer||"Malagasy Events"},
  ...(isVerifiedTicketUrl(eventTicketUrl(e))?{offers:{"@type":"Offer", url:eventTicketUrl(e), availability:"https://schema.org/InStock"}}:{}),
  url: SITE_URL + "/evenement/" + slugify(e.title),
})

const adminSave = async promise => {
  const {data,error} = await promise
  if (error) { alert("⚠️ Changement local seulement — non sauvegardé en base (" + error.message + ").\nConnecte-toi avec le compte officiel Malagasy_events_admin pour que ce soit permanent."); return null }
  return data
}

const fetchAnalyticsRows = async (since, maxRows=50000) => {
  const pageSize=1000, rows=[]
  for (let from=0;from<maxRows;from+=pageSize) {
    const {data,error}=await supabase.from('analytics_events').select('*').gte('created_at',since).order('created_at',{ascending:false}).range(from,from+pageSize-1)
    if (error) return {data:rows,error,truncated:false}
    rows.push(...(data||[]))
    if (!data||data.length<pageSize) return {data:rows,error:null,truncated:false}
  }
  return {data:rows,error:null,truncated:true}
}

const AVATARS = [
  "https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Lova&backgroundColor=b6e3f4&backgroundType=solid",
  "https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Tiana&backgroundColor=c0aede&backgroundType=solid",
  "https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Niry&backgroundColor=d1f9c0&backgroundType=solid",
  "https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Hery&backgroundColor=ffd5dc&backgroundType=solid",
  "https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Vola&backgroundColor=ffdfbf&backgroundType=solid",
]

// Les dates d'événement "YYYY-MM-DD" sont des dates civiles françaises, pas des instants UTC.
// Les convertir explicitement en heure locale évite qu'un événement du jour apparaisse "Demain"
// entre minuit et 2 h en France.
const localCalendarDate = value => {
  const match = String(value||"").match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return match ? new Date(Number(match[1]),Number(match[2])-1,Number(match[3])) : new Date(value)
}
const localToday = () => {
  const now = new Date()
  return new Date(now.getFullYear(),now.getMonth(),now.getDate())
}
const isPast = d => localCalendarDate(d) < localToday()

const countdown = dateStr => {
  const diff = Math.round((localCalendarDate(dateStr) - localToday()) / 86400000)
  if (diff < 0) return null
  if (diff === 0) return { text:"AUJOURD’HUI 🔥", hot:true, today:true }
  if (diff === 1) return { text:"Demain 🔥", hot:true }
  if (diff <= 3)  return { text:`J-${diff} 🔥`, hot:true }
  if (diff <= 7)  return { text:`J-${diff} ⚡`, hot:false }
  if (diff <= 30) return { text:`J-${diff}`, hot:false }
  return null
}

const isNew = c => c && Date.now() - new Date(c) < 14*86400000
const featuredRemaining = until => {
  const ms = new Date(until||0).getTime() - Date.now()
  if (ms <= 0) return null
  const hours = Math.ceil(ms / 3600000)
  return hours >= 48 ? `${Math.ceil(hours/24)} jours` : `${hours} h`
}
const postPromotionRemaining = until => {
  const ms = new Date(until||0).getTime() - Date.now()
  if (ms <= 0) return null
  const hours = Math.ceil(ms / 3600000)
  return hours >= 24 ? `${Math.ceil(hours/24)} j` : `${hours} h`
}
const interfaceLocale = () => ({fr:'fr-FR',en:'en-GB',mg:'mg-MG'})[localStorage.getItem('mev_language')||'fr']||'fr-FR'
const fmtDate = d => localCalendarDate(d).toLocaleDateString(interfaceLocale(),{weekday:'long',day:'numeric',month:'long',year:'numeric'})
const fmtShort = d => localCalendarDate(d).toLocaleDateString(interfaceLocale(),{day:'numeric',month:'short',year:'numeric'})
const ago = d => {
  const m = Math.floor((Date.now()-new Date(d))/60000)
  if (m<1) return "à l'instant"
  if (m<60) return `il y a ${m}min`
  if (m<1440) return `il y a ${Math.floor(m/60)}h`
  return `il y a ${Math.floor(m/1440)}j`
}

const downloadICS = ev => {
  const d = ev.date.replace(/-/g,'')
  const ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DATE:${d}\r\nDTEND;VALUE=DATE:${d}\r\nSUMMARY:${ev.title}\r\nLOCATION:${ev.location}\r\nDESCRIPTION:${(ev.description||'').replace(/\n/g,'\\n')}\r\nEND:VEVENT\r\nEND:VCALENDAR`
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([ics],{type:'text/calendar'}))
  a.download = `${ev.title.replace(/\s+/g,'_')}.ics`; a.click()
}

const doShare = (ev, platform, setCopied) => {
  const url  = `${SITE_URL}/evenement/${slugify(ev.title)}`
  const text = `🇲🇬 ${ev.title}\n📅 ${fmtShort(ev.date)} | 📍 ${ev.location}\n\n${url}`
  if (platform==='whatsapp')  { window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,'_blank'); return }
  if (platform==='facebook')  { window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,'_blank'); return }
  navigator.clipboard.writeText(text).then(()=>{ if(setCopied) setCopied(platform) })
}

function useIsMobile(bp=768) {
  const [m,setM] = useState(window.innerWidth<bp)
  useEffect(()=>{ const h=()=>setM(window.innerWidth<bp); window.addEventListener('resize',h); return()=>window.removeEventListener('resize',h) },[bp])
  return m
}

const EMPTY_FORM = {title:'',date:'',location:'',city:'Paris',category:'Soirée',price:'',organizer:'',ticketUrl:'',official_source_url:'',updates_url:'',image:'',description:'',mediaUrls:[],createdAt:new Date().toISOString()}

const initialEvents = [
  {id:1,title:"Soirée Malagasy Paris",date:"2026-07-12",location:"Paris 11ème",city:"Paris",category:"Soirée",image:"/posters/soiree-malagasy-paris.svg",price:"15€",organizer:"Mafana Vibes",ticketUrl:"https://helloasso.com",description:"Une soirée inoubliable au cœur de Paris pour célébrer la culture malagasy. DJ, danses traditionnelles, cocktails et ambiance chaleureuse garantis !",mediaUrls:[],createdAt:new Date().toISOString()},
  {id:2,title:"Hira Gasy Île-de-France",date:"2026-07-20",location:"Créteil",city:"Paris",category:"Culture",image:"https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400",price:"10€",organizer:"Association Soa",ticketUrl:"",description:"Le Hira Gasy est l'art oratoire traditionnel de Madagascar. Venez découvrir chants, poésies et sagesses ancestrales portés par des artistes passionnés.",mediaUrls:[],createdAt:new Date().toISOString()},
  {id:3,title:"Repas Communautaire Malagasy",date:"2025-03-10",location:"Lyon",city:"Lyon",category:"Gastronomie",image:"https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400",price:"Gratuit",organizer:"Malagasy Lyon",ticketUrl:"",description:"Retrouvez la communauté malagasy de Lyon autour de plats traditionnels : romazava, ravitoto, lasopy... Un moment de partage et de convivialité.",mediaUrls:["https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400","https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400"],createdAt:"2025-03-01T00:00:00.000Z"},
  {id:4,title:"Princio & Njara Marcel — Revy Revy Vacances",date:"2026-07-18",location:"Florida Palace",city:"Marseille",category:"Soirée",image:"https://madatsara.com/uploads/medias/image-6a4c8d808767b.jpg",price:"30€ prévente / 35€ sur place",organizer:"Revy Revy Vacances",ticketUrl:"https://www.facebook.com/photo/?fbid=122106136563370277&set=pcb.122106136827370277",description:"Princio et Njara Marcel en live au Florida Palace de Marseille ! Revy Revy Vacances — ambiance gasy garantie. À partir de 21h.",mediaUrls:[],createdAt:new Date().toISOString()},
  {id:5,title:"Que Calor — 206 Vibes, Kosmo, Midnight 261, Falfa",date:"2026-07-24",location:"Que Calor Paris",city:"Paris",category:"Soirée",image:"/posters/que-calor.svg",price:"",organizer:"Que Calor Paris",ticketUrl:"",description:"Soirée Que Calor à Paris avec 206 Vibes, Kosmo, Midnight 261 et Falfa aux platines. Horaire à confirmer — suivez l'Instagram de Que Calor Paris.",mediaUrls:[],createdAt:new Date().toISOString()},
  {id:6,title:"Princio & Njara Marcel — Revy Revy Vacances",date:"2026-07-24",location:"Salle climatisée Xeraco",city:"Toulouse",category:"Soirée",image:"/posters/revy-toulouse.svg",price:"",organizer:"Revy Revy Vacances",ticketUrl:"",description:"Princio et Njara Marcel en live à Toulouse, salle climatisée Xeraco. Revy Revy Vacances — à partir de 21h.",mediaUrls:[],createdAt:new Date().toISOString()},
  {id:7,title:"Princio & Njara Marcel — Samedi joli faradoboka",date:"2026-07-25",location:"Sport Indoor, 8 av. de Scandinavie, Les Ulis (91)",city:"Paris",category:"Soirée",image:"https://madatsara.com/uploads/medias/image-6a4c8d40a13da.jpg",price:"30€ prévente / 35€ sur place",organizer:"Revy Revy Vacances",ticketUrl:"https://urls.fr/u2coVC",description:"Princio et Njara Marcel en live aux Ulis pour clôturer la tournée Revy Revy Vacances en Île-de-France. À partir de 21h.",mediaUrls:[],createdAt:new Date().toISOString()},
  {id:8,title:"Dîner solidaire malgache — Bodo & Fenoamby",date:"2026-07-11",location:"Espace Dan Ar Braz, Quimper",city:"Quimper",category:"Gastronomie",image:"https://madatsara.com/uploads/medias/image-69ebc57377ff6.jpg",price:"25€ / 15€ enfant",organizer:"Une Ruche Un Enfant",ticketUrl:"https://madatsara.com/evenement_diner-solidaire-malgache-avec-bodo-fenoamby-espace-dan-ar-braz-quimper.html",description:"Dîner solidaire malgache animé par Bodo, Fenoamby et DJ Colonel à Quimper, dès 19h30. Au profit de l'installation d'un forage à Andranomaintso. 20€ à emporter, tombola sur place.",mediaUrls:[],createdAt:new Date().toISOString()},
  {id:9,title:"Nono — Grand spectacle d'été (1ère édition)",date:"2026-07-13",location:"Domaine de la Beauvoisière, Avrainville (91)",city:"Paris",category:"Soirée",image:"https://madatsara.com/uploads/medias/image-6a28834de4129.jpg",price:"",organizer:"Mada Mifety",ticketUrl:"https://madatsara.com/evenement_nonoh-grand-spectacle-dete-1ere-edition-domaine-de-beauvoisiere-avrainville.html",description:"Mada Mifety présente Nono pour la 1ère édition du Grand spectacle d'été au Domaine de la Beauvoisière (Avrainville, 91). Début 21h30, after ambiance DJ rétro, tombola Paris–Tana–Paris.",mediaUrls:[],createdAt:new Date().toISOString()},
  {id:10,title:"Hajazz en cabaret",date:"2026-08-13",location:"La Grande Rouge, La Chapelle-Naude (71)",city:"La Chapelle-Naude",category:"Soirée",image:"https://madatsara.com/uploads/medias/image-6a4fe73f740d4.jpg",price:"0 à 10 €",organizer:"Association La Petite Mandarine",ticketUrl:"https://www.helloasso.com/associations/association-la-petite-mandarine/evenements/hajazz-13-aout-grange-rouge",description:"Hajazz en solo à La Grande Rouge (Saône-et-Loire). Buvette et restauration dès 18h, concert à 20h puis jam session avec les musiciens de la région.",mediaUrls:[],createdAt:new Date().toISOString()},
  {id:11,title:"Shao Boana en showcase",date:"2026-08-15",location:"La Lagune, base de loisirs, Jonzac (17)",city:"Jonzac",category:"Soirée",image:"https://madatsara.com/uploads/medias/Shao-Boana-Showcase-La-Lagune-base-de-loisirs-Jonzac-69bab805a4d96.jpg",price:"",organizer:"La Lagune",ticketUrl:"https://madatsara.com/evenement_shao-boana-showcase-la-lagune-base-de-loisirs-jonzac.html",description:"Shao Boana « Madagascar Vibes » en sound system à La Lagune de Jonzac (17). Roots reggae & dancehall riddims, dès 20h30.",mediaUrls:[],createdAt:new Date().toISOString()},
  {id:12,title:"Feo Gasy en concert",date:"2026-09-04",location:"Maison pour tous Melina Mercouri, Montpellier",city:"Montpellier",category:"Culture",image:"https://madatsara.com/uploads/medias/image-6a4d5ab6d0a00.jpg",price:"30€",organizer:"Maison pour tous Melina Mercouri",ticketUrl:"https://madatsara.com/evenement_feo-gasy-en-concert-maison-pour-tous-melina-mercouri-montpellier.html",description:"Le groupe Feo Gasy en concert « Any indray andro… » à la Maison pour tous Melina Mercouri (64 route de Lavérune, Montpellier), vendredi 4 septembre à 20h30.",mediaUrls:[],createdAt:new Date().toISOString()},
  {id:9016,title:"Journée portes ouvertes & soirée C’est parti ! — RNS CEN",date:"2026-09-05",location:"Le Millénaire — Savigny-le-Temple",address:"3 place du 19-Mars-1962, 77176 Savigny-le-Temple",lat:48.5829635,lng:2.5759079,city:"Savigny-le-Temple",category:"Culture",image:"/posters/rns-journee-portes-ouvertes-2026.jpg",price:"25 € (soirée)",organizer:"RNS - CEN",orga_id:1,ticketUrl:"https://www.helloasso.com/associations/cen-comite-executif-national/evenements/soiree-c-est-parti",official_source_url:"https://www.rns-cen.com/journee-portes-ouvertes-le-5-septembre-2026/",updates_url:"https://www.instagram.com/rns_cen/",description:"UNE MÊME JOURNÉE, DEUX TEMPS AU MILLÉNAIRE. 1) De 14h à 17h45 : journée portes ouvertes de la RNS-CEN. Plénière de 14h à 15h15 ; ateliers de 15h15 à 17h autour des sports collectifs et individuels, de la culture, du village et des soirées, de la restauration et des exposants, du sponsoring et des ateliers transverses ; plénière de clôture de 17h à 17h45. 2) Le soir : soirée « C’est parti ! » dans la même salle, avec ouverture des portes à 20h30 puis Macadence Orchestre et Eley Gasy en live de 21h à 4h. La billetterie à 25 € concerne la soirée. Il ne s’agit pas de deux événements en double, mais de deux programmes successifs organisés le même jour par le CEN. Adresse : Le Millénaire, 3 place du 19-Mars-1962, 77176 Savigny-le-Temple, au sud-est de Paris, près de la gare RER D Savigny-le-Temple–Nandy.",mediaUrls:[],createdAt:new Date().toISOString()},
  {id:13,title:"Rija Ramanantoanina en concert",date:"2026-10-17",location:"Espace Magnan, 31 rue Louis-de-Coppet, 06000 Nice",address:"31 rue Louis-de-Coppet, 06000 Nice",city:"Nice",category:"Culture",image:"",price:"30 €",organizer:"Scènes du Sud",ticketUrl:"https://www.explorenicecotedazur.com/fete-manifestation/rija-ramanantoanina/",official_source_url:"https://www.explorenicecotedazur.com/fete-manifestation/rija-ramanantoanina/",description:"Rija Ramanantoanina présente son nouvel album « FY » en concert à l’Espace Magnan de Nice, samedi 17 octobre 2026 à 19 h 30. Adresse officielle : 31 rue Louis-de-Coppet, 06000 Nice. Tarif annoncé : 30 €.",mediaUrls:[],createdAt:new Date().toISOString()},
  {id:14,title:"Soirée d'intégration GS Lille 2026-2027",date:"2026-10-17",location:"Lille",city:"Lille",category:"Soirée",image:"",price:"",organizer:"Gasy Sport Lille",ticketUrl:"https://www.facebook.com/gslille",description:"📌 Date estimée — à confirmer par l'organisateur. La soirée de rentrée de l'association sportive et culturelle malgache de Lille, chaque mi-octobre (éditions 2023 et 2024 confirmées).",mediaUrls:[],createdAt:new Date().toISOString()},
  {id:15,title:"Tournoi de la Solidarité 2026 — CSM & MASOVA",date:"2026-10-24",location:"Complexe sportif Saint-Exupéry, Villebon-sur-Yvette (91)",city:"Villebon-sur-Yvette",category:"Sport",image:"",price:"Tarifs selon discipline",organizer:"Collectif Sport Malagasy",ticketUrl:"https://www.helloasso.com/associations/association-masova-madagascar-solidarite-volontariat-et-action/evenements/tournoi-de-la-solidarite-2026-collaboration-masova-csm",official_source_url:"https://www.helloasso.com/associations/association-masova-madagascar-solidarite-volontariat-et-action/evenements/tournoi-de-la-solidarite-2026-collaboration-masova-csm",description:"Troisième édition du Tournoi de la Solidarité, organisée par MASOVA avec le Collectif Sport Malagasy, les samedi 24 et dimanche 25 octobre 2026 au Complexe sportif Saint-Exupéry de Villebon-sur-Yvette. Disciplines annoncées : football, basket, volley, tennis de table, pétanque et initiation bachata. Les inscriptions se font auprès de l’organisateur sur HelloAsso.",mediaUrls:[],createdAt:new Date().toISOString()},
  {id:16,title:"Tournoi de Noël — Ligue Clichy Madagascar",date:"2026-11-28",location:"Clichy / Paris",city:"Paris",category:"Sport",image:"",price:"",organizer:"Ligue Clichy Madagascar",ticketUrl:"https://www.facebook.com/profile.php?id=100063642368550",description:"📌 Date estimée — à confirmer par l'organisateur. Le tournoi de basket de fin d'année de la ligue malgache de Clichy (édition 2025 : 29 nov et 28 déc).",mediaUrls:[],createdAt:new Date().toISOString()},
  {id:17,title:"Madadiaspora Foot — RNS",date:"2026-12-19",location:"Stade Robinson, Corbeil-Essonnes (91)",city:"Paris",category:"Sport",image:"",price:"",organizer:"RNS - CEN",ticketUrl:"https://www.facebook.com/rns.cen",description:"📌 Date estimée — à confirmer par l'organisateur. Le tournoi de foot d'hiver de la RNS au stade Robinson de Corbeil-Essonnes (édition 2025 : 20 déc).",mediaUrls:[],createdAt:new Date().toISOString()},
]

// Événements éditoriaux récents à afficher même avant leur synchronisation
// dans Supabase. Ils sont dédupliqués par titre + date lors du chargement.
const nextFridayDate = () => {
  const date = localToday()
  const daysUntilFriday = (5 - date.getDay() + 7) % 7
  date.setDate(date.getDate() + daysUntilFriday)
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`
}

const supplementalEvents = [
  {
    id:"jeunesse-doree-red-island-2026",
    title:"Jeunesse Dorée — Red Island",
    date:"2026-09-18",
    location:"Le 145, 145 route de Paris, 31140 Saint-Alban",
    address:"145 route de Paris, 31140 Saint-Alban",
    city:"Saint-Alban",
    category:"Soirée",
    image:"",
    price:"12 €",
    organizer:"Red Island",
    ticketUrl:"https://my.weezevent.com/jeunesse-doree",
    official_source_url:"https://my.weezevent.com/jeunesse-doree",
    updates_url:"https://www.instagram.com/redisland_261/",
    description:"Red Island présente la soirée « Jeunesse Dorée » le vendredi 18 septembre 2026, de 23 h à 5 h, au 145 à Saint-Alban, près de Toulouse. DJ Nawer et DJ Naud sont annoncés, avec des ambiances salegy, shatta, bouyon et amapiano. Billet : 12 € sur la billetterie Weezevent officielle. Informations et réservations organisateur : 07 68 54 66 45.",
    mediaUrls:[],createdAt:"2026-09-10T00:00:00.000Z",
  },
  {
    id:"mage-4-paris-le-millenaire-2026",
    title:"MAGE 4 à Paris — Le Millénaire",
    date:"2026-09-12",
    location:"Le Millénaire, 3 place du 19-Mars-1962, 77176 Savigny-le-Temple",
    address:"Le Millénaire, 3 place du 19-Mars-1962, 77176 Savigny-le-Temple",
    lat:48.5829635,
    lng:2.5759079,
    city:"Savigny-le-Temple",
    category:"Culture",
    image:"",
    price:"35 € prévente / 40 € sur place",
    organizer:"IVENCO",
    ticketUrl:"https://mage4.ivenco.net/concert-paris",
    official_source_url:"https://mage4.ivenco.net/concert-paris",
    updates_url:"https://www.instagram.com/gas_paname_sport/",
    description:"MAGE 4 revient en France après sept ans pour un concert au Millénaire de Savigny-le-Temple, samedi 12 septembre 2026. Ouverture des portes à 20 h 30 et début du concert à 21 h 30. L’organisateur annonce 500 places, un tarif de 35 € en prévente et 40 € sur place. Gaspaname annonce offrir 50 invitations gratuites : pour connaître les conditions et vérifier leur disponibilité, contactez directement Gaspaname en message privé. Cette opération est proposée par Gaspaname et non par Malagasy Events. Placement libre. Accès par le RER D, gare Savigny-le-Temple–Nandy, puis environ deux minutes à pied. Informations concert : 06 60 96 69 50 ou 06 49 51 51 88.",
    mediaUrls:[],
    createdAt:"2026-09-09T00:00:00.000Z",
  },
  {
    id:"mimosa-mada-sport-gournay-coupe-france-2026",
    title:"Coupe de France — Mimosa Mada-Sport vs FC Gournay 93",
    date:"2026-09-13",
    location:"Parc des sports Plaine Nord n°1, 94600 Choisy-le-Roi",
    address:"Parc des sports Plaine Nord n°1, 94600 Choisy-le-Roi",
    city:"Choisy-le-Roi",
    category:"Sport",
    image:"",
    price:"Tarif non communiqué",
    organizer:"Mimosa Mada-Sport",
    ticketUrl:"",
    official_source_url:"https://www.instagram.com/mimosa.madasport1/",
    updates_url:"https://www.instagram.com/mimosa.madasport1/",
    description:"Mimosa Mada-Sport reçoit le FC Gournay 93 pour le 3e tour de la Coupe de France Crédit Agricole, dimanche 13 septembre 2026 à 14 h 30. Rendez-vous au Parc des sports Plaine Nord n°1, 94600 Choisy-le-Roi. Les informations et éventuelles mises à jour sont publiées par Mimosa Mada-Sport sur son compte Instagram officiel.",
    mediaUrls:[],
    createdAt:"2026-09-08T00:00:00.000Z",
  },
  {
    id:"tana-paris-tana-sehatra-ba-gasy-2026",
    title:"Tana–Paris–Tana — théâtre musical",
    date:"2026-10-03",
    location:"Espace Maison Blanche, 2 avenue Saint-Exupéry, 92320 Châtillon",
    address:"Espace Maison Blanche, 2 avenue Saint-Exupéry, 92320 Châtillon",
    city:"Châtillon",
    category:"Culture",
    image:"/posters/tana-paris-tana-sehatra-ba-gasy-2026.jpg",
    price:"20 €",
    organizer:"Sehatra Ba Gasy France",
    ticketUrl:"https://www.helloasso.com/associations/sehatra-ba-gasy-france/evenements/paris-tana-paris-sbgf",
    official_source_url:"https://www.helloasso.com/associations/sehatra-ba-gasy-france/evenements/paris-tana-paris-sbgf",
    updates_url:"https://www.helloasso.com/associations/sehatra-ba-gasy-france/evenements/paris-tana-paris-sbgf",
    description:"Le groupe Sehatra Ba Gasy France présente « Tana–Paris–Tana », un théâtre musical consacré au patrimoine malgache, samedi 3 octobre 2026 à partir de 19 h à l’Espace Maison Blanche, 2 avenue Saint-Exupéry, 92320 Châtillon. Tarif unique : 20 €. Réservations : 06 03 82 72 28 ou 06 18 40 81 37. Un buffet de spécialités malgaches sera proposé sur place en supplément.",
    mediaUrls:[],
    createdAt:"2026-09-08T00:00:00.000Z",
  },
  {
    id:"midnight-open-air-aubergarden-2026",
    title:"MIDNIGHT Open Air — Only Tithy & Nawer",
    date:"2026-08-23",
    location:"Aubergarden, 210 avenue des Magasins Généraux, 93300 Aubervilliers",
    city:"Aubervilliers",
    category:"Soirée",
    image:"/posters/midnight-open-air-aubergarden.svg",
    price:"Billetterie à confirmer",
    organizer:"Midnight 261",
    ticketUrl:"",
    description:"MIDNIGHT revient pour clôturer l’été avec une édition Open Air à l’Aubergarden, dimanche 23 août 2026 de 18 h à minuit. Au programme : Afro, Amapiano, Shatta, Dancehall, Kompa, Zouk, Salegy, Gasy et plus encore, avec Only Tithy, Nawer et leurs invités. Le lien officiel de billetterie sera activé dès qu’il aura été vérifié.",
    mediaUrls:[],
    createdAt:"2026-08-13T00:00:00.000Z",
  },
  {
    id:"tournoi-petanque-firaisankina-no-hery-2026",
    title:"Tournoi annuel de pétanque — Firaisankina no Hery",
    date:"2026-08-15",
    location:"38 chaussée Jules César, 95520 Osny",
    city:"Osny",
    category:"Sport",
    image:"",
    price:"20 € par joueur",
    organizer:"Firaisankina no Hery",
    ticketUrl:"",
    description:"Tournoi annuel de pétanque en doublette, samedi 15 août 2026. Jet du but à 10 h. Inscription obligatoire à l’avance au 06 24 14 90 34. Doublette montée : 20 € par joueur. Repas inclus avec vary sy loaka et lasary offert. Rendez-vous au 38 chaussée Jules César, 95520 Osny, près de Cergy.",
    mediaUrls:[],
    createdAt:"2026-08-03T00:00:00.000Z",
  },
  {
    id:"alin-ny-feo-gasy-2026",
    title:"Alin’ny Feo Gasy — Jenny Fuhr, Feo Gasy, Levelo, Noely & Tarika Baobab",
    date:"2026-09-26",
    location:"Le Millénaire, Île-de-France",
    city:"Paris",
    category:"Culture",
    image:"",
    price:"",
    organizer:"Alin’ny Feo Gasy",
    ticketUrl:"",
    description:"Une grande soirée consacrée aux voix et à la musique malagasy avec Jenny Fuhr, Feo Gasy, Levelo, Noely et Tarika Baobab, samedi 26 septembre 2026 au Millénaire. Les horaires, tarifs et modalités de réservation seront ajoutés dès leur confirmation officielle.",
    mediaUrls:[],
    createdAt:"2026-07-28T00:00:00.000Z",
  },
  {
    id:"kosmo-back-to-school-infinity-club-2026",
    title:"KOSMO — Back to School",
    date:"2026-09-26",
    location:"Infinity Club, 94 rue d’Amsterdam, 75009 Paris",
    address:"94 rue d’Amsterdam, 75009 Paris",
    city:"Paris",
    category:"Soirée",
    image:"",
    price:"Tarif à confirmer",
    organizer:"KOSMO",
    ticketUrl:"",
    official_source_url:"https://www.instagram.com/kosmo.fr/",
    updates_url:"https://www.instagram.com/kosmo.fr/",
    description:"KOSMO présente sa soirée « Back to School » le samedi 26 septembre 2026 à l’Infinity Club, 94 rue d’Amsterdam, 75009 Paris. Ambiances annoncées : shatta, dancehall, salegy, bouyon et zouk. Line-up indiqué sur l’annonce : Tamy, Yoyo, Nawer et Yastonpêche. L’horaire, le tarif et la billetterie seront ajoutés dès leur confirmation par l’organisateur.",
    mediaUrls:[],
    createdAt:"2026-09-09T00:00:00.000Z",
  },
  {
    id:"conference-filles-du-roi-fpma-2026",
    title:"Conférence « Filles du Roi » — FPMA",
    date:"2026-09-12",
    location:"Église FPMA Paris Chauchat, 16 rue Chauchat, 75009 Paris",
    address:"16 rue Chauchat, 75009 Paris",
    city:"Paris",
    category:"Religion",
    image:"",
    price:"Prix libre — inscription obligatoire",
    organizer:"FPMA STK",
    ticketUrl:"https://www.helloasso.com/associations/fpma-stk/evenements/inscription-evenement-filles-du-roi",
    official_source_url:"https://www.helloasso.com/associations/fpma-stk/evenements/inscription-evenement-filles-du-roi",
    description:"Conférence organisée par la FPMA, la STK Nationale et la SVK Iraisana les samedi 12 et dimanche 13 septembre 2026. Ouverte aux femmes et aux hommes, elle propose des plénières, témoignages, ateliers et espaces de rencontre autour de l’identité de la femme comme enfant de Dieu. Samedi de 10 h à 20 h, dimanche de 10 h à 13 h. Participation libre, inscription obligatoire.",
    mediaUrls:[],createdAt:"2026-09-10T00:00:00.000Z",
  },
  {
    id:"tongasoa-festival-lyon-2026",
    title:"Tongasoa Festival Lyon",
    date:"2026-09-12",
    location:"Meyzieu Gare, Meyzieu (69)",
    city:"Meyzieu",
    category:"Culture",
    image:"",
    price:"12 € étudiant / 15 € plein",
    organizer:"Isla Primera",
    ticketUrl:"https://www.helloasso.com/associations/isla-primera/evenements/tongasoa-festival-lyon",
    official_source_url:"https://www.helloasso.com/associations/isla-primera/evenements/tongasoa-festival-lyon",
    description:"Festival culturel malagasy organisé du samedi 12 septembre à 11 h au dimanche 13 septembre 2026 à 4 h. Gastronomie, culture, danse, musique, artisanat, réseautage, accueil des étudiants, concert et soirée DJ sont annoncés par Isla Primera.",
    mediaUrls:[],createdAt:"2026-09-10T00:00:00.000Z",
  },
  {
    id:"10e-nuit-malgache-la-grande-motte-2026",
    title:"10e Nuit Malgache — repas, tombola et danse",
    date:"2026-10-10",
    location:"Salle de Haute Plage, La Grande-Motte",
    city:"La Grande-Motte",
    category:"Soirée",
    image:"",
    price:"40 € repas sur place",
    organizer:"Association Zazakely Ambodivondava-Alasora",
    ticketUrl:"https://www.helloasso.com/associations/association-zazakely-pour-les-enfants-d-ambodivondava-alasora/evenements/10-eme-nuit-malgache",
    official_source_url:"https://www.helloasso.com/associations/association-zazakely-pour-les-enfants-d-ambodivondava-alasora/evenements/10-eme-nuit-malgache",
    description:"Dixième Nuit Malgache le samedi 10 octobre 2026 à partir de 19 h : repas malgache, grande tombola et soirée dansante avec le groupe Sardi Sixties. Les recettes soutiennent les actions de l’association Zazakely pour les enfants d’Ambodivondava-Alasora.",
    mediaUrls:[],createdAt:"2026-09-10T00:00:00.000Z",
  },
  {
    id:"revy-mahaleo-nantes-2026",
    title:"Revy Mahaleo à Nantes — Dama & Bekoto",
    date:"2026-10-31",
    location:"Salon Mauduit, Nantes",
    city:"Nantes",
    category:"Culture",
    image:"",
    price:"35 € prévente",
    organizer:"HETSIKA",
    ticketUrl:"https://www.helloasso.com/associations/hetsika-accueil-arts-et-culture-de-madagascar/evenements/revy-mahaleo",
    official_source_url:"https://www.helloasso.com/associations/hetsika-accueil-arts-et-culture-de-madagascar/evenements/revy-mahaleo",
    description:"Concert exceptionnel de Mahaleo avec Dama et Bekoto, samedi 31 octobre 2026 de 20 h à 23 h au Salon Mauduit à Nantes. Restauration et librairie malgaches sur place dès 19 h. Prévente limitée à cinq billets par personne.",
    mediaUrls:[],createdAt:"2026-09-10T00:00:00.000Z",
  },
  {
    id:"revy-mahaleo-tourcoing-2026",
    title:"Revy Mahaleo — tournée européenne à Tourcoing",
    date:"2026-11-20",
    location:"Salle Georges Dael, Tourcoing",
    city:"Tourcoing",
    category:"Culture",
    image:"",
    price:"25 € early bird / 30 € plein / gratuit -15 ans",
    organizer:"Gasy de l’Île",
    ticketUrl:"https://www.helloasso.com/associations/gasy-de-l-ile/evenements/revy-mahaleo-tournee-europeenne-2026-metropole-lilloise",
    official_source_url:"https://www.helloasso.com/associations/gasy-de-l-ile/evenements/revy-mahaleo-tournee-europeenne-2026-metropole-lilloise",
    description:"Étape de la tournée européenne de Mahaleo avec Dama, Bekoto et les Taranaka, vendredi 20 novembre 2026. Ouverture des portes à 18 h 30, concert de 19 h 30 à 22 h 30. Sakafo et boissons proposés sur place.",
    mediaUrls:[],createdAt:"2026-09-10T00:00:00.000Z",
  },
  {
    id:"amy-andy-concert-solidaire-eveux-2026",
    title:"Amy & Andy — concert solidaire LACIM Madagascar",
    date:"2026-11-21",
    location:"Salle d’animation de la mairie, 52 rue de la Rencontre, 69210 Éveux",
    address:"52 rue de la Rencontre, 69210 Éveux",
    city:"Éveux",
    category:"Culture",
    image:"",
    price:"10 €",
    organizer:"LACIM — comité d’Éveux",
    ticketUrl:"https://www.helloasso.com/associations/lacim/evenements/amy-et-andy-en-duo-pop-rock-et-folk-concert-solidaire-lacim-madagascar",
    official_source_url:"https://www.helloasso.com/associations/lacim/evenements/amy-et-andy-en-duo-pop-rock-et-folk-concert-solidaire-lacim-madagascar",
    description:"Concert solidaire du duo Amy & Andy le samedi 21 novembre 2026 de 19 h 30 à 22 h 30. Les bénéfices contribueront à reconstruire trois classes de l’école primaire d’Andranomaitso à Madagascar. Buvette et petite restauration sur place.",
    mediaUrls:[],createdAt:"2026-09-10T00:00:00.000Z",
  },
  {
    id:"fifda-paris-2026",
    title:"Festival International des Films de la Diaspora Africaine — FIFDA 2026",
    date:"2026-09-04",
    location:"CGR Paris Lilas & Cinéma Saint-André des Arts, Paris",
    city:"Paris",
    category:"Culture",
    image:"",
    price:"Pass 45 € / Pass Duo 65 €",
    organizer:"FIFDA",
    ticketUrl:"https://www.eventbrite.fr/e/fifda-2026-tickets-1994356328465",
    description:"Le FIFDA revient à Paris du vendredi 4 au dimanche 6 septembre 2026. Projections, débats et rencontres autour des cinémas d’Afrique et de ses diasporas au CGR Paris Lilas puis au Cinéma Saint-André des Arts. Le bouton Billets renvoie vers la billetterie officielle du festival.",
    mediaUrls:[],
    createdAt:"2026-07-28T00:00:00.000Z",
  },
  {
    id:"billetweb-mahaleo-2026",
    title:"Mahaleo — concert exceptionnel",
    date:"2026-10-17",
    location:"Le Millénaire, Place du 19 Mars 1962, Savigny-le-Temple",
    city:"Savigny-le-Temple",
    category:"Culture",
    image:"https://www.billetweb.fr/files/page/thumb/mahaleo1.jpg?v=0",
    price:"35,64 € prévente / 65,94 € VIP",
    organizer:"DMF",
    ticketUrl:"https://www.billetweb.fr/mahaleo1",
    description:"Le groupe légendaire Mahaleo se produit en concert exceptionnel au Millénaire, samedi 17 octobre 2026 de 21h à 5h. Une soirée de musique malgache placée sous le signe de l’émotion, du partage et de la fête. Les billets en prévente sont prioritaires à l’entrée jusqu’à 22h ; la vente sur place dépendra ensuite des places encore disponibles.",
    mediaUrls:[],
    createdAt:"2026-07-28T00:00:00.000Z",
  },
  {
    id:"billetweb-midnight-bus-2026",
    title:"MIDNIGHT BUS in Paris — Jonas Androx & DJ P.XIIE",
    date:"2026-07-31",
    location:"Hôtel de Ville, 75004 Paris",
    city:"Paris",
    category:"Soirée",
    image:"https://www.billetweb.fr/files/page/thumb/midnight-bus.png?v=1784701659",
    price:"20 € — Early Bird",
    organizer:"ANDROX",
    ticketUrl:"https://www.billetweb.fr/midnight-bus",
    description:"Le MIDNIGHT BUS parcourt Paris de nuit pour une expérience mêlant musique, ambiance club et vue sur les monuments illuminés. Rendez-vous vendredi 31 juillet à 23h30 à l’Hôtel de Ville (départ du bus à 23h30 au plus tard), jusqu’à 5h. Au programme : Afro, Shatta, RnB, Gasy et Kompa, bar à bord et line-up Jonas Androx & DJ P.XIIE. Places très limitées, réservation obligatoire.",
    mediaUrls:[],
    createdAt:"2026-07-26T00:00:00.000Z",
  },
  {
    id:"gaspaname-03-octobre-2026",
    title:"Coupe du Monde Gas’Paname IV & Gas’Padel III",
    date:"2026-10-03",
    location:"Five de Créteil, Créteil (94)",
    city:"Paris",
    category:"Sport",
    image:"",
    price:"",
    organizer:"Gas'Paname Sport",
    ticketUrl:"",
    description:"Gas’Paname Sport annonce deux rendez-vous le samedi 3 octobre 2026 : la 4e édition de la Coupe du Monde Gas’Paname et la 3e édition de Gas’Padel, au Five de Créteil. Horaires, inscriptions et tarifs à venir sur le compte officiel de l’organisateur.",
    mediaUrls:[],
    createdAt:"2026-07-29T00:00:00.000Z",
  },
  {
    id:"gaspaname-01-novembre-2026",
    title:"NBA Gas’Paname I & Coupe du Monde Gas’Paname IV",
    date:"2026-11-01",
    location:"Gymnase 94, Choisy-le-Roi (94)",
    city:"Paris",
    category:"Sport",
    image:"",
    price:"",
    organizer:"Gas'Paname Sport",
    ticketUrl:"",
    description:"Double rendez-vous sportif annoncé par Gas’Paname Sport le dimanche 1er novembre 2026 à Choisy-le-Roi : première édition de NBA Gas’Paname et 4e édition de la Coupe du Monde Gas’Paname. Horaires, inscriptions et tarifs à venir sur le compte officiel.",
    mediaUrls:[],
    createdAt:"2026-07-29T00:00:00.000Z",
  },
  {
    id:"gaspaname-19-decembre-2026",
    title:"Foot inter-lycées de Tana Alumni France V & soirée des retrouvailles",
    date:"2026-12-19",
    location:"Lieu à confirmer",
    city:"Paris",
    category:"Sport",
    image:"",
    price:"",
    organizer:"Gas'Paname Sport",
    ticketUrl:"",
    description:"Gas’Paname Sport prévoit le samedi 19 décembre 2026 la 5e édition du tournoi de foot inter-lycées de Tana Alumni France, suivie de la grande soirée des retrouvailles 2026. Le lieu, les artistes, le DJ, les horaires et les modalités d’accès restent à confirmer.",
    mediaUrls:[],
    createdAt:"2026-07-29T00:00:00.000Z",
  },
  {
    id:"bebs-rassemblement-culturel-vendredi",
    title:"BEB’S — rassemblement culturel du vendredi",
    date:nextFridayDate(),
    location:"Pétanque de Lisses — Piscine du Long Rayage, chemin du Parisis, Lisses",
    city:"Lisses",
    category:"Culture",
    image:"",
    price:"",
    organizer:"BEB’S",
    ticketUrl:"",
    description:"Rassemblement culturel et convivial organisé par BEB’S tous les vendredis à partir de 19 h, à la Pétanque de Lisses. Cuisine maison, plats composés, mine sao au poulet, nems ou samoussas, soupe, brochettes de bœuf et tilapia frit. Rendez-vous à la Piscine du Long Rayage, chemin du Parisis à Lisses. Informations et commandes : 07 69 13 23 30.",
    mediaUrls:[],
    createdAt:"2026-07-29T00:00:00.000Z",
  },
]

// Les pistes datées par simple estimation restent conservées dans l'historique,
// mais ne doivent pas apparaître comme des rendez-vous confirmés dans l'agenda.
const TENTATIVE_EVENT_TITLES = new Set([
  "soirée d'intégration gs lille 2026-2027",
  "tournoi de noël — ligue clichy madagascar",
  "madadiaspora foot — rns",
])

const isConfirmedAgendaEvent = event => !TENTATIVE_EVENT_TITLES.has(String(event?.title||"").trim().toLowerCase())

const verifiedEventPatches = {
  "tana–paris–tana — théâtre musical": {
    ticketUrl:"https://www.helloasso.com/associations/sehatra-ba-gasy-france/evenements/paris-tana-paris-sbgf",
    official_source_url:"https://www.helloasso.com/associations/sehatra-ba-gasy-france/evenements/paris-tana-paris-sbgf",
    updates_url:"https://www.helloasso.com/associations/sehatra-ba-gasy-france/evenements/paris-tana-paris-sbgf",
  },
  "rija ramanantoanina en concert": {
    date:"2026-10-17",
    location:"Espace Magnan, 31 rue Louis-de-Coppet, 06000 Nice",
    address:"31 rue Louis-de-Coppet, 06000 Nice",
    city:"Nice",
    price:"30 €",
    organizer:"Scènes du Sud",
    ticketUrl:"https://www.explorenicecotedazur.com/fete-manifestation/rija-ramanantoanina/",
    official_source_url:"https://www.explorenicecotedazur.com/fete-manifestation/rija-ramanantoanina/",
    description:"Rija Ramanantoanina présente son nouvel album « FY » en concert à l’Espace Magnan de Nice, samedi 17 octobre 2026 à 19 h 30. Adresse officielle : 31 rue Louis-de-Coppet, 06000 Nice. Tarif annoncé : 30 €.",
  },
  "tournoi de la solidarité 2026 — csm & masova": {
    title:"Tournoi de la Solidarité 2026 — CSM & MASOVA",
    date:"2026-10-24",
    location:"Complexe sportif Saint-Exupéry, Villebon-sur-Yvette (91)",
    city:"Villebon-sur-Yvette",
    price:"Tarifs selon discipline",
    organizer:"Collectif Sport Malagasy",
    ticketUrl:"https://www.helloasso.com/associations/association-masova-madagascar-solidarite-volontariat-et-action/evenements/tournoi-de-la-solidarite-2026-collaboration-masova-csm",
    official_source_url:"https://www.helloasso.com/associations/association-masova-madagascar-solidarite-volontariat-et-action/evenements/tournoi-de-la-solidarite-2026-collaboration-masova-csm",
    description:"Troisième édition du Tournoi de la Solidarité, organisée par MASOVA avec le Collectif Sport Malagasy, les samedi 24 et dimanche 25 octobre 2026 au Complexe sportif Saint-Exupéry de Villebon-sur-Yvette. Disciplines annoncées : football, basket, volley, tennis de table, pétanque et initiation bachata. Les inscriptions se font auprès de l’organisateur sur HelloAsso.",
  },
  "tournoi de la solidarité — csm": {
    title:"Tournoi de la Solidarité 2026 — CSM & MASOVA",
    date:"2026-10-24",
    location:"Complexe sportif Saint-Exupéry, Villebon-sur-Yvette (91)",
    city:"Villebon-sur-Yvette",
    price:"Tarifs selon discipline",
    organizer:"Collectif Sport Malagasy",
    ticketUrl:"https://www.helloasso.com/associations/association-masova-madagascar-solidarite-volontariat-et-action/evenements/tournoi-de-la-solidarite-2026-collaboration-masova-csm",
    official_source_url:"https://www.helloasso.com/associations/association-masova-madagascar-solidarite-volontariat-et-action/evenements/tournoi-de-la-solidarite-2026-collaboration-masova-csm",
    description:"Troisième édition du Tournoi de la Solidarité, organisée par MASOVA avec le Collectif Sport Malagasy, les samedi 24 et dimanche 25 octobre 2026 au Complexe sportif Saint-Exupéry de Villebon-sur-Yvette. Disciplines annoncées : football, basket, volley, tennis de table, pétanque et initiation bachata. Les inscriptions se font auprès de l’organisateur sur HelloAsso.",
  },
  "hajazz en cabaret": {
    price:"0 à 10 €",
    organizer:"Association La Petite Mandarine",
    ticketUrl:"https://www.helloasso.com/associations/association-la-petite-mandarine/evenements/hajazz-13-aout-grange-rouge",
    description:"Hajazz en solo à La Grande Rouge (Saône-et-Loire). Buvette et restauration dès 18h, concert à 20h puis jam session avec les musiciens de la région.",
  },
}

const initialVideos = [
  {id:1,type:"aftermovie",title:"After-movie — Repas Communautaire Lyon 2025",youtubeUrl:"https://www.youtube.com/embed/dQw4w9WgXcQ",thumbnail:"https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400",eventName:"Repas Communautaire Malagasy",eventId:3,date:"2025-03-10",city:"Lyon",description:"Revivez la magie du repas communautaire de Lyon.",isTeaser:false,views:1240},
  {id:2,type:"aftermovie",title:"Teaser — Soirée Malagasy Paris",youtubeUrl:"https://www.youtube.com/embed/dQw4w9WgXcQ",thumbnail:"https://images.unsplash.com/photo-1533317480453-7a4b6ad0a174?w=400",eventName:"Soirée Malagasy Paris",eventId:1,date:"2026-07-12",city:"Paris",description:"Le teaser de la soirée la plus attendue de l'été !",isTeaser:true,views:856},
  {id:3,type:"communaute",title:"La communauté malagasy de Lyon se présente",youtubeUrl:"https://www.youtube.com/embed/dQw4w9WgXcQ",thumbnail:"https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400",eventName:"",eventId:null,date:"2025-06-01",city:"Lyon",description:"Portrait de notre communauté.",isTeaser:false,views:432},
]

const initialGastro = [
  {id:1,name:"Ikala Kara",type:"Restaurant",region:"Provence-Alpes-Côte d'Azur",note:"Restaurant malgache et karaoké à Marseille, confirmé par l'office de tourisme.",fb:"https://www.facebook.com/Ikalakara",insta:"",site:"",contact:"",city:"Marseille (13)",address:"40 rue Saint-Savournin, 13001 Marseille",phone:"09 80 67 41 54",lat:43.2989,lng:5.3872,malagasy_verified:true},
  {id:2,name:"O'Bol d'Or",type:"Restaurant",region:"Île-de-France",note:"Restaurant proposant explicitement des plats traditionnels malgaches et la soupe Tamatave.",fb:"https://www.facebook.com/profile.php?id=61558005182008",insta:"",site:"https://oboldor.com/",contact:"",city:"Vitry-sur-Seine (94)",address:"72 avenue Anatole France, 94400 Vitry-sur-Seine",phone:"06 19 66 01 86",lat:48.7899,lng:2.3938,malagasy_verified:true},
  {id:5,name:"La Gourmandise Malgache",type:"Traiteur",region:"Hauts-de-France",note:"Plats et apéritifs malgaches faits maison.",fb:"https://www.facebook.com/profile.php?id=100076189512327",insta:"",site:"",contact:"",city:"Lillers (62)",lat:50.5636,lng:2.4819,malagasy_verified:true},
  {id:6,name:"Pili Pili Malgache Food",type:"Traiteur",region:"Grand Est",note:"Traiteur malgache et recettes traditionnelles de Madagascar pour vos événements.",fb:"https://www.facebook.com/pilipilimalgachefood",insta:"",site:"https://www.pilipilimalgachefood.com/",contact:"",city:"Réguisheim (68)",address:"42 Grand Rue, 68890 Réguisheim",phone:"06 16 48 33 74",lat:47.9929,lng:7.3721,malagasy_verified:true},
  {id:8,name:"Traiteur Franco-Malagasy Paris",type:"Traiteur",region:"Île-de-France",note:"Traiteur franco-malagasy pour mariages et événements.",fb:"https://www.facebook.com/wenddingtraiteurmalagasy",insta:"",site:"",contact:"",city:"Paris",address:"",phone:"+33 6 35 97 42 34",lat:48.8566,lng:2.3522,malagasy_verified:true},
  {id:9,name:"Chez Tiana",type:"Traiteur",region:"Île-de-France",note:"Ravitoto et mofo gasy faits maison, salés et sucrés.",fb:"https://www.facebook.com/Cheztiana",insta:"",site:"",contact:"",city:"Paris 14e",lat:48.8331,lng:2.3264,malagasy_verified:true},
  {id:11,name:"Nini + Vous",type:"Traiteur",region:"Nouvelle-Aquitaine",note:"Cheffe à domicile et traiteur franco-malgache ; ancienne gérante d'un restaurant malgache.",fb:"https://www.facebook.com/profile.php?id=100086724786890",insta:"",site:"https://www.ninietvous.fr/",contact:"",city:"Bordeaux",address:"Bordeaux et sa région",phone:"06 58 77 86 92",lat:44.8378,lng:-0.5792,malagasy_verified:true},
  {id:14,name:"Au Soleil de Madagascar",type:"Food truck",region:"Île-de-France",note:"Food truck et traiteur spécialisé dans les recettes malgaches authentiques.",fb:"https://www.facebook.com/AuSoleildeMadagascar",insta:"",site:"",contact:"",city:"Cachan (94)",lat:48.7919,lng:2.3319,malagasy_verified:true},
  {id:17,name:"Le Rendez-vous Franco-Malgache",type:"Restaurant",region:"Provence-Alpes-Côte d'Azur",note:"Restaurant franco-malgache proposant un voyage culinaire à Madagascar.",fb:"https://www.facebook.com/profile.php?id=100092651710205",insta:"",site:"",contact:"",city:"L'Isle-sur-la-Sorgue (84)",address:"130 avenue de la Petite Marine, 84800 L'Isle-sur-la-Sorgue",phone:"+33 7 88 95 46 67",lat:43.9195,lng:5.0512,malagasy_verified:true},
  {id:23,name:"Chicken Coco",type:"Food truck",region:"Pays de la Loire",note:"Concept porté par une fondatrice d'origine malgache et cuisine inspirée de Madagascar.",fb:"",insta:"",site:"https://www.chickencoco.fr/",contact:"",city:"Saint-Jean-de-Monts / Challans",address:"",phone:"",lat:null,lng:null,malagasy_verified:true},
  {id:24,name:"Ti Bou Events",type:"Traiteur",region:"Nouvelle-Aquitaine",note:"Traiteur cofondé par une cheffe d'origine malgache, avec une touche culinaire malagasy explicite.",fb:"",insta:"",site:"https://www.tibouevents.com/",contact:"",city:"Moliets-et-Maa (40)",address:"14 rue du Général de Gaulle, 40660 Moliets-et-Maa",phone:"05 58 43 12 25",lat:null,lng:null,malagasy_verified:true},
  {id:25,name:"L'Espace Gourmand Chez Didine",type:"Restaurant",region:"Bourgogne-Franche-Comté",note:"Restaurant proposant explicitement une cuisine réunionnaise et malgache.",fb:"https://www.facebook.com/Chez-Didine-825381957475294/",insta:"",site:"",contact:"",city:"Corbigny (58)",address:"6 rue des Forges, 58800 Corbigny",phone:"09 80 59 03 02",lat:null,lng:null,malagasy_verified:true},
  {id:26,name:"Auberge du Mesnil",type:"Restaurant",region:"Grand Est",note:"Auberge tenue par Jeannette, originaire de Madagascar, et proposant des spécialités malgaches.",fb:"",insta:"",site:"https://aubergedumesnil.com/",contact:"",city:"Xouaxange (57)",address:"1 rue de l'École, 57830 Xouaxange",phone:"03 87 25 03 44",lat:null,lng:null,malagasy_verified:true},
  {id:28,name:"Sakafo — Maison événementielle malgache",type:"Traiteur",region:"Île-de-France",note:"Maison événementielle consacrée à la gastronomie malgache authentique.",fb:"",insta:"",site:"https://sakafo.fr/",contact:"",city:"Paris et Île-de-France",address:"",phone:"",lat:null,lng:null,malagasy_verified:true},
]

const VERIFIED_GASY_GASTRO_NAMES = new Set(initialGastro.map(item=>normalizedDirectoryName(item.name)))

const initialOrgas = [
  {id:1,name:"RNS — Rencontre Nationale Sportive",type:"Association sportive",city:"National (Vichy)",region:"",followers:"84 000",note:"Partenaire Malagasy Events. Le plus grand événement sportif et culturel de la diaspora malagasy, depuis 1975. Organise la RNS de Pâques à Vichy et le Madadiaspora Foot en décembre.",fb:"https://www.facebook.com/rns.cen",insta:"https://www.instagram.com/rns_cen/",site:"https://www.rns-cen.com",contact:"",logo_url:"/images/rns-cen-logo.jpg"},
  {id:2,name:"Collectif Sport Malagasy — CSM",type:"Association sportive",city:"National",region:"",followers:"14 000",note:"Organise le Tournoi de la Solidarité (foot & basket) chaque week-end de la Toussaint à Villebon-sur-Yvette, et un tournoi de printemps.",fb:"https://www.facebook.com/profile.php?id=100064795630232",insta:"",site:"",contact:""},
  {id:3,name:"ASM Paris",type:"Association sportive",city:"Paris",region:"Île-de-France",followers:"7 100",note:"Association Sportive Malgache historique, depuis 1986. Tournoi de l'amitié.",fb:"https://www.facebook.com/profile.php?id=100064645391225",insta:"",site:"",contact:""},
  {id:4,name:"Ligue Clichy Madagascar",type:"Association sportive",city:"Clichy",region:"Île-de-France",followers:"3 800",note:"Ligue basket de la communauté malgache. Tournoi de Noël chaque fin d'année.",fb:"https://www.facebook.com/profile.php?id=100063642368550",insta:"",site:"",contact:""},
  {id:5,name:"Gasy Sport Lille",type:"Association sportive",city:"Lille",region:"Hauts-de-France",followers:"2 100",note:"Association sportive et culturelle malgache du Nord. Soirée d'intégration chaque octobre, garden party l'été.",fb:"https://www.facebook.com/gslille",insta:"",site:"",contact:""},
  {id:6,name:"SPORTIL",type:"Association sportive",city:"Paris",region:"Île-de-France",followers:"655",note:"Journée sportive annuelle organisée par les scouts (tily) de la FPMA Paris, traditionnellement le 8 mai.",fb:"https://www.facebook.com/SportilParis1",insta:"",site:"",contact:""},
  {id:7,name:"Gas'Paname Sport",type:"Association sportive",city:"Paris",region:"Île-de-France",followers:"2 800",note:"Communauté sportive malagasy de Paris : Gaspaname Game, Coupe du Monde Gas’Paname, basket et foot inter-lycées de Tana Alumni France.",fb:"https://www.facebook.com/genialis.mg",insta:"https://www.instagram.com/gas_paname_sport/",site:"",contact:""},
  {id:8,name:"Solidarité France Diégo — ASFD",type:"Association",city:"Marseille",region:"Provence-Alpes-Côte d'Azur",followers:"7 000",note:"Promotion de la culture malgache, projets culturels et humanitaires. Prépare le Maoulida de la diaspora du Sud de la France.",fb:"https://www.facebook.com/assosfd",insta:"",site:"",contact:"06 95 85 30 88 · solidaritefrancediego@gmail.com"},
  {id:9,name:"Club Mad'",type:"Association",city:"Lyon",region:"Auvergne-Rhône-Alpes",followers:"814",note:"Association franco-malgache socio-éducative, culturelle et solidaire, reconnue d'utilité publique. Chorale Kalomad. MJC Laennec Mermoz, Lyon 8e.",fb:"https://www.facebook.com/profile.php?id=100064524732458",insta:"",site:"",contact:"06 14 28 74 02"},
  {id:10,name:"Fitia'Havana Toulouse",type:"Association",city:"Toulouse",region:"Occitanie",followers:"889",note:"Association loi 1901 : aide sociale, promotion culturelle et économique franco-malgache.",fb:"https://www.facebook.com/profile.php?id=100072412716681",insta:"",site:"",contact:"fitia.havana@gmail.com"},
  {id:11,name:"Association Malgache Franco-Guyanaise",type:"Association",city:"Rémire-Montjoly (Guyane)",region:"Outre-mer",followers:"895",note:"Association humanitaire et culturelle qui fédère les cultures et finance des actions en Guyane et à Madagascar.",fb:"https://www.facebook.com/AssociationFrancoMalgacheGuyanaise",insta:"",site:"",contact:"m.rattier973@gmail.com"},
  {id:12,name:"ACFM — Association Culturelle Franco-Malgache",type:"Association",city:"France",region:"",followers:"55",note:"Aide aux confrères malgaches dans le besoin, en particulier les enfants.",fb:"https://www.facebook.com/profile.php?id=61550882390310",insta:"",site:"https://association-culturelle-franco-malgache.com",contact:""},
  {id:13,name:"Revy Revy Vacances (Angle 360)",type:"Organisateur",city:"National",region:"",followers:"",note:"Tournées d'artistes malagasy en France : Princio & Njara Marcel à Marseille, Toulouse et Les Ulis (juillet 2026).",fb:"",insta:"",site:"",contact:""},
  {id:14,name:"Que Calor Paris",type:"Organisateur",city:"Paris",region:"Île-de-France",followers:"",note:"Soirées à Paris — 206 Vibes, Kosmo, Midnight 261, Falfa.",fb:"",insta:"https://www.instagram.com/quecalorparis",site:"",contact:""},
  {id:15,name:"Mada Mifety",type:"Organisateur",city:"Paris",region:"Île-de-France",followers:"",note:"Producteur du Grand spectacle d'été (Nono) au Domaine de la Beauvoisière, Avrainville.",fb:"",insta:"",site:"",contact:""},
  {id:16,name:"Malagasy en France 2.0",type:"Média",city:"National",region:"",followers:"44 000",note:"Émission web d'actualités de la diaspora malagasy en France. Ancien domaine indisponible au contrôle du 26 août 2026.",fb:"https://www.facebook.com/malagasydiasporanews",insta:"",site:"",contact:""},
  {id:17,name:"Un Malgache à Paris",type:"Média",city:"Paris",region:"Île-de-France",followers:"62 900",note:"Blog lifestyle & mode d'un créateur malgache à Paris — rubrique Héritage sur la culture malagasy.",fb:"https://facebook.com/unmalgacheaparis",insta:"https://instagram.com/unmalgacheaparis",site:"https://unmalgacheaparis.com",contact:""},
  {id:18,name:"Malagasy En France",type:"Groupe",city:"National",region:"",followers:"79 100",note:"Le plus grand groupe communautaire malgache de France.",fb:"https://www.facebook.com/groups/204379976640842",insta:"",site:"",contact:""},
  {id:19,name:"Diaspora Malagasy",type:"Groupe",city:"National",region:"",followers:"18 100",note:"Groupe communautaire de la diaspora.",fb:"https://www.facebook.com/groups/2461198107341793",insta:"",site:"",contact:""},
  {id:20,name:"Gasy Ka Manja à Lyon",type:"Groupe",city:"Lyon",region:"Auvergne-Rhône-Alpes",followers:"1 900",note:"Groupe communautaire actif à Lyon, annonces de soirées régulières.",fb:"https://www.facebook.com/groups/577969292365884",insta:"",site:"",contact:""},
  {id:21,name:"FETYBE",type:"Organisateur",city:"Paris",region:"Île-de-France",followers:"16 000",note:"Organise de grosses soirées à Paris : nouvel an, artistes venus de Madagascar.",fb:"https://www.facebook.com/fetybe",insta:"",site:"",contact:""},
  {id:22,name:"Fiesta Lyon",type:"Organisateur",city:"Lyon",region:"Auvergne-Rhône-Alpes",followers:"5 600",note:"Organisation d'événements malgaches sur Lyon et sa région.",fb:"https://www.facebook.com/profile.php?id=100009852315220",insta:"",site:"",contact:""},
  {id:23,name:"Gasy Unit Paris",type:"Organisateur",city:"Savigny-le-Temple",region:"Île-de-France",followers:"",note:"« L'événement 100% Gasy » — soirées avec artistes, billetterie en ligne active.",fb:"",insta:"",site:"https://my.weezevent.com/gasy-unit",contact:""},
  {id:24,name:"Gasy Moov",type:"Organisateur",city:"Strasbourg / Marseille",region:"Grand Est",followers:"",note:"Soirées gasy par BESHA BEEP, JR Prod, Tamosilahy, Weraweaw et Makua Entertainment.",fb:"",insta:"",site:"https://my.weezevent.com/gasy-moov-3-strasbourg",contact:""},
  {id:25,name:"Festi-Gasy Marseille",type:"Organisateur",city:"Marseille",region:"Provence-Alpes-Côte d'Azur",followers:"",note:"Festival malgache à Marseille : concerts, plats traditionnels et tsakitsaky gasy.",fb:"",insta:"",site:"https://my.weezevent.com/festi-gasy-marseille",contact:""},
  {id:26,name:"Gasy Feeling",type:"Organisateur",city:"France",region:"",followers:"",note:"Organisation d'événements : mariages, fiançailles, concerts, cabarets.",fb:"",insta:"",site:"",contact:""},
  {id:27,name:"KOSMO",type:"DJ & organisateur",city:"Paris",region:"Île-de-France",followers:"",note:"DJ et organisateur de soirées parisiennes, dont KOSMO — Back to School à l’Infinity Club.",fb:"https://www.facebook.com/profile.php?id=61570846886143",insta:"https://www.instagram.com/kosmo.fr/",site:"",contact:""},
  {id:28,name:"DJ Gouty Madagascar",type:"DJ & artistes",city:"France / Madagascar",region:"",followers:"50 000",note:"DJ et formateur en organisation événementielle.",fb:"https://www.facebook.com/djgouty",insta:"",site:"",contact:""},
  {id:29,name:"Dj DiNA",type:"DJ & artistes",city:"National",region:"",followers:"1 700",note:"DJ et administrateur du groupe Soirée Gasy France Officiel (19 400 membres).",fb:"https://www.facebook.com/dinadeejay",insta:"",site:"",contact:""},
  {id:30,name:"Rodman",type:"DJ & artistes",city:"Paris",region:"Île-de-France",followers:"",note:"DJ et organisateur de soirées dansantes.",fb:"",insta:"",site:"",contact:""},
  {id:31,name:"DJ Malagasy de France (DMF)",type:"DJ & artistes",city:"France",region:"",followers:"734",note:"Association de DJ : promotion et organisation de soirées et d'événements culturels.",fb:"https://www.facebook.com/groups/djmalagasydefrance",insta:"",site:"",contact:""},
  {id:32,name:"Hypemada",type:"Média",city:"National",region:"",followers:"10 000",note:"Collectif, média et association de la diaspora malagasy.",fb:"https://www.facebook.com/hypemada",insta:"",site:"",contact:""},
  {id:33,name:"Soirée Gasy France Officiel",type:"Groupe",city:"National",region:"",followers:"19 400",note:"Réseau d'artistes et DJ malgaches de France, géré par Dj DiNA.",fb:"https://www.facebook.com/groups/soireegasyfrance",insta:"",site:"",contact:""},
  {id:34,name:"Gasy Aty France",type:"Groupe",city:"National",region:"",followers:"13 100",note:"Groupe communautaire très actif.",fb:"https://www.facebook.com/groups/2049048968643577",insta:"",site:"",contact:""},
  {id:35,name:"Gasy Jiaby de France",type:"Groupe",city:"National",region:"",followers:"11 100",note:"Groupe communautaire très actif.",fb:"https://www.facebook.com/groups/1044706243008430",insta:"",site:"",contact:""},
  {id:36,name:"Le Bon Coin Gasy de France",type:"Groupe",city:"National",region:"",followers:"25 600",note:"Groupe d'annonces communautaire.",fb:"https://www.facebook.com/groups/2072223663014016",insta:"",site:"",contact:""},
  {id:37,name:"Saomavibe",type:"Organisateur",city:"Lyon",region:"Auvergne-Rhône-Alpes",followers:"",note:"Nouvel organisateur de soirées malagasy à Lyon.",fb:"",insta:"https://www.instagram.com/saomavibe_/",site:"",contact:""},
  {id:38,name:"BEB’S — Sakafo",type:"Organisateur",city:"Évry-Courcouronnes",region:"Île-de-France",followers:"",note:"Cuisine et rendez-vous sakafo pour la communauté malagasy à Évry-Courcouronnes.",fb:"",insta:"",site:"",contact:""},
  {id:39,name:"Ny Aina VoaArinavalona",type:"DJ & artistes",city:"Paris",region:"Île-de-France",followers:"7 322",note:"DJ basé à Paris, présent notamment au Duplex, au Barapapa et au Balajo.",fb:"",insta:"https://www.instagram.com/nyaina_vrn/",site:"https://www.nyainavrn.com",contact:""},
]

const CAT_COLORS = {Soirée:{bg:"#fde8ec",color:RED},Culture:{bg:"#e6f4ed",color:GREEN},Gastronomie:{bg:"#fff3e0",color:"#e65100"},Sport:{bg:"#e3f2fd",color:"#1565c0"},Religion:{bg:"#fff8e1",color:"#f57f17"},Autre:{bg:"#f5f5f5",color:"#555"}}
const CAT_EMOJI = {Soirée:"🎉",Culture:"🎭",Gastronomie:"🍽️",Sport:"🏆",Religion:"⛪",Autre:"📌"}
const CAT_VISUALS = {
  Soirée:{gradient:"linear-gradient(135deg,#e7183f 0%,#850d28 58%,#3d0715 100%)",tint:"rgba(200,16,46,.58)"},
  Culture:{gradient:"linear-gradient(135deg,#12a767 0%,#006b3c 58%,#063d27 100%)",tint:"rgba(0,122,61,.56)"},
  Gastronomie:{gradient:"linear-gradient(135deg,#ff9b32 0%,#dc5f0b 58%,#713006 100%)",tint:"rgba(230,81,0,.56)"},
  Sport:{gradient:"linear-gradient(135deg,#2d8ff0 0%,#155eaf 58%,#0b315f 100%)",tint:"rgba(21,101,192,.56)"},
  Religion:{gradient:"linear-gradient(135deg,#f6bd36 0%,#c38308 58%,#644100 100%)",tint:"rgba(198,126,0,.54)"},
  Autre:{gradient:"linear-gradient(135deg,#7856b6 0%,#4a347d 58%,#251c3b 100%)",tint:"rgba(82,58,126,.55)"},
}

// Habillage visuel "Malagasy Events" : placeholder brandé quand pas d'affiche
const BrandedCover = ({event, big}) => (
  <div data-event-category={event.category||"Autre"} style={{width:"100%",height:"100%",background:(CAT_VISUALS[event.category]||CAT_VISUALS.Autre).gradient,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:big?10:6}}>
    <span style={{fontSize:big?64:44,filter:"drop-shadow(0 4px 12px rgba(0,0,0,.35))"}}>{CAT_EMOJI[event.category]||"🎉"}</span>
    <span style={{color:"rgba(255,255,255,.92)",fontWeight:800,fontSize:big?14:11,letterSpacing:2.5,textTransform:"uppercase"}}>🇲🇬 Malagasy Events</span>
    <span style={{color:"rgba(255,255,255,.65)",fontWeight:700,fontSize:big?12:10}}>{event.city}</span>
  </div>
)
const EventCategoryTint = ({event}) => (
  <div aria-hidden="true" style={{position:"absolute",inset:0,background:`linear-gradient(to top,rgba(0,0,0,.58) 0%,rgba(0,0,0,.05) 58%), ${(CAT_VISUALS[event.category]||CAT_VISUALS.Autre).tint}`,mixBlendMode:"multiply",pointerEvents:"none"}}/>
)
// Liseré aux couleurs du drapeau malagasy
const FlagStripe = () => (
  <div style={{position:"absolute",top:0,left:0,right:0,height:4,display:"flex",zIndex:2}}>
    <div style={{flex:1,background:WHITE}}/><div style={{flex:1,background:RED}}/><div style={{flex:1,background:GREEN}}/>
  </div>
)
const CITIES     = ["Toutes","Paris","Lyon","Marseille","Bordeaux","Lille","Toulouse","Nice","Autre"]
const GRANDES_VILLES = ["Paris","Lyon","Marseille","Bordeaux","Lille","Toulouse","Nice"]
const CATEGORIES = ["Toutes","Soirée","Culture","Gastronomie","Sport","Religion","Autre"]
const CAT_ICONS  = {Soirée:"🎉",Culture:"🎭",Gastronomie:"🍽️",Sport:"⚽",Religion:"🙏",Autre:"✨"}

/* ── InterestOnboarding ──────────────────────────── */
function InterestOnboarding({ user, userProfile, onSave, onSkip }) {
  const CATS = ["Soirée","Culture","Gastronomie","Sport","Religion","Autre"]
  const [selected,setSelected] = useState(userProfile?.categories||[])
  const [saving,setSaving]     = useState(false)

  const toggle = cat => setSelected(s=>s.includes(cat)?s.filter(c=>c!==cat):[...s,cat])

  const save = async () => {
    setSaving(true)
    const {error} = await supabase.from('profiles').update({categories:selected}).eq('id',user.id)
    setSaving(false)
    if (error) { alert("⚠️ Non enregistré : "+error.message); return }
    onSave(selected)
  }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:16}}>
      <div style={{background:WHITE,borderRadius:28,width:"100%",maxWidth:420,padding:32,boxShadow:"0 32px 80px rgba(0,0,0,0.35)"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <p style={{fontSize:44,margin:"0 0 12px"}}>🇲🇬</p>
          <h2 style={{fontWeight:900,fontSize:22,color:"#111",margin:"0 0 10px"}}>Personnalise ton expérience</h2>
          <p style={{fontSize:14,color:"#888",margin:0,lineHeight:1.5}}>Choisis tes centres d’intérêt : les événements correspondants seront mis en avant et tu seras prévenu(e) lorsqu’un nouveau rendez-vous est publié.</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:24}}>
          {CATS.map(cat=>{
            const active = selected.includes(cat)
            return (
              <button key={cat} onClick={()=>toggle(cat)} style={{background:active?RED:"#f5f5f5",color:active?WHITE:"#555",fontWeight:700,fontSize:14,padding:"16px 12px",borderRadius:14,border:`2px solid ${active?RED:"transparent"}`,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6,transition:"all .15s"}}>
                <span style={{fontSize:26}}>{CAT_ICONS[cat]}</span>
                {cat}
                {active && <span style={{fontSize:10,opacity:.8}}>✓</span>}
              </button>
            )
          })}
        </div>
        <button onClick={save} disabled={saving||selected.length===0} style={{width:"100%",background:selected.length?RED:"#ddd",color:WHITE,fontWeight:700,fontSize:15,padding:"14px 0",borderRadius:14,border:"none",cursor:selected.length?"pointer":"not-allowed",marginBottom:10,transition:"background .2s"}}>
          {saving?"...":selected.length?`Continuer (${selected.length} sélectionné${selected.length>1?"s":""})`:"Sélectionne au moins une catégorie"}
        </button>
        <button onClick={onSkip} style={{width:"100%",background:"none",border:"none",color:"#bbb",fontSize:13,cursor:"pointer",padding:"6px 0"}}>Passer cette étape</button>
      </div>
    </div>
  )
}

/* ── LoginIntentModal ────────────────────────────── */
function LoginIntentModal({ userProfile, onSelect, onSkip }) {
  const CATS = ["Soirée","Culture","Gastronomie","Sport","Religion","Autre"]
  const [selected,setSelected] = useState([])
  const toggle = cat => setSelected(s=>s.includes(cat)?s.filter(c=>c!==cat):[...s,cat])
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:16}}>
      <div style={{background:WHITE,borderRadius:24,width:"100%",maxWidth:400,padding:28,boxShadow:"0 24px 80px rgba(0,0,0,0.3)"}}>
        <div style={{textAlign:"center",marginBottom:22}}>
          <p style={{fontSize:36,margin:"0 0 8px"}}>👋</p>
          <h2 style={{fontWeight:900,fontSize:20,color:"#111",margin:"0 0 6px"}}>Que cherches-tu aujourd'hui ?</h2>
          <p style={{fontSize:13,color:"#999",margin:0}}>Sélectionne pour filtrer les événements</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:20}}>
          {CATS.map(cat=>{
            const active = selected.includes(cat)
            return (
              <button key={cat} onClick={()=>toggle(cat)} style={{background:active?RED:"#f5f5f5",color:active?WHITE:"#555",fontWeight:700,fontSize:13,padding:"12px 10px",borderRadius:12,border:`2px solid ${active?RED:"transparent"}`,cursor:"pointer",display:"flex",alignItems:"center",gap:8,transition:"all .15s"}}>
                <span style={{fontSize:18}}>{CAT_ICONS[cat]}</span>{cat}
                {active && <span style={{marginLeft:"auto",fontSize:11}}>✓</span>}
              </button>
            )
          })}
        </div>
        <button onClick={()=>onSelect(selected)} disabled={selected.length===0} style={{width:"100%",background:selected.length?RED:"#ddd",color:WHITE,fontWeight:700,fontSize:14,padding:"12px 0",borderRadius:12,border:"none",cursor:selected.length?"pointer":"not-allowed",marginBottom:8}}>
          {selected.length ? `Voir les events (${selected.length} catégorie${selected.length>1?"s":""})` : "Sélectionne une catégorie"}
        </button>
        <button onClick={onSkip} style={{width:"100%",background:"none",border:"none",color:"#bbb",fontSize:13,cursor:"pointer",padding:"6px 0"}}>Tout voir</button>
      </div>
    </div>
  )
}

/* ── InterestTabContent ───────────────────────────── */
function InterestTabContent({ user, userProfile, onUpdate }) {
  const CATS = ["Soirée","Culture","Gastronomie","Sport","Religion","Autre"]
  const [selected,setSelected] = useState(userProfile?.categories||[])
  const [saving,setSaving]     = useState(false)
  const [saved,setSaved]       = useState(false)

  const toggle = cat => setSelected(s=>s.includes(cat)?s.filter(c=>c!==cat):[...s,cat])

  const save = async () => {
    setSaving(true)
    const {error} = await supabase.from('profiles').update({categories:selected}).eq('id',user.id)
    setSaving(false)
    if (error) { alert("⚠️ Non enregistré : "+error.message); return }
    onUpdate({...userProfile,categories:selected})
    setSaved(true); setTimeout(()=>setSaved(false),2000)
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <p style={{fontSize:13,color:"#888",margin:0}}>Ces catégories déterminent ce qui sera mis en avant pour toi (événements, contenus).</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {CATS.map(cat=>{
          const active = selected.includes(cat)
          return (
            <button key={cat} onClick={()=>toggle(cat)} style={{background:active?RED:"#f5f5f5",color:active?WHITE:"#555",fontWeight:700,fontSize:13,padding:"12px 10px",borderRadius:12,border:`2px solid ${active?RED:"transparent"}`,cursor:"pointer",display:"flex",alignItems:"center",gap:8,transition:"all .15s"}}>
              <span style={{fontSize:20}}>{CAT_ICONS[cat]}</span>
              {cat}
              {active && <span style={{marginLeft:"auto",fontSize:12}}>✓</span>}
            </button>
          )
        })}
      </div>
      <button onClick={save} disabled={saving} style={{background:saved?GREEN:RED,color:WHITE,fontWeight:700,fontSize:14,padding:"12px 0",borderRadius:14,border:"none",cursor:"pointer",opacity:saving?.7:1}}>
        {saved?"✓ Sauvegardé !":saving?"...":"Sauvegarder mes intérêts"}
      </button>
    </div>
  )
}

/* ── ProfileModal ─────────────────────────────────── */
const PAYMENT_LINKS = { boost:"", pro_mensuel:"", pro_annuel:"", premium_annuaire:"", premium_membre:"" } // ← coller ici les Stripe Payment Links

function PerkQrModal({ perk, onClose }) {
  const [qr,setQr] = useState("")
  const [expiresAt,setExpiresAt] = useState("")
  const [error,setError] = useState("")
  useEffect(()=>{
    (async()=>{
      const {data,error} = await supabase.rpc('issue_perk_qr',{p_perk_id:perk.id})
      if (error) { setError(error.message); return }
      const pass = Array.isArray(data) ? data[0] : data
      if (!pass?.token) { setError("Impossible de générer le QR code."); return }
      setExpiresAt(pass.expires_at)
      try { setQr(await QRCode.toDataURL(`${SITE_URL}/?perk=${pass.token}`,{width:300,margin:1,color:{dark:"#26215C",light:"#ffffff"}})) }
      catch { setError("QR indisponible.") }
    })()
  },[perk.id])
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,zIndex:220,background:"rgba(0,0,0,.72)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:WHITE,borderRadius:24,width:"100%",maxWidth:370,padding:26,textAlign:"center",boxShadow:"0 24px 80px rgba(0,0,0,.3)",position:"relative"}}>
        <button onClick={onClose} aria-label="Fermer" style={{position:"absolute",right:12,top:10,border:"none",background:"none",fontSize:24,color:"#999",cursor:"pointer"}}>×</button>
        <p style={{fontSize:12,fontWeight:900,letterSpacing:1.5,color:"#3C3489",margin:"0 0 6px"}}>💜 AVANTAGE PREMIUM</p>
        <h3 style={{fontSize:18,margin:"0 0 4px"}}>{perk.offer}</h3>
        <p style={{fontSize:13,color:"#777",margin:"0 0 18px"}}>{perk.partner}{perk.city?` · ${perk.city}`:""}</p>
        {error ? <p style={{color:RED,fontSize:13,lineHeight:1.5,padding:"20px 0"}}>⚠️ {error}</p>
          : !qr ? <p style={{color:"#999",padding:"70px 0"}}>Génération de ton QR sécurisé…</p>
          : <>
              <div style={{display:"inline-block",padding:12,border:"2px solid #eee",borderRadius:18}}><img src={qr} alt="QR avantage Premium" style={{display:"block",width:220,height:220}}/></div>
              <p style={{fontWeight:800,fontSize:13,color:"#333",margin:"16px 0 5px"}}>À présenter au moment de payer</p>
              <p style={{fontSize:12,color:"#888",lineHeight:1.5,margin:0}}>Le partenaire le scanne : il est personnel, valable jusqu’à {expiresAt?new Date(expiresAt).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}):"…"}, puis utilisable une fois ce mois-ci.</p>
            </>}
      </div>
    </div>
  )
}

function PerkValidationPage({ token }) {
  const [result,setResult] = useState(null)
  useEffect(()=>{ (async()=>{
    const {data,error} = await supabase.rpc('redeem_perk_qr',{p_token:token})
    const check = Array.isArray(data) ? data[0] : data
    setResult(error ? {valid:false,message:"QR code invalide."} : check||{valid:false,message:"QR code invalide."})
  })() },[token])
  if (!result) return <div style={{minHeight:"100vh",display:"grid",placeItems:"center",fontFamily:"system-ui,sans-serif",color:"#777"}}>Vérification de l’avantage…</div>
  const ok = result.valid
  return <div style={{minHeight:"100vh",background:ok?"#eef9f1":"#fff4f4",display:"grid",placeItems:"center",padding:20,fontFamily:"system-ui,sans-serif"}}><div style={{background:WHITE,borderRadius:24,maxWidth:420,width:"100%",padding:32,textAlign:"center",boxShadow:"0 10px 30px rgba(0,0,0,.08)"}}>
    <p style={{fontSize:48,margin:"0 0 8px"}}>{ok?"✅":"⛔"}</p>
    <h1 style={{fontSize:22,margin:"0 0 8px",color:ok?GREEN:RED}}>{ok?"Avantage validé":"Avantage non valide"}</h1>
    <p style={{fontSize:15,color:"#555",lineHeight:1.5,margin:"0 0 12px"}}>{result.message}</p>
    {ok && <div style={{background:"#f0edff",borderRadius:14,padding:"14px 16px",color:"#3C3489"}}><b>{result.offer}</b><br/><span style={{fontSize:13}}>{result.partner}{result.city?` · ${result.city}`:""}</span></div>}
    <p style={{fontSize:11,color:"#aaa",margin:"20px 0 0"}}>Malagasy Events · Avantages Premium</p>
  </div></div>
}

function NotificationsPage({ user, activeOrga, onAuthRequired, onUnreadChange, onOpenCommunity, onOpenClassifieds, onOpenMessages, onOpenEvent }) {
  const [items,setItems] = useState([])
  const [loading,setLoading] = useState(true)
  const icon = {message:"💬",follow:"👤",post:"📝",mention:"@",orga_follow:"🎪",orga_post:"📣",orga_message:"💬",post_like:"❤️",post_comment:"💬",event_interest:"👀",event_comment:"💬",event_favorite:"🤍",event_match:"🎟️"}
  const load = async () => {
    if (!user) return
    setLoading(true)
    let q = supabase.from('notifications').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(80)
    q = activeOrga ? q.eq('orga_id',activeOrga.id) : q.is('orga_id',null)
    const {data} = await q
    setItems(data||[]); setLoading(false)
  }
  useEffect(()=>{ load() },[user?.id,activeOrga?.id])
  const markAllRead = async () => {
    let q = supabase.from('notifications').update({read_at:new Date().toISOString()}).eq('user_id',user.id).is('read_at',null)
    q = activeOrga ? q.eq('orga_id',activeOrga.id) : q.is('orga_id',null)
    await q
    setItems(list=>list.map(n=>({...n,read_at:n.read_at||new Date().toISOString()}))); onUnreadChange?.(0)
  }
  const open = async n => {
    if (!n.read_at) {
      await supabase.from('notifications').update({read_at:new Date().toISOString()}).eq('id',n.id)
      setItems(list=>list.map(x=>x.id===n.id?{...x,read_at:new Date().toISOString()}:x))
      onUnreadChange?.(Math.max(0,unread-1))
    }
    if (n.data?.classified_id || n.link==="/petites-annonces") onOpenClassifieds?.(n.data?.classified_id)
    else if (n.type==="event_match") onOpenEvent?.(n.data?.event_id)
    else if (n.type==="message" || n.type==="orga_message") onOpenMessages?.(n)
    else onOpenCommunity?.()
  }
  if (!user) return <LoginGate title="🔔 Tes notifications" text="Connecte-toi pour retrouver tes messages, abonnements et actualités." onLogin={onAuthRequired}/>
  const unread = items.filter(n=>!n.read_at).length
  return <div style={{maxWidth:820,margin:"0 auto",padding:"32px 16px 64px"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,marginBottom:22,flexWrap:"wrap"}}>
      <div><h2 style={{fontSize:28,margin:0,color:"#111"}}>🔔 Notifications</h2><p style={{fontSize:14,color:"#777",margin:"5px 0 0"}}>{activeOrga?`Boîte de ${activeOrga.name} · `:''}{unread?`${unread} nouvelle${unread>1?"s":""} notification${unread>1?"s":""}`:"Tu es à jour ✨"}</p></div>
      {unread>0 && <button onClick={markAllRead} style={{background:"#eaf6ef",color:GREEN,border:"none",borderRadius:12,padding:"10px 14px",fontWeight:800,cursor:"pointer"}}>Tout marquer comme lu</button>}
    </div>
    {loading ? <p style={{textAlign:"center",color:"#aaa",padding:40}}>Chargement…</p>
      : items.length===0 ? <div style={{background:WHITE,borderRadius:18,padding:"42px 24px",textAlign:"center",boxShadow:"0 2px 12px rgba(0,0,0,.06)"}}><p style={{fontSize:34,margin:"0 0 8px"}}>🔔</p><p style={{fontWeight:800,margin:0}}>Aucune notification pour le moment</p><p style={{fontSize:13,color:"#888",margin:"8px 0 0"}}>Suis des membres et participe à la communauté pour rester informé.</p></div>
      : <div style={{display:"flex",flexDirection:"column",gap:8}}>{items.map(n=><button key={n.id} onClick={()=>open(n)} style={{display:"flex",alignItems:"center",gap:13,textAlign:"left",background:n.read_at?WHITE:"#f0f9f3",border:n.read_at?"1px solid #eee":"1px solid #bce3c9",borderRadius:16,padding:"14px 16px",cursor:"pointer",boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}>
          <span style={{width:38,height:38,borderRadius:"50%",background:n.read_at?"#f3f3f3":"#dff3e6",display:"grid",placeItems:"center",fontSize:18,flexShrink:0}}>{icon[n.type]||"🔔"}</span>
          <span style={{flex:1,minWidth:0}}><b style={{display:"block",fontSize:14,color:"#222",marginBottom:3}}>{n.title}</b><span style={{display:"block",fontSize:13,color:"#777",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{n.body}</span><span style={{display:"block",fontSize:11,color:"#aaa",marginTop:4}}>{ago(n.created_at)}</span></span>
          {!n.read_at && <span style={{width:9,height:9,borderRadius:"50%",background:GREEN,flexShrink:0}}/>}
        </button>)}</div>}
  </div>
}

function PremiumPage({ isMobile, user, userProfile, onAuthRequired }) {
  const [perks,setPerks] = useState([])
  const [selectedPerk,setSelectedPerk] = useState(null)
  const isPremium = userProfile?.plan==="pro"
  useEffect(()=>{ (async()=>{ const {data} = await supabase.from('perks').select('*').eq('active',true).order('id'); setPerks(data||[]) })() },[])
  const pay = () => {
    if (!user) { onAuthRequired(); return }
    if (PAYMENT_LINKS.premium_membre) window.open(PAYMENT_LINKS.premium_membre,"_blank")
    else alert("💳 Le paiement en ligne arrive très bientôt !\nContacte-nous via la Communauté pour activer ton Premium — activation en moins de 24h.")
  }
  return (
    <div style={{maxWidth:880,margin:"0 auto",padding:isMobile?"24px 16px 60px":"40px 24px 80px"}}>
      <div style={{background:"linear-gradient(135deg,#3C3489,#26215C)",borderRadius:24,padding:isMobile?"28px 20px":"40px 36px",textAlign:"center",marginBottom:24,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:5,display:"flex"}}>
          <div style={{flex:1,background:WHITE}}/><div style={{flex:1,background:RED}}/><div style={{flex:1,background:GREEN}}/>
        </div>
        <p style={{fontSize:40,margin:"0 0 8px"}}>💜</p>
        <h2 style={{color:WHITE,fontWeight:900,fontSize:isMobile?24:30,margin:"0 0 8px"}}>Membre Premium</h2>
        <p style={{color:"rgba(255,255,255,0.85)",fontSize:15,margin:"0 0 4px",lineHeight:1.6}}>Soutiens la plateforme de la communauté 🇲🇬 et profite d'avantages exclusifs.</p>
        <p style={{color:WHITE,fontWeight:900,fontSize:30,margin:"14px 0 2px"}}>2,50 €<span style={{fontSize:15,fontWeight:700,opacity:.8}}>/mois</span></p>
        <p style={{color:"rgba(255,255,255,0.6)",fontSize:12,margin:"0 0 18px"}}>sans engagement · le prix d'un café</p>
        {isPremium
          ? <span style={{display:"inline-block",background:"rgba(255,255,255,0.95)",color:"#3C3489",fontWeight:800,fontSize:14,padding:"12px 28px",borderRadius:99}}>✓ Tu es Membre Premium</span>
          : <button onClick={pay} style={{background:"linear-gradient(135deg,#b8860b,#e6b31e)",color:WHITE,fontWeight:800,fontSize:15,padding:"13px 32px",borderRadius:99,border:"none",cursor:"pointer",boxShadow:"0 6px 20px rgba(0,0,0,0.3)"}}>💜 Devenir Premium</button>}
      </div>

      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(2, 1fr)",gap:14,marginBottom:28}}>
        {[
          ["⭐","Badge doré","Ton badge Premium visible partout : profil, posts, commentaires, discussions."],
          ["📣","Mis en avant 48 h","Tes publications remontent en tête du fil de la communauté pendant 48 heures."],
          ["🏷️","Réductions partenaires","Des offres exclusives chez les restos, boutiques et artisans malagasy de nos annuaires."],
          ["🎟️","Priorité billets & tombolas","Accès prioritaire aux billets des événements partenaires et tombolas réservées aux Premium."],
        ].map(([e,t,d])=>(
          <div key={t} style={{background:WHITE,borderRadius:16,padding:"18px 20px",boxShadow:"0 3px 12px rgba(0,0,0,0.06)",border:"1px solid #f0f0f0"}}>
            <p style={{fontSize:26,margin:"0 0 6px"}}>{e}</p>
            <p style={{fontWeight:800,fontSize:15,color:"#111",margin:"0 0 4px"}}>{t}</p>
            <p style={{fontSize:13,color:"#777",margin:0,lineHeight:1.55}}>{d}</p>
          </div>
        ))}
      </div>

      <h3 style={{fontWeight:800,fontSize:18,color:"#111",margin:"0 0 4px"}}>🏷️ Les avantages partenaires</h3>
      <p style={{color:"#888",fontSize:13,margin:"0 0 14px"}}>{perks.length>0?`${perks.length} avantage${perks.length>1?"s":""} actif${perks.length>1?"s":""} — présente ton QR Premium chez le partenaire.`:"Les premiers partenariats sont en cours de signature avec les restos et boutiques de nos annuaires — ils apparaîtront ici."}</p>
      {perks.length>0 && (
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill, minmax(260px, 1fr))",gap:12,marginBottom:20}}>
          {perks.map(pk=>(
            <div key={pk.id} style={{background:WHITE,borderRadius:16,overflow:"hidden",boxShadow:"0 3px 12px rgba(0,0,0,0.06)",border:"1px solid #f0f0f0"}}>
              <div style={{background:"linear-gradient(135deg,#3C3489,#26215C)",padding:"12px 16px"}}>
                <p style={{color:WHITE,fontWeight:800,fontSize:14,margin:0}}>{pk.offer}</p>
                <p style={{color:"rgba(255,255,255,0.75)",fontSize:12,margin:0}}>{pk.partner}{pk.city?" · "+pk.city:""}</p>
              </div>
              <div style={{padding:"12px 16px"}}>
                {pk.description && <p style={{fontSize:12.5,color:"#777",margin:"0 0 10px",lineHeight:1.5}}>{pk.description}</p>}
                {isPremium
                  ? <button onClick={()=>setSelectedPerk(pk)} style={{width:"100%",background:"#f0edff",color:"#3C3489",fontWeight:900,fontSize:13,padding:"10px 0",borderRadius:10,textAlign:"center",border:"none",cursor:"pointer"}}>▣ Afficher mon QR sécurisé</button>
                  : <p onClick={pay} style={{background:"#f5f5f5",color:"#aaa",fontWeight:800,fontSize:13,padding:"10px 0",borderRadius:10,textAlign:"center",margin:0,cursor:"pointer"}}>🔒 Avantage réservé aux Premium</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{background:"#f8f8f8",borderRadius:16,padding:"16px 20px",textAlign:"center"}}>
        <p style={{fontSize:13,color:"#666",margin:0,lineHeight:1.7}}>🏪 <b>Tu as un resto, une boutique ?</b> Propose un avantage aux membres Premium : on t'amène des clients de la communauté, gratuitement. Contacte-nous via la Communauté.</p>
      </div>
      {selectedPerk && <PerkQrModal perk={selectedPerk} onClose={()=>setSelectedPerk(null)}/>} 
    </div>
  )
}

function OffersPage({ isMobile, onPremium, onPro }) {
  const offers=[
    {emoji:'💜',title:'Membre Premium',price:'2,50 € / mois',color:'#3C3489',items:['Avantages et réductions partenaires','Possibilité de rentabiliser le forfait rapidement','Soutien au développement de la communauté','Badge Premium','Mise en avant des publications pendant 48 heures'],action:'Découvrir Premium',onClick:onPremium},
    {emoji:'🎪',title:'Offre Organisateur',price:'15 € / mois',color:RED,items:['Fiche professionnelle','Publication directe des événements','Profil organisateur, abonnés et messages','Mise en avant et visibilité renforcée'],action:'Découvrir l’offre Pro',onClick:onPro},
  ]
  return <div style={{maxWidth:980,margin:'0 auto',padding:isMobile?'28px 16px 64px':'46px 24px 80px'}}><div style={{textAlign:'center',marginBottom:28}}><p style={{fontWeight:800,color:GREEN,letterSpacing:1,fontSize:12,margin:'0 0 7px'}}>MALAGASY EVENTS</p><h2 style={{fontSize:isMobile?27:36,margin:'0 0 9px',color:'#111'}}>Offres membres et organisateurs</h2><p style={{color:'#777',margin:0,lineHeight:1.55}}>Choisis l’offre qui correspond à ta manière de vivre ou d’organiser la communauté.</p></div><div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:18}}>{offers.map(o=><div key={o.title} style={{background:WHITE,border:'1px solid #eee',borderTop:`6px solid ${o.color}`,borderRadius:22,padding:24,boxShadow:'0 5px 22px rgba(0,0,0,.07)'}}><p style={{fontSize:33,margin:'0 0 8px'}}>{o.emoji}</p><h3 style={{fontSize:21,margin:'0 0 7px',color:'#111'}}>{o.title}</h3><p style={{fontSize:21,fontWeight:900,color:o.color,margin:'0 0 18px'}}>{o.price}</p>{o.items.map(x=><p key={x} style={{fontSize:14,color:'#555',margin:'0 0 10px'}}>✓ {x}</p>)}<button onClick={o.onClick} style={{marginTop:14,width:'100%',background:o.color,color:WHITE,border:'none',borderRadius:12,padding:'12px',fontWeight:800,cursor:'pointer'}}>{o.action} →</button></div>)}</div></div>
}

function ProPage({ isMobile, user, onAuthRequired }) {
  const pay = key => {
    if (PAYMENT_LINKS[key]) { window.open(PAYMENT_LINKS[key],"_blank") }
    else alert("💳 Le paiement en ligne arrive très bientôt !\nEn attendant, contacte-nous via la Communauté ou par message pour activer ton offre — activation en moins de 24h.")
  }
  const Card = ({emoji,title,price,sub,items,cta,color,featured,onClick}) => (
    <div style={{background:WHITE,borderRadius:20,boxShadow:featured?"0 8px 30px rgba(184,134,11,0.25)":"0 3px 14px rgba(0,0,0,0.07)",border:featured?"2px solid #e6b31e":"1px solid #f0f0f0",overflow:"hidden",display:"flex",flexDirection:"column",position:"relative"}}>
      {featured && <span style={{position:"absolute",top:12,right:12,background:"linear-gradient(135deg,#b8860b,#e6b31e)",color:WHITE,fontSize:10,fontWeight:800,padding:"3px 10px",borderRadius:99}}>LE PLUS CHOISI</span>}
      <div style={{background:color,padding:"22px 20px 16px",textAlign:"center"}}>
        <p style={{fontSize:32,margin:"0 0 4px"}}>{emoji}</p>
        <p style={{color:WHITE,fontWeight:800,fontSize:17,margin:0}}>{title}</p>
        <p style={{color:"rgba(255,255,255,0.95)",fontWeight:900,fontSize:26,margin:"6px 0 0"}}>{price}</p>
        <p style={{color:"rgba(255,255,255,0.75)",fontSize:12,margin:0}}>{sub}</p>
      </div>
      <div style={{padding:"16px 20px 20px",display:"flex",flexDirection:"column",gap:8,flex:1}}>
        {items.map((it,i)=><p key={i} style={{fontSize:13,color:it.startsWith("🔒")?"#bbb":"#555",margin:0,lineHeight:1.5}}>{it.startsWith("🔒")?it:"✅ "+it}</p>)}
        <button onClick={onClick} style={{marginTop:"auto",background:color,color:WHITE,fontWeight:800,fontSize:14,padding:"12px 0",borderRadius:12,border:"none",cursor:"pointer"}}>{cta}</button>
      </div>
    </div>
  )
  return (
    <div style={{maxWidth:960,margin:"0 auto",padding:isMobile?"24px 16px 60px":"40px 24px 80px"}}>
      <div style={{textAlign:"center",marginBottom:28}}>
        <h2 style={{fontWeight:900,fontSize:isMobile?24:32,color:"#111",margin:"0 0 8px"}}>💎 Boostez vos événements</h2>
        <p style={{color:"#666",fontSize:15,margin:0,lineHeight:1.6}}>Plus de visibilité, plus de monde à vos soirées, tournois et concerts.<br/>La plateforme de la communauté malagasy travaille pour vous.</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3, 1fr)",gap:18}}>
        <Card emoji="🚀" title="Boost événement" price="24 €" sub="une fois · 7 jours" color={RED}
          items={["Votre événement ⭐ à la une en tête de liste","Bannière sur la page d'accueil","Rappel envoyé aux personnes intéressées","Sans abonnement — payez quand vous en avez besoin"]}
          cta="Booster mon événement" onClick={()=>pay('boost')}/>
        <Card emoji="🎪" title="Orga Pro" price="15 €/mois" sub="ou 149 €/an (2 mois offerts)" color="#b8860b" featured
          items={["Tout le pack Organisateur (badge, fiche, actus, stats)","🔔 Rappels boostés à J-3 aux intéressés","📆 Calendrier intégrable sur votre site","🔁 Événements récurrents automatiques","📈 Statistiques avancées","⭐ 1 boost événement offert chaque mois"]}
          cta="Passer Pro" onClick={()=>pay('pro_mensuel')}/>
        <Card emoji="🏪" title="Fiche Premium" price="79 €/an" sub="restos, boutiques, artisans" color={GREEN}
          items={["Fiche ⭐ épinglée en tête d'annuaire","Badge doré et mise en avant sur l'accueil","Photo et description enrichies","Statistiques de visites de votre fiche"]}
          cta="Passer Premium" onClick={()=>pay('premium_annuaire')}/>
      </div>
      <div style={{background:"#f8f8f8",borderRadius:16,padding:"18px 22px",marginTop:26,textAlign:"center"}}>
        <p style={{fontSize:13,color:"#666",margin:0,lineHeight:1.7}}>💬 <b>Une question ? Une association loi 1901 ?</b> Contactez-nous via la Communauté — tarifs adaptés pour les petites assos.<br/><span style={{fontSize:12,color:"#999"}}>Paiement sécurisé. Activation sous 24h. Sans engagement pour le mensuel.</span></p>
      </div>
    </div>
  )
}

function OrgaOnboarding({ user, orgas, setOrgas, onClose }) {
  const [q,setQ]           = useState("")
  const [mode,setMode]     = useState("search") // search | create
  const [saving,setSaving] = useState(false)
  const [form,setForm]     = useState({name:"",type:"Organisateur",city:"",region:"",note:"",fb:"",insta:"",site:"",contact:""})
  const results = q.trim().length<2 ? [] : orgas.filter(o=>o.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0,6)
  const inp = {width:"100%",border:"1.5px solid #e5e5e5",borderRadius:12,padding:"10px 14px",fontSize:13,outline:"none",boxSizing:"border-box"}

  const dismiss = () => { localStorage.setItem('orga_onboard_'+user.id,'1'); onClose() }

  const claim = async o => {
    setSaving(true)
    const {error} = await supabase.from('orga_claims').insert({orga_id:o.id,user_id:user.id})
    if (error) alert("⚠️ Demande impossible ("+error.message+")"+(error.code==='23505'?"\n(Tu as déjà une demande en attente pour cette fiche.)":""))
    else { alert("📨 Demande envoyée pour « "+o.name+" » !\nNotre équipe vérifie que tu représentes bien cet organisme et te confirme sous 24-48h."); dismiss() }
    setSaving(false)
  }

  const create = async e => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    const {data,error} = await supabase.from('organisateurs').insert({...form,name:form.name.trim(),owner_id:user.id}).select().single()
    if (error) alert("⚠️ Création impossible ("+error.message+")")
    else { setOrgas(list=>[...list,data]); alert("🎉 « "+data.name+" » est en ligne dans l'annuaire Organisateurs !"); dismiss() }
    setSaving(false)
  }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:95,padding:16}}>
      <div style={{background:WHITE,borderRadius:24,width:"100%",maxWidth:460,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(0,0,0,0.3)"}}>
        <div style={{background:`linear-gradient(135deg, ${RED} 0%, #6e0a16 55%, ${GREEN} 140%)`,borderRadius:"24px 24px 0 0",padding:"26px 24px 20px",textAlign:"center"}}>
          <p style={{fontSize:34,margin:"0 0 6px"}}>🎪</p>
          <h2 style={{color:WHITE,fontWeight:800,fontSize:19,margin:"0 0 4px"}}>Bienvenue en mode Pro !</h2>
          <p style={{color:"rgba(255,255,255,0.85)",fontSize:13,margin:0}}>Relie ton compte à ton organisme pour activer ta fiche, ton badge et tes outils.</p>
        </div>
        <div style={{padding:24}}>
          {mode==="search" ? (<>
            <label style={{fontSize:12,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:.5,display:"block",marginBottom:6}}>Cherche ton organisme</label>
            <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Ex : Fiesta Lyon, CSM, Que Calor..." style={inp}/>
            <div style={{display:"flex",flexDirection:"column",gap:8,margin:"12px 0"}}>
              {results.map(o=>(
                <div key={o.id} style={{display:"flex",alignItems:"center",gap:10,background:"#f8f8f8",borderRadius:12,padding:"10px 14px"}}>
                  <span style={{fontSize:18}}>{ORGA_EMOJI[o.type]||"🎪"}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontWeight:700,fontSize:13,margin:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{o.name}</p>
                    <p style={{fontSize:11,color:"#999",margin:0}}>{o.type}{o.city?" · "+o.city:""}</p>
                  </div>
                  {o.owner_id
                    ? <span style={{fontSize:11,fontWeight:700,color:"#bbb",flexShrink:0}}>Déjà gérée</span>
                    : <button disabled={saving} onClick={()=>claim(o)} style={{background:GREEN,color:WHITE,fontWeight:700,fontSize:11.5,padding:"7px 12px",borderRadius:99,border:"none",cursor:"pointer",flexShrink:0}}>📨 Demander le contrôle</button>}
                </div>
              ))}
              {q.trim().length>=2 && results.length===0 && <p style={{fontSize:12,color:"#bbb",textAlign:"center",margin:"8px 0"}}>Aucun organisme trouvé pour « {q} »</p>}
            </div>
            <button onClick={()=>{setForm({...form,name:q.trim()});setMode("create")}} style={{width:"100%",background:RED,color:WHITE,fontWeight:700,fontSize:13.5,padding:"12px 0",borderRadius:14,border:"none",cursor:"pointer"}}>
              ➕ Mon organisme n'existe pas — le créer
            </button>
            <button onClick={dismiss} style={{width:"100%",background:"none",color:"#999",fontWeight:600,fontSize:12.5,padding:"12px 0 0",border:"none",cursor:"pointer"}}>Plus tard</button>
          </>) : (<>
            <form onSubmit={create} style={{display:"flex",flexDirection:"column",gap:10}}>
              <input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Nom de l'organisme *" style={inp}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} style={inp}>
                  {Object.keys(ORGA_COLORS).map(t=><option key={t} value={t}>{t}</option>)}
                </select>
                <input value={form.city} onChange={e=>setForm({...form,city:e.target.value})} placeholder="Ville" style={inp}/>
              </div>
              <textarea value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder="Présentation (2-3 phrases)" rows={3} style={{...inp,resize:"vertical",fontFamily:"system-ui,sans-serif"}}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <input value={form.fb} onChange={e=>setForm({...form,fb:e.target.value})} placeholder="Lien Facebook" style={inp}/>
                <input value={form.insta} onChange={e=>setForm({...form,insta:e.target.value})} placeholder="Lien Instagram" style={inp}/>
              </div>
              <button type="submit" disabled={saving} style={{background:GREEN,color:WHITE,fontWeight:700,fontSize:14,padding:"12px 0",borderRadius:14,border:"none",cursor:"pointer"}}>{saving?"...":"🎉 Créer ma fiche dans l'annuaire"}</button>
              <button type="button" onClick={()=>setMode("search")} style={{background:"none",color:"#999",fontWeight:600,fontSize:12.5,padding:"4px 0",border:"none",cursor:"pointer"}}>← Retour à la recherche</button>
            </form>
          </>)}
        </div>
      </div>
    </div>
  )
}

/* ── Statistiques orga (onglet profil) ────────────── */
function OrgaStatsTab({ user, orgas, events }) {
  const [stats,setStats] = useState(null)
  const myOrga = orgas.find(o=>o.owner_id===user.id)
  const myEvents = myOrga ? events.filter(e=>eventBelongsToOrga(e,myOrga)) : []

  useEffect(()=>{ fetchStats() },[])
  const fetchStats = async () => {
    const ids = myEvents.map(e=>e.id)
    const [ints,cmts,rems,fols,actus] = await Promise.all([
      ids.length?supabase.from('event_interests').select('*',{count:'exact',head:true}).in('event_id',ids):{count:0},
      ids.length?supabase.from('comments').select('*',{count:'exact',head:true}).in('event_id',ids):{count:0},
      ids.length?supabase.from('email_reminders').select('*',{count:'exact',head:true}).in('event_id',ids):{count:0},
      myOrga?supabase.from('orga_follows').select('*',{count:'exact',head:true}).eq('orga_id',myOrga.id):{count:0},
      myOrga?supabase.from('orga_posts').select('*',{count:'exact',head:true}).eq('orga_id',myOrga.id):{count:0},
    ])
    setStats({ints:ints.count||0,cmts:cmts.count||0,rems:rems.count||0,fols:fols.count||0,actus:actus.count||0})
  }

  if (!myOrga) return <p style={{fontSize:13,color:"#999",textAlign:"center",padding:"20px 0"}}>Relie d'abord ton organisme (recharge la page pour relancer l'assistant 🎪).</p>

  const Cell = ({n,l,e}) => (
    <div style={{background:"#f8f8f8",borderRadius:14,padding:"14px 10px",textAlign:"center"}}>
      <p style={{fontSize:20,margin:"0 0 2px"}}>{e}</p>
      <p style={{fontWeight:900,fontSize:22,color:"#111",margin:0}}>{n??"…"}</p>
      <p style={{fontSize:11,color:"#999",margin:0}}>{l}</p>
    </div>
  )
  return (
    <div>
      <p style={{fontSize:13,fontWeight:800,color:"#111",margin:"0 0 10px"}}>🎪 {myOrga.name}</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Cell n={myEvents.length} l="Événements sur le site" e="📅"/>
        <Cell n={stats?.ints} l="Personnes intéressées" e="👀"/>
        <Cell n={stats?.rems} l="Rappels programmés" e="🔔"/>
        <Cell n={stats?.cmts} l="Commentaires reçus" e="💬"/>
        <Cell n={stats?.fols} l="Abonnés à ta fiche" e="👥"/>
        <Cell n={stats?.actus} l="Actus publiées" e="📣"/>
      </div>
      <p style={{fontSize:11,color:"#bbb",margin:"12px 0 0",textAlign:"center"}}>📈 Statistiques avancées (vues, clics billetterie, courbes) — bientôt avec le forfait Pro.</p>
    </div>
  )
}

/* ── Réseau personnel : abonnés, abonnements et fiches suivies ── */
function NetworkTab({ user, orgas }) {
  const [followers,setFollowers] = useState([])
  const [following,setFollowing] = useState([])
  const [followedOrgas,setFollowedOrgas] = useState([])
  const [loading,setLoading] = useState(true)

  useEffect(()=>{
    let alive = true
    ;(async()=>{
      const [{data: followerRows},{data: followingRows},{data: orgaRows}] = await Promise.all([
        supabase.from('follows').select('follower_id').eq('following_id',user.id).order('created_at',{ascending:false}),
        supabase.from('follows').select('following_id').eq('follower_id',user.id).order('created_at',{ascending:false}),
        supabase.from('orga_follows').select('orga_id').eq('user_id',user.id).order('created_at',{ascending:false})
      ])
      const followerIds = (followerRows||[]).map(x=>x.follower_id)
      const followingIds = (followingRows||[]).map(x=>x.following_id)
      const orgaIds = (orgaRows||[]).map(x=>x.orga_id)
      const [{data: followerProfiles},{data: followingProfiles},{data: followed}] = await Promise.all([
        followerIds.length ? supabase.from('profiles').select('id,username,avatar_url,code_postal').in('id',followerIds) : {data:[]},
        followingIds.length ? supabase.from('profiles').select('id,username,avatar_url,code_postal').in('id',followingIds) : {data:[]},
        orgaIds.length ? supabase.from('organisateurs').select('id,name,type,city').in('id',orgaIds) : {data:[]}
      ])
      if (!alive) return
      const order = (rows,ids) => ids.map(id=>(rows||[]).find(x=>x.id===id)).filter(Boolean)
      setFollowers(order(followerProfiles,followerIds)); setFollowing(order(followingProfiles,followingIds)); setFollowedOrgas(order(followed,orgaIds)); setLoading(false)
    })()
    return ()=>{alive=false}
  },[user.id])

  const Person = ({p}) => <div style={{display:'flex',alignItems:'center',gap:10,padding:'9px 0',borderBottom:'1px solid #f1f1f1'}}>
    <div style={{width:34,height:34,borderRadius:'50%',background:'#f4e2e5',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,color:RED}}>{p.avatar_url?<img src={p.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:(p.username||'?')[0].toUpperCase()}</div>
    <div><p style={{fontSize:13,fontWeight:700,color:'#222',margin:0}}>{p.username||'Membre'}</p>{p.code_postal&&<p style={{fontSize:11,color:'#999',margin:'2px 0 0'}}>📍 {p.code_postal}</p>}</div>
  </div>
  const Section = ({icon,title,children,empty}) => <div style={{marginBottom:20}}>
    <p style={{fontSize:13,fontWeight:800,color:'#333',margin:'0 0 7px'}}>{icon} {title}</p>
    {children?.length ? children : <p style={{fontSize:12,color:'#aaa',margin:0,lineHeight:1.45}}>{empty}</p>}
  </div>

  if (loading) return <p style={{fontSize:13,color:'#aaa',textAlign:'center',padding:'22px 0'}}>Chargement de ton réseau…</p>
  return <div>
    <p style={{fontSize:12.5,color:'#777',lineHeight:1.5,margin:'0 0 18px'}}>Ici, tu retrouves les membres qui te suivent, ceux que tu suis et les organisations dont tu reçois les actualités.</p>
    <Section icon="👥" title={`Mes abonnés · ${followers.length}`} empty="Personne ne te suit encore. Publie dans la communauté pour te faire connaître.">{followers.map(p=><Person key={p.id} p={p}/>)}</Section>
    <Section icon="🤝" title={`Mes abonnements · ${following.length}`} empty="Tu ne suis encore aucun membre.">{following.map(p=><Person key={p.id} p={p}/>)}</Section>
    <Section icon="🎪" title={`Organisateurs suivis · ${followedOrgas.length}`} empty="Va dans Organisateurs et appuie sur « Suivre » pour recevoir leurs actus.">{followedOrgas.map(o=><div key={o.id} style={{padding:'9px 0',borderBottom:'1px solid #f1f1f1'}}><p style={{fontSize:13,fontWeight:700,margin:0,color:'#222'}}>{o.name}</p><p style={{fontSize:11,color:'#999',margin:'2px 0 0'}}>{o.type}{o.city?` · ${o.city}`:''}</p></div>)}</Section>
  </div>
}

function OrgaIdentityTab({ orga, user, onUpdated }) {
  const [form,setForm] = useState({...orga})
  const [saving,setSaving] = useState(false)
  const [uploading,setUploading] = useState(false)
  useEffect(()=>setForm({...orga}),[orga.id])
  const inp = {width:'100%',boxSizing:'border-box',border:'1.5px solid #e5e5e5',borderRadius:12,padding:'10px 12px',fontSize:13,outline:'none'}
  const save = async () => {
    if (!form.name?.trim()) return
    setSaving(true)
    const payload = {name:form.name.trim(),city:form.city||'',region:form.region||'',note:form.note||'',contact:form.contact||'',fb:form.fb||'',insta:form.insta||'',site:form.site||'',logo_url:form.logo_url||'',brand_color:safeHexColor(form.brand_color)||''}
    const {data,error} = await supabase.from('organisateurs').update(payload).eq('id',orga.id).select().single()
    setSaving(false)
    if (error) { alert('⚠️ Modification impossible ('+error.message+')'); return }
    onUpdated?.(data)
  }
  return <div style={{display:'flex',flexDirection:'column',gap:12}}>
    <div style={{background:'#f7faf8',border:'1px solid #dcefe3',borderRadius:14,padding:'12px 14px'}}><p style={{fontSize:13,fontWeight:800,color:GREEN,margin:0}}>🎪 Profil organisateur actif</p><p style={{fontSize:12,color:'#68736c',lineHeight:1.45,margin:'4px 0 0'}}>Ces informations représentent l’organisation dans la communauté, pas ton compte personnel.</p></div>
    <div style={{display:'flex',alignItems:'center',gap:12}}><div style={{width:58,height:58,borderRadius:'50%',background:safeHexColor(form.brand_color)||RED,display:'grid',placeItems:'center',overflow:'hidden',color:WHITE,fontSize:22,fontWeight:900}}>{form.logo_url?<img src={form.logo_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:(form.name||'?')[0].toUpperCase()}</div><label htmlFor={`profile-orga-logo-${orga.id}`} style={{background:'#f2f2f2',color:'#555',fontSize:12,fontWeight:700,padding:'9px 12px',borderRadius:10,cursor:'pointer'}}>{uploading?'⏳ Préparation…':'📷 Changer le logo'}</label><input id={`profile-orga-logo-${orga.id}`} type="file" accept="image/*" style={{display:'none'}} onChange={async e=>{const f=e.target.files?.[0];if(!f)return;setUploading(true);const r=await imageFileToCompactDataUrl(f);if(r.error)alert('⚠️ '+r.error);else setForm({...form,logo_url:r.url});setUploading(false)}}/></div>
    <input value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Nom de l'organisation" style={inp}/>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}><input value={form.city||''} onChange={e=>setForm({...form,city:e.target.value})} placeholder="Ville" style={inp}/><input value={form.region||''} onChange={e=>setForm({...form,region:e.target.value})} placeholder="Région" style={inp}/></div>
    <textarea value={form.note||''} onChange={e=>setForm({...form,note:e.target.value})} placeholder="Présentation de l'organisation" rows={4} style={{...inp,resize:'vertical',fontFamily:'system-ui,sans-serif'}}/>
    <input value={form.contact||''} onChange={e=>setForm({...form,contact:e.target.value})} placeholder="Contact public" style={inp}/>
    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{['#111827','#5B21B6','#7E3F8F','#0C4A6E','#0F766E','#A84A1C','#6D2032','#4B5563'].map(c=><button type="button" key={c} onClick={()=>setForm({...form,brand_color:c})} style={{width:29,height:29,borderRadius:'50%',background:c,border:safeHexColor(form.brand_color)===c?'3px solid #111':'3px solid #fff',boxShadow:'0 0 0 1px #ddd',cursor:'pointer'}}/>)}</div>
    <button onClick={save} disabled={saving} style={{background:GREEN,color:WHITE,fontWeight:800,fontSize:13,padding:'11px 0',border:'none',borderRadius:12,cursor:'pointer'}}>{saving?'...':'✓ Sauvegarder le profil organisateur'}</button>
  </div>
}

function ProfileModal({ user, userProfile, onClose, onSignOut, onUpdate, orgas = [], events = [], onGoPro, onGoPremium, activeOrga, onSwitchIdentity, onUpdateOrga, initialTab = "profil" }) {
  const [tab,setTab]         = useState(initialTab)
  const [username,setUsername] = useState(userProfile?.username||"")
  const [avatarUrl,setAvatarUrl] = useState(userProfile?.avatar_url||"")
  const [codePostal,setCodePostal] = useState(userProfile?.code_postal||"")
  const [saving,setSaving]   = useState(false)
  const [saved,setSaved]     = useState(false)
  const [uploading,setUploading] = useState(false)

  const nameChangeAt = userProfile?.username_changed_at ? new Date(userProfile.username_changed_at) : null
  const nextNameChangeAt = nameChangeAt ? new Date(nameChangeAt.getTime()+5*24*60*60*1000) : null
  const nameLocked = !!(nextNameChangeAt && nextNameChangeAt > new Date())
  const nameChangeLabel = nameLocked
    ? `Tu pourras modifier ton pseudo le ${nextNameChangeAt.toLocaleDateString('fr-FR',{day:'numeric',month:'long'})}.`
    : 'Tu peux modifier ton pseudo maintenant. Ensuite, il faudra attendre 5 jours.'

  const handleSave = async () => {
    if (username.trim() !== (userProfile?.username||'').trim() && nameLocked) {
      alert('⏳ '+nameChangeLabel); return
    }
    if (!username.trim()) { alert('⚠️ Choisis un pseudo.'); return }
    setSaving(true)
    if (await usernameAlreadyUsed(username,user.id)) {
      setSaving(false); alert("⚠️ Ce nom d’utilisateur est déjà utilisé. Choisis-en un autre."); return
    }
    const { data, error } = await supabase.from('profiles').update({ username, avatar_url:avatarUrl, code_postal:codePostal }).eq('id',user.id).select().single()
    setSaving(false)
    if (error) {
      const duplicate = /duplicate|unique|déjà utilisé/i.test(error.message||"")
      alert(duplicate ? "⚠️ Ce nom d’utilisateur est déjà utilisé. Choisis-en un autre." : "⚠️ Non enregistré : "+error.message)
      return
    }
    // On applique ce que la base a RÉELLEMENT enregistré (au cas où un garde-fou modifie un champ)
    onUpdate({...userProfile, ...(data||{username,avatar_url:avatarUrl,code_postal:codePostal})})
    setSaved(true); setTimeout(()=>setSaved(false),2000)
  }

  const handleUpload = async e => {
    const file = e.target.files?.[0]; if (!file) return
    if (file.size > 5*1024*1024) { alert("Photo trop lourde (max 5 Mo)."); return }
    if (!file.type.startsWith("image/")) { alert("Choisis une image."); return }
    setUploading(true)
    const ext = (file.name.split(".").pop()||"jpg").toLowerCase()
    const path = `${user.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, {upsert:true, cacheControl:"3600"})
    if (error) { alert("⚠️ Envoi impossible ("+error.message+").\nAs-tu créé le bucket « avatars » dans Supabase ?"); setUploading(false); return }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    setAvatarUrl(data.publicUrl)
    setUploading(false)
  }

  const initiale = (userProfile?.username||user?.email||"?")[0].toUpperCase()
  const inp = {width:"100%",border:"1.5px solid #e5e5e5",borderRadius:12,padding:"10px 14px",fontSize:13,outline:"none",boxSizing:"border-box"}
  const lbl = {fontSize:12,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:.5,display:"block",marginBottom:6}

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:90,padding:16}}>
      <div style={{background:WHITE,borderRadius:24,width:"100%",maxWidth:420,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(0,0,0,0.25)"}}>
        <div style={{background:RED,borderRadius:"24px 24px 0 0",padding:"28px 24px 20px",textAlign:"center"}}>
          <div style={{width:72,height:72,borderRadius:"50%",background:WHITE,margin:"0 auto 12px",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",border:"3px solid rgba(255,255,255,0.3)"}}>
            {activeOrga?.logo_url ? <img src={activeOrga.logo_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : activeOrga ? <span style={{fontSize:28,fontWeight:800,color:activeOrga.brand_color||RED}}>{activeOrga.name[0]?.toUpperCase()}</span> : avatarUrl ? <img src={avatarUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <span style={{fontSize:28,fontWeight:800,color:RED}}>{initiale}</span>}
          </div>
          <h2 style={{color:WHITE,fontWeight:800,fontSize:18,margin:"0 0 4px"}}>{activeOrga?.name||userProfile?.username||user?.email?.split("@")[0]}</h2>
          <p style={{color:"rgba(255,255,255,0.7)",fontSize:12,margin:0}}>{activeOrga?'🎪 Identité organisateur':user?.email}</p>
          {userProfile?.code_postal && <p style={{color:"rgba(255,255,255,0.6)",fontSize:11,margin:"4px 0 0"}}>📍 {userProfile.code_postal}</p>}
          {userProfile?.is_member && <span style={{background:GREEN,color:WHITE,fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:99,display:"inline-block",marginTop:8}}>✓ Membre 2,50€/mois</span>}
        </div>
        <div style={{display:"flex",height:4}}><div style={{flex:1,background:"#eee"}}/><div style={{flex:2,background:RED}}/><div style={{flex:2,background:GREEN}}/></div>
        {orgas.filter(o=>o.owner_id===user.id).length>0 && <div style={{display:'flex',gap:7,overflowX:'auto',padding:'12px 20px 0'}}><button onClick={()=>onSwitchIdentity?.(null)} style={{background:!activeOrga?RED:'#f2f2f2',color:!activeOrga?WHITE:'#666',border:'none',borderRadius:99,padding:'7px 11px',fontSize:11,fontWeight:800,cursor:'pointer',whiteSpace:'nowrap'}}>👤 {userProfile?.username||'Moi'}</button>{orgas.filter(o=>o.owner_id===user.id).map(o=><button key={o.id} onClick={()=>onSwitchIdentity?.(o.id)} style={{background:activeOrga?.id===o.id?(safeHexColor(o.brand_color)||GREEN):'#f2f2f2',color:activeOrga?.id===o.id?WHITE:'#666',border:'none',borderRadius:99,padding:'7px 11px',fontSize:11,fontWeight:800,cursor:'pointer',whiteSpace:'nowrap'}}>🎪 {o.name}</button>)}</div>}
        <div style={{display:"flex",padding:"16px 24px 0"}}>
          {(activeOrga
            ? [["profil","🎪 Profil orga"],["reseau","👥 Réseau"],["stats","📊 Statistiques"],["compte","⚙️ Compte"]]
            : userProfile?.plan==="organisateur"
            ? [["profil","👤 Mon profil"],["reseau","👥 Réseau"],["stats","📊 Statistiques"],["compte","⚙️ Compte"]]
            : [["profil","👤 Mon profil"],["reseau","👥 Réseau"],["interets","🎯 Intérêts"],["compte","⚙️ Compte"]]).map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:"8px 0",border:"none",cursor:"pointer",fontWeight:700,fontSize:13,background:"none",color:tab===k?RED:"#aaa",borderBottom:tab===k?`2px solid ${RED}`:"2px solid transparent"}}>{l}</button>
          ))}
        </div>
        <div style={{padding:24}}>
          {tab==="profil" && activeOrga ? <OrgaIdentityTab orga={activeOrga} user={user} onUpdated={onUpdateOrga}/> : tab==="profil" && (
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div><label style={lbl}>Pseudo</label><input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Ton pseudo" disabled={nameLocked} style={{...inp,background:nameLocked?'#f5f5f5':WHITE,color:nameLocked?'#999':'#222'}}/><p style={{fontSize:11,color:nameLocked?'#a36b00':'#888',lineHeight:1.4,margin:'6px 0 0'}}>{nameLocked?'⏳ ': '✏️ '}{nameChangeLabel}</p></div>
              <div><label style={lbl}>Code postal</label><input value={codePostal} onChange={e=>setCodePostal(e.target.value)} placeholder="75011" style={inp}/></div>
              <div>
                <label style={lbl}>Avatar</label>
                <div style={{display:"flex",gap:10,marginBottom:10,flexWrap:"wrap"}}>
                  {AVATARS.map((a,i)=>(
                    <div key={i} onClick={()=>setAvatarUrl(a)} style={{width:52,height:52,borderRadius:"50%",overflow:"hidden",cursor:"pointer",border:avatarUrl===a?`3px solid ${RED}`:"3px solid transparent",transition:"border .15s",flexShrink:0}}>
                      <img src={a} alt={`avatar${i+1}`} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    </div>
                  ))}
                </div>
                <label htmlFor="avatar-upload" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:RED,color:WHITE,fontWeight:700,fontSize:13,padding:"11px 0",borderRadius:12,cursor:"pointer",marginTop:6}}>
                  {uploading?"⏳ Envoi en cours...":"📷 Importer une photo"}
                </label>
                <input id="avatar-upload" type="file" accept="image/*" onChange={handleUpload} disabled={uploading} style={{display:"none"}}/>
                <p style={{fontSize:11,color:"#bbb",margin:"6px 0 0",textAlign:"center"}}>JPG ou PNG, 5 Mo max — depuis ton téléphone ou ton ordi</p>
                <details style={{marginTop:10}}>
                  <summary style={{fontSize:12,color:"#999",cursor:"pointer"}}>Ou coller un lien d'image</summary>
                  <input value={AVATARS.includes(avatarUrl)?"":avatarUrl} onChange={e=>setAvatarUrl(e.target.value)} placeholder="https://ma-photo.com/moi.jpg" style={{...inp,marginTop:8}}/>
                </details>
                {avatarUrl && !AVATARS.includes(avatarUrl) && <img src={avatarUrl} alt="" style={{width:64,height:64,borderRadius:"50%",objectFit:"cover",marginTop:10,border:"2px solid #eee"}}/>}
              </div>
              <div style={{background:"#f8f8f8",borderRadius:12,padding:14}}>
                <p style={{fontSize:12,fontWeight:700,color:"#999",textTransform:"uppercase",margin:"0 0 4px"}}>Email</p>
                <p style={{fontSize:14,color:"#555",margin:0}}>{user?.email}</p>
              </div>
              <div style={{background:"#f8f8f8",borderRadius:12,padding:14}}>
                <p style={{fontSize:12,fontWeight:700,color:"#999",textTransform:"uppercase",margin:"0 0 4px"}}>Membre depuis</p>
                <p style={{fontSize:14,color:"#555",margin:0}}>{userProfile?.created_at?new Date(userProfile.created_at).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}):"—"}</p>
              </div>
              <button onClick={handleSave} disabled={saving} style={{background:saved?GREEN:RED,color:WHITE,fontWeight:700,fontSize:14,padding:"12px 0",borderRadius:14,border:"none",cursor:"pointer",opacity:saving?.7:1}}>
                {saved?"✓ Sauvegardé !":saving?"...":"Sauvegarder"}
              </button>
            </div>
          )}
          {tab==="interets" && userProfile?.plan!=="organisateur" && (
            <InterestTabContent user={user} userProfile={userProfile} onUpdate={onUpdate}/>
          )}
          {tab==="reseau" && <NetworkTab user={user} orgas={orgas}/>} 
          {tab==="stats" && userProfile?.plan==="organisateur" && (
            <OrgaStatsTab user={user} orgas={orgas} events={events}/>
          )}
          {tab==="compte" && (
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{background:"#f8f8f8",borderRadius:14,padding:16}}>
                <p style={{fontSize:12,fontWeight:700,color:"#999",textTransform:"uppercase",margin:"0 0 8px"}}>Mon pack</p>
                {userProfile?.plan==="pro" ? (
                  <><p style={{fontSize:15,fontWeight:800,margin:"0 0 6px"}}>⭐ Pack Premium</p>
                  <ul style={{margin:0,paddingLeft:18,fontSize:12.5,color:"#666",lineHeight:1.7}}>
                    <li>Badge ⭐ Premium doré sur ton profil et tes posts</li>
                    <li>Tes publications <b>mises en avant</b> dans la communauté</li>
                    <li>Tu soutiens Malagasy Events 🇲🇬</li>
                  </ul></>
                ) : userProfile?.plan==="organisateur" ? (
                  <><p style={{fontSize:15,fontWeight:800,margin:"0 0 6px"}}>🎪 Pack Pro <span style={{fontSize:11,fontWeight:700,color:GREEN}}>· actif</span></p>
                  <p style={{fontSize:11,fontWeight:700,color:"#999",textTransform:"uppercase",margin:"10px 0 4px"}}>✅ Tes 4 bénéfices inclus</p>
                  <ul style={{margin:0,paddingLeft:18,fontSize:12.5,color:"#666",lineHeight:1.7}}>
                    <li>Badge 🎪 partout : posts, commentaires, discussions</li>
                    <li>Ta fiche dans l'annuaire <b>Organisateurs</b>, gérée par toi</li>
                    <li>Actus publiées sur ta fiche</li>
                    <li>Onglet 📊 Statistiques de tes événements</li>
                  </ul>
                  <p style={{fontSize:11,fontWeight:700,color:"#999",textTransform:"uppercase",margin:"12px 0 4px"}}>🔒 À débloquer avec le forfait Pro</p>
                  <ul style={{margin:0,paddingLeft:18,fontSize:12.5,color:"#aaa",lineHeight:1.7}}>
                    <li>🔔 Rappels boostés aux intéressés à J-3</li>
                    <li>📆 Calendrier intégrable sur ton site</li>
                    <li>🔁 Événements récurrents automatiques</li>
                    <li>📈 Statistiques avancées + 1 mise en avant ⭐/mois</li>
                  </ul>
                  <button onClick={()=>{onGoPro&&onGoPro();onClose()}} style={{width:"100%",background:"linear-gradient(135deg,#b8860b,#e6b31e)",color:WHITE,fontWeight:800,fontSize:13,padding:"11px 0",borderRadius:12,border:"none",cursor:"pointer",marginTop:12}}>⭐ Découvrir le forfait Pro →</button></>
                ) : (
                  <><p style={{fontSize:15,fontWeight:700,color:"#555",margin:"0 0 8px"}}>○ Compte gratuit</p>
                  <p style={{fontSize:12,color:"#999",margin:"0 0 6px",lineHeight:1.5}}>Passe en 🎪 Pro ou ⭐ Premium pour publier tes événements directement et gagner en visibilité.</p>
                  <button onClick={()=>{onGoPremium&&onGoPremium();onClose()}} style={{width:"100%",background:"linear-gradient(135deg,#3C3489,#26215C)",color:WHITE,fontWeight:800,fontSize:13,padding:"11px 0",borderRadius:12,border:"none",cursor:"pointer",marginTop:8}}>💜 Découvrir Membre Premium — 2,50 €/mois</button>
                  <p style={{fontSize:11,color:"#bbb",margin:"8px 0 0"}}>Organisateur ? Contacte-nous via la Communauté pour activer ton pack 🎪.</p></>
                )}
              </div>
              <a href="/mes-droits" onClick={onClose} style={{display:"block",textAlign:"center",background:"#eef6f1",color:GREEN,fontWeight:800,fontSize:13,padding:"11px 12px",borderRadius:12,textDecoration:"none"}}>🔐 Accéder, corriger ou supprimer mes données</a>
              <button onClick={()=>{onSignOut();onClose()}} style={{background:"#f5f5f5",color:"#e53935",fontWeight:700,fontSize:14,padding:"12px 0",borderRadius:14,border:"none",cursor:"pointer",marginTop:8}}>Se déconnecter</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── AuthModal ────────────────────────────────────── */
/* ── TicketModal : billet QR à usage unique (events partenaires) ── */
function TicketModal({ event, user, onClose, onAuthRequired }) {
  const [ticket,setTicket] = useState(null)
  const [qr,setQr] = useState("")
  const [loading,setLoading] = useState(true)
  const [err,setErr] = useState("")
  useEffect(()=>{
    if (!user) { onAuthRequired?.(); onClose(); return }
    (async()=>{
      // Récupère le billet existant, sinon en crée un
      let {data} = await supabase.from('tickets').select('*').eq('event_id',event.id).eq('user_id',user.id).maybeSingle()
      if (!data) {
        const code = "MEV-"+event.id+"-"+(crypto.randomUUID?crypto.randomUUID().slice(0,8):Math.random().toString(36).slice(2,10)).toUpperCase()
        const ins = await supabase.from('tickets').insert({event_id:event.id,user_id:user.id,code}).select().single()
        if (ins.error) { setErr(ins.error.message); setLoading(false); return }
        data = ins.data
      }
      setTicket(data)
      try { setQr(await QRCode.toDataURL("MEV-TICKET:"+data.code, {width:260,margin:1,color:{dark:"#111111",light:"#ffffff"}})) } catch(e){ setErr("QR indisponible") }
      setLoading(false)
    })()
  },[event.id])
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:120,padding:16}}>
      <div style={{background:WHITE,borderRadius:24,width:"100%",maxWidth:360,padding:26,boxShadow:"0 24px 80px rgba(0,0,0,0.3)",textAlign:"center"}}>
        <button onClick={onClose} style={{position:"absolute",top:0,right:0,background:"none",border:"none",fontSize:24,color:"#bbb",cursor:"pointer",padding:16}}>×</button>
        <p style={{fontSize:11,fontWeight:800,letterSpacing:2,color:RED,textTransform:"uppercase",margin:"0 0 4px"}}>🎟️ Billet partenaire</p>
        <h3 style={{fontWeight:800,fontSize:17,color:"#111",margin:"0 0 2px"}}>{event.title}</h3>
        <p style={{fontSize:12,color:"#888",margin:"0 0 16px"}}>{fmtShort(event.date)} · {event.city}</p>
        {loading ? <p style={{color:"#bbb",padding:"40px 0"}}>Génération du billet…</p>
         : err ? <p style={{color:RED,fontSize:13,padding:"20px 0"}}>⚠️ {err}</p>
         : ticket?.used ? (
            <div style={{padding:"20px 0"}}>
              <p style={{fontSize:40,margin:"0 0 8px"}}>✅</p>
              <p style={{fontWeight:800,color:GREEN,fontSize:16}}>Billet déjà utilisé</p>
              <p style={{fontSize:12,color:"#999"}}>Validé le {ticket.used_at?new Date(ticket.used_at).toLocaleString('fr-FR'):""}</p>
            </div>
         ) : (<>
            <div style={{display:"inline-block",padding:14,background:WHITE,border:"2px solid #f0f0f0",borderRadius:18}}>
              <img src={qr} alt="QR billet" style={{width:220,height:220,display:"block"}}/>
            </div>
            <p style={{fontSize:13,color:"#555",margin:"14px 0 2px",fontWeight:700}}>Code : {ticket?.code}</p>
            <p style={{fontSize:12,color:"#999",margin:0,lineHeight:1.5}}>Présente ce QR à l'entrée. Il est <b>personnel</b> et <b>à usage unique</b>.</p>
          </>)}
      </div>
    </div>
  )
}

function ResetPasswordModal({ onClose }) {
  const [pw,setPw] = useState("")
  const [pw2,setPw2] = useState("")
  const [msg,setMsg] = useState("")
  const [saving,setSaving] = useState(false)
  const inp = {width:"100%",border:"1.5px solid #e5e5e5",borderRadius:12,padding:"10px 14px",fontSize:14,outline:"none",boxSizing:"border-box"}
  const submit = async e => {
    e.preventDefault()
    if (pw.length<6) { setMsg("Le mot de passe doit faire au moins 6 caractères."); return }
    if (pw!==pw2) { setMsg("Les deux mots de passe ne correspondent pas."); return }
    setSaving(true)
    const {error} = await supabase.auth.updateUser({ password: pw })
    setSaving(false)
    if (error) setMsg("⚠️ "+error.message)
    else { alert("✅ Mot de passe modifié ! Tu es connecté."); onClose() }
  }
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:120,padding:16}}>
      <div style={{background:WHITE,borderRadius:24,width:"100%",maxWidth:380,padding:32,boxShadow:"0 24px 80px rgba(0,0,0,0.3)"}}>
        <div style={{textAlign:"center",marginBottom:20}}><p style={{fontSize:34,margin:"0 0 8px"}}>🔑</p><h2 style={{fontWeight:800,fontSize:19,color:"#111",margin:0}}>Nouveau mot de passe</h2><p style={{fontSize:13,color:"#888",margin:"6px 0 0"}}>Choisis ton nouveau mot de passe.</p></div>
        <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:12}}>
          <input required type="password" value={pw} onChange={e=>{setPw(e.target.value);setMsg("")}} placeholder="Nouveau mot de passe" style={inp}/>
          <input required type="password" value={pw2} onChange={e=>{setPw2(e.target.value);setMsg("")}} placeholder="Confirmer le mot de passe" style={inp}/>
          {msg && <p style={{fontSize:12,color:RED,textAlign:"center",margin:0}}>{msg}</p>}
          <button type="submit" disabled={saving} style={{background:RED,color:WHITE,fontWeight:700,fontSize:14,padding:"12px 0",borderRadius:12,border:"none",cursor:"pointer",opacity:saving?.7:1}}>{saving?"...":"Enregistrer"}</button>
        </form>
      </div>
    </div>
  )
}

function AuthModal({ onClose, onSuccess }) {
  const [tab,setTab]         = useState("login")
  const [email,setEmail]     = useState("")
  const [pw,setPw]           = useState("")
  const [username,setUsername] = useState("")
  const [codePostal,setCodePostal] = useState("")
  const [error,setError]     = useState("")
  const [loading,setLoading] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault(); setError(""); setLoading(true)
    if (tab==="login") {
      const {error} = await supabase.auth.signInWithPassword({email,password:pw})
      if (error) setError("Email ou mot de passe incorrect")
      else { onSuccess(false); onClose() }
    } else {
      const chosenUsername = (username||email.split('@')[0]).trim()
      if (await usernameAlreadyUsed(chosenUsername)) {
        setError("Ce nom d’utilisateur est déjà utilisé. Choisis-en un autre.")
        setLoading(false)
        return
      }
      const {data,error} = await supabase.auth.signUp({
        email, password:pw,
        options:{ data:{ username: chosenUsername, code_postal: codePostal||null } }
      })
      if (error) { setError(error?.message||"Erreur lors de la création du compte") }
      else {
        // Le trigger Supabase crée le profil automatiquement
        // On tente aussi un upsert au cas où (session dispo = confirmation désactivée)
        if (data?.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            username: chosenUsername,
            code_postal: codePostal||null
          }, { onConflict:'id' })
        }
        onSuccess(true); onClose()
      }
    }
    setLoading(false)
  }

  const forgotPassword = async () => {
    if (!email.trim()) { setError("Entre ton email ci-dessus, puis reclique sur « Mot de passe oublié »."); return }
    setLoading(true); setError("")
    const {error} = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: SITE_URL })
    setLoading(false)
    if (error) setError(error.message)
    else setError("✅ Email envoyé ! Regarde ta boîte mail (et les spams) pour réinitialiser ton mot de passe.")
  }

  const inp = {width:"100%",border:"1.5px solid #e5e5e5",borderRadius:12,padding:"10px 14px",fontSize:14,outline:"none",boxSizing:"border-box"}

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:90,padding:16}}>
      <div style={{background:WHITE,borderRadius:24,width:"100%",maxWidth:380,padding:32,boxShadow:"0 24px 80px rgba(0,0,0,0.3)"}}>
        <div style={{textAlign:"center",marginBottom:24}}><p style={{fontSize:36,margin:"0 0 8px"}}>🇲🇬</p><h2 style={{fontWeight:800,fontSize:20,color:"#111",margin:0}}>Rejoindre la communauté</h2></div>
        <div style={{display:"flex",background:"#f5f5f5",borderRadius:12,padding:4,marginBottom:24}}>
          {[["login","Connexion"],["signup","Inscription"]].map(([k,l])=>(
            <button key={k} onClick={()=>{setTab(k);setError("")}} style={{flex:1,padding:"8px 0",borderRadius:10,border:"none",cursor:"pointer",fontWeight:700,fontSize:13,background:tab===k?WHITE:"transparent",color:tab===k?"#111":"#999",boxShadow:tab===k?"0 1px 4px rgba(0,0,0,0.1)":"none"}}>{l}</button>
          ))}
        </div>
        <form onSubmit={handleSubmit} style={{display:"flex",flexDirection:"column",gap:12}}>
          {tab==="signup" && <>
            <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Pseudo (ex: Niry_Mada)" style={inp}/>
            <input value={codePostal} onChange={e=>setCodePostal(e.target.value)} placeholder="Code postal (ex: 75011)" style={inp}/>
          </>}
          <input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" style={inp}/>
          <input required type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="Mot de passe" style={inp}/>
          {error && <p style={{fontSize:12,color:error.startsWith("✅")?GREEN:RED,textAlign:"center",margin:0}}>{error}</p>}
          <button type="submit" disabled={loading} style={{background:RED,color:WHITE,fontWeight:700,fontSize:14,padding:"12px 0",borderRadius:12,border:"none",cursor:"pointer",marginTop:4,opacity:loading?.7:1}}>
            {loading?"...":tab==="login"?"Se connecter":"Créer mon compte"}
          </button>
          {tab==="login" && <button type="button" onClick={forgotPassword} style={{background:"none",border:"none",color:"#888",fontSize:12.5,cursor:"pointer",textDecoration:"underline",marginTop:2}}>Mot de passe oublié ?</button>}
        </form>
        <button onClick={onClose} style={{width:"100%",background:"none",border:"none",color:"#aaa",fontSize:13,cursor:"pointer",marginTop:12}}>Annuler</button>
      </div>
    </div>
  )
}

/* ── CommentSection ───────────────────────────────── */
function CommentSection({ eventId, mediaId, postId, user, onAuthRequired }) {
  const [comments,setComments] = useState([])
  const [text,setText]         = useState("")
  const [loading,setLoading]   = useState(false)

  useEffect(()=>{ fetchComments() },[eventId,mediaId,postId])

  const fetchComments = async () => {
    let q = supabase.from('comments').select('*,profiles(username,is_member,plan)').order('created_at',{ascending:true})
    if (mediaId)  q = q.eq('media_id',mediaId)
    else if (eventId) q = q.eq('event_id',eventId)
    const {data} = await q; setComments(data||[])
  }

  const handlePost = async e => {
    e.preventDefault()
    if (!user) { onAuthRequired(); return }
    if (!text.trim()) return
    setLoading(true)
    const {error} = await supabase.from('comments').insert({content:text.trim(),user_id:user.id,...(mediaId?{media_id:mediaId}:{event_id:eventId})})
    setLoading(false)
    if (error) { alert("⚠️ Commentaire non envoyé : "+error.message); return }
    setText(""); await fetchComments()
  }

  const timeAgo = d => { const m=Math.floor((Date.now()-new Date(d))/60000); if(m<1)return"à l'instant"; if(m<60)return`${m}min`; if(m<1440)return`${Math.floor(m/60)}h`; return`${Math.floor(m/1440)}j` }

  return (
    <div style={{borderTop:"1px solid #f0f0f0",paddingTop:16,marginTop:16}}>
      <p style={{fontSize:13,fontWeight:700,color:"#444",margin:"0 0 12px"}}>💬 Commentaires ({comments.length})</p>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:14}}>
        {comments.map(c=>(
          <div key={c.id} style={{display:"flex",gap:10}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:"#f0f0f0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#666",flexShrink:0}}>{(c.profiles?.username||"?")[0].toUpperCase()}</div>
            <div style={{flex:1,background:"#f8f8f8",borderRadius:12,padding:"8px 12px"}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                <span style={{fontSize:12,fontWeight:700,color:isOfficial(c.profiles?.username)?RED:"#111"}}>{c.profiles?.username||"Anonyme"}</span>
                {isOfficial(c.profiles?.username) && <span style={{background:RED,color:WHITE,fontSize:8,fontWeight:800,padding:"1px 5px",borderRadius:99}}>✓ OFFICIEL</span>}
                {!isOfficial(c.profiles?.username) && <PlanBadge plan={c.profiles?.plan} size={8}/>}
                {!isOfficial(c.profiles?.username) && !PLAN_BADGE[c.profiles?.plan] && c.profiles?.is_member && <span style={{background:GREEN,color:WHITE,fontSize:8,fontWeight:800,padding:"1px 5px",borderRadius:99}}>MEMBRE</span>}
                <span style={{fontSize:11,color:"#bbb",marginLeft:"auto"}}>{timeAgo(c.created_at)}</span>
              </div>
              <p style={{fontSize:13,color:"#333",margin:0}}>{c.content}</p>
            </div>
          </div>
        ))}
        {comments.length===0 && <p style={{fontSize:12,color:"#bbb",textAlign:"center",margin:0}}>Sois le premier à commenter 👇</p>}
      </div>
      <form onSubmit={handlePost} style={{display:"flex",gap:8}}>
        <input value={text} onChange={e=>setText(e.target.value)} placeholder={user?"Ajouter un commentaire...":"Connecte-toi pour commenter"} style={{flex:1,border:"1.5px solid #e5e5e5",borderRadius:99,padding:"8px 14px",fontSize:13,outline:"none"}}/>
        <button type="submit" disabled={loading||!text.trim()} style={{background:RED,color:WHITE,fontWeight:700,fontSize:13,padding:"8px 16px",borderRadius:99,border:"none",cursor:"pointer",opacity:!text.trim()?.5:1}}>
          {loading?"...":"→"}
        </button>
      </form>
    </div>
  )
}

/* ── ShareMenu ────────────────────────────────────── */
function ShareMenu({ ev, onClose }) {
  const [copied,setCopied] = useState("")

  const platforms = [
    {id:"whatsapp", label:"WhatsApp",  emoji:"💬", bg:"#25D366", fg:WHITE},
    {id:"facebook", label:"Facebook",  emoji:"📘", bg:"#1877F2", fg:WHITE},
    {id:"instagram",label:"Instagram", emoji:"📸", bg:"linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)", fg:WHITE},
    {id:"tiktok",   label:"TikTok",    emoji:"🎵", bg:"#000",    fg:WHITE},
  ]

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16}}>
      <div style={{background:WHITE,borderRadius:20,padding:24,width:"100%",maxWidth:320,boxShadow:"0 16px 48px rgba(0,0,0,0.25)"}}>
        <h3 style={{fontWeight:800,fontSize:16,margin:"0 0 16px",textAlign:"center"}}>📤 Partager l'événement</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          {platforms.map(p=>(
            <button key={p.id} onClick={()=>{ doShare(ev,p.id,setCopied) }} style={{background:p.bg,color:p.fg,fontWeight:700,fontSize:13,padding:"12px 8px",borderRadius:12,border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <span style={{fontSize:22}}>{p.emoji}</span>
              <span>{copied===p.id?"✓ Copié !":p.label}</span>
            </button>
          ))}
        </div>
        <button onClick={()=>{ navigator.clipboard.writeText(`${SITE_URL}/evenement/${slugify(ev.title)}`); setCopied('link') }} style={{width:"100%",background:"#f5f5f5",color:"#333",fontWeight:700,fontSize:13,padding:"10px 0",borderRadius:12,border:"none",cursor:"pointer"}}>
          {copied==='link'?"✓ Lien copié !":"🔗 Copier le lien"}
        </button>
        <button onClick={onClose} style={{width:"100%",background:"none",border:"none",color:"#aaa",fontSize:13,cursor:"pointer",marginTop:8}}>Fermer</button>
      </div>
    </div>
  )
}

/* ── Rappels : agenda (notif native du téléphone) + notif navigateur ── */
const icsStamp = d => String(d).replace(/-/g,"")               // 2026-07-24 -> 20260724
const nextDay  = ymd => { const d=new Date(ymd+"T00:00:00"); d.setDate(d.getDate()+1); return d.toISOString().slice(0,10).replace(/-/g,"") }
const gCalUrl = ev => {
  const loc = [ev.location,ev.city].filter(Boolean).join(", ")
  const p = new URLSearchParams({
    action:"TEMPLATE",
    text:ev.title||"Événement malagasy",
    dates:`${icsStamp(ev.date)}/${nextDay(ev.date)}`,
    details:`${ev.description||""}\n\nVu sur Malagasy Events — ${SITE_URL}`,
    location:loc,
  })
  return "https://calendar.google.com/calendar/render?"+p.toString()
}
const downloadIcs = ev => {
  const loc = [ev.location,ev.city].filter(Boolean).join(", ")
  const esc = t => String(t||"").replace(/([,;\\])/g,"\\$1").replace(/\n/g,"\\n")
  const ics = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Malagasy Events//FR","BEGIN:VEVENT",
    `UID:${ev.id||Date.now()}@malagasy-events`,`DTSTAMP:${icsStamp(ev.date)}T090000Z`,
    `DTSTART;VALUE=DATE:${icsStamp(ev.date)}`,`DTEND;VALUE=DATE:${nextDay(ev.date)}`,
    `SUMMARY:${esc(ev.title)}`,`LOCATION:${esc(loc)}`,
    `DESCRIPTION:${esc((ev.description||"")+"\n\nMalagasy Events — "+SITE_URL)}`,
    "BEGIN:VALARM","TRIGGER:-P1D","ACTION:DISPLAY",`DESCRIPTION:${esc(ev.title)}`,"END:VALARM",
    "END:VEVENT","END:VCALENDAR"].join("\r\n")
  const url = URL.createObjectURL(new Blob([ics],{type:"text/calendar"}))
  const a = document.createElement("a"); a.href=url; a.download=(ev.title||"evenement").replace(/[^\w]+/g,"-").toLowerCase()+".ics"
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000)
}

/* ── LoginGate (accès réservé aux connectés) ── */
function LoginGate({ title, text, onLogin }) {
  return (
    <div style={{maxWidth:460,margin:"40px auto",padding:"40px 28px",background:WHITE,borderRadius:20,boxShadow:"0 4px 24px rgba(0,0,0,0.08)",textAlign:"center"}}>
      <div style={{fontSize:44,marginBottom:12}}>🔒</div>
      <h2 style={{fontWeight:800,fontSize:20,color:"#111",margin:"0 0 8px"}}>{title}</h2>
      <p style={{fontSize:14,color:"#777",lineHeight:1.5,margin:"0 0 22px"}}>{text}</p>
      <button onClick={onLogin} style={{background:RED,color:WHITE,fontWeight:700,fontSize:15,padding:"13px 32px",borderRadius:14,border:"none",cursor:"pointer"}}>Se connecter / S'inscrire</button>
    </div>
  )
}

/* ── ReportButton (signaler un contenu) ── */
function ReportButton({ user, type, id, excerpt, onAuthRequired, small }) {
  const [done,setDone] = useState(false)
  const report = async () => {
    if (!user) { onAuthRequired?.(); return }
    const reason = window.prompt("Pourquoi signaler ce contenu ? (spam, insulte, faux…)")
    if (reason===null) return
    const {error} = await supabase.from('reports').insert({target_type:type,target_id:id,target_excerpt:(excerpt||"").slice(0,140),reason:reason.slice(0,200),reporter_id:user.id})
    if (error) alert("⚠️ "+error.message); else setDone(true)
  }
  if (done) return <span style={{fontSize:small?10:11,color:"#bbb"}}>✓ signalé</span>
  return <button onClick={report} title="Signaler" style={{background:"none",border:"none",color:"#c9c9c9",fontSize:small?11:12,cursor:"pointer",fontWeight:600,padding:0}}>⚑ Signaler</button>
}

/* ── SubmitEventModal (proposer un événement — membres connectés) ── */
function SubmitEventModal({ user, userProfile, onEventPublished, onOrganizerSynced, onClose, events = [], orgas = [] }) {
  const empty = {title:"",date:"",city:"",location:"",address:"",lat:null,lng:null,category:"Soirée",price:"",organizer:"",ticket_url:"",official_source_url:"",updates_url:"",image:"",description:"",submitter_email:user?.email||"",organizer_site:"",organizer_facebook:"",organizer_instagram:"",organizer_contact:""}
  const [f,setF] = useState(empty)
  const [sent,setSent] = useState(false)
  const [direct,setDirect] = useState(false) // publié directement (pack organisateur/pro)
  const [saving,setSaving] = useState(false)
  const canDirect = canPublishDirect(userProfile) // Organisateur
  const inp = {border:"1.5px solid #e5e5e5",borderRadius:10,padding:"10px 12px",fontSize:14,outline:"none",width:"100%",boxSizing:"border-box"}
  const submit = async () => {
    if (!f.title.trim()||!f.date||!f.organizer.trim()) { alert("Titre, date et organisateur sont obligatoires."); return }
    const dup = events.find(e=>e.title.trim().toLowerCase()===f.title.trim().toLowerCase() && e.date===f.date)
    if (dup && !window.confirm("🔁 « "+dup.title+" » existe déjà sur le site le "+fmtShort(dup.date)+".\n\nSi c'est le même événement, il est déjà visible — inutile de le reposter.\nSi vous êtes co-organisateurs ou que c'est une autre édition, tu peux continuer.\n\nPublier quand même ?")) return
    setSaving(true)
    if (canDirect) {
      // Organisateur : publication directe + automatiquement à la une.
      const payload = {title:f.title,date:f.date,city:f.city,location:f.location,address:f.address||f.location,lat:f.lat,lng:f.lng,category:f.category,price:f.price,organizer:f.organizer||userProfile?.username||"",ticketUrl:safeUrl(f.ticket_url),official_source_url:safeUrl(f.official_source_url),updates_url:safeUrl(f.updates_url),image:"",description:f.description,mediaUrls:[],featured:true,createdAt:new Date().toISOString(),owner_id:user.id}
      const {data,error} = await supabase.from('events').insert(payload).select().single()
      if (error) {
        const m = error.message||""
        if (m.includes("row-level security")) alert("⏳ Limite atteinte : 3 publications d'événements par 24h.\nRéessaie demain, ou contacte les admins.")
        else alert("⚠️ "+m)
        setSaving(false); return
      }
      const sync=await ensureRepeatOrganizerProfile({event:data,events,orgas,contacts:f,ownerId:user.id})
      const published=sync?.organizer?{...data,orga_id:sync.organizer.id}:data
      if (sync?.organizer) onOrganizerSynced?.(sync,organizerPublicContacts(f))
      onEventPublished?.(published); setDirect(true); setSent(true)
    } else {
      const submission={...f,ticket_url:safeUrl(f.ticket_url),official_source_url:safeUrl(f.official_source_url),updates_url:safeUrl(f.updates_url),organizer_site:safeUrl(f.organizer_site),organizer_facebook:safeUrl(f.organizer_facebook),organizer_instagram:safeUrl(f.organizer_instagram),image:"",submitter_id:user?.id||null}
      let {error} = await supabase.from('event_submissions').insert(submission)
      // Compatibilité tant que les nouvelles colonnes de contacts ne sont pas installées.
      if (error && /organizer_(site|facebook|instagram|contact)|official_source_url|updates_url/i.test(error.message||"")) {
        const legacy={...submission}
        delete legacy.organizer_site; delete legacy.organizer_facebook; delete legacy.organizer_instagram; delete legacy.organizer_contact
        delete legacy.official_source_url; delete legacy.updates_url
        ;({error}=await supabase.from('event_submissions').insert(legacy))
      }
      if (error) {
        const m = error.message||""
        if (m.includes("row-level security")) alert("⏳ Limite atteinte : 3 propositions d'événements par 24h.\nRéessaie demain, ou contacte les admins.")
        else alert("⚠️ "+m)
        setSaving(false); return
      }
      setSent(true)
    }
    setSaving(false)
  }
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"flex-start",justifyContent:"center",zIndex:200,overflowY:"auto",padding:16}}>
      <div style={{background:WHITE,borderRadius:20,padding:24,width:"100%",maxWidth:440,margin:"auto",boxShadow:"0 16px 48px rgba(0,0,0,0.25)"}}>
        {sent ? (
          <div style={{textAlign:"center",padding:"14px 0"}}>
            <p style={{fontSize:38,margin:"0 0 8px"}}>{direct?"✅":"🎉"}</p>
            <h3 style={{fontWeight:800,fontSize:17,margin:"0 0 6px"}}>{direct?"Événement publié !":"Merci !"}</h3>
            <p style={{fontSize:13,color:"#777",lineHeight:1.5,margin:"0 0 16px"}}>{direct ? "Ton événement est en ligne immédiatement et mis à la une ⭐ (avantage Organisateur)." : "Ta proposition a bien été envoyée. Elle sera publiée après validation par l'équipe."}</p>
            <button onClick={onClose} style={{background:GREEN,color:WHITE,fontWeight:700,fontSize:14,padding:"11px 28px",borderRadius:12,border:"none",cursor:"pointer"}}>Fermer</button>
          </div>
        ) : (<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <h3 style={{fontWeight:800,fontSize:17,margin:0}}>📣 Proposer un événement</h3>
            <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,color:"#bbb",cursor:"pointer"}}>×</button>
          </div>
          {canDirect ? (
            <div style={{background:"#faf6ec",border:"1.5px solid #e6d9a8",borderRadius:12,padding:"10px 12px",margin:"0 0 14px",fontSize:12,color:"#7a5c00",fontWeight:600}}>
              🎪 Pack Pro — ton événement sera publié directement, sans validation, et mis à la une.
            </div>
          ) : (
            <p style={{fontSize:12,color:"#999",margin:"0 0 16px"}}>Partage un événement malagasy — on le vérifie et on le publie. Max 3 propositions/jour · 📢 publicité intensive interdite — contacte les admins pour promouvoir une activité.</p>
          )}
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <input value={f.title} onChange={e=>setF({...f,title:e.target.value})} placeholder="Nom de l'événement *" style={inp}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <input type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})} style={inp}/>
              <select value={f.category} onChange={e=>setF({...f,category:e.target.value})} style={inp}>
                {["Soirée","Culture","Gastronomie","Sport","Religion","Autre"].map(c=><option key={c} value={c}>{c}</option>)}
              </select>
              <input value={f.city} onChange={e=>setF({...f,city:e.target.value})} placeholder="Ville" style={inp}/>
              <PriceInput value={f.price} onChange={price=>setF({...f,price})} placeholder="15" style={inp}/>
            </div>
            <LocationAutocomplete value={f.location} onChange={location=>setF({...f,location,address:'',lat:null,lng:null})} onChoose={place=>setF({...f,...place})} placeholder="Salle, adresse ou ville (choisir une proposition)" style={inp}/>
            <p style={{fontSize:11,color:'#888',margin:'-4px 0 0'}}>Choisis une proposition pour enregistrer l’adresse, la ville et la position exacte sur la carte.</p>
            <input value={f.organizer} onChange={e=>setF({...f,organizer:e.target.value})} placeholder="Organisateur *" style={inp}/>
            <div style={{background:"#f7faf8",border:"1px solid #d9eadf",borderRadius:12,padding:12,display:"flex",flexDirection:"column",gap:8}}>
              <p style={{fontSize:12,fontWeight:800,color:GREEN,margin:0}}>Contacts publics de l’organisateur (facultatif)</p>
              <p style={{fontSize:11,color:"#718078",lineHeight:1.45,margin:0}}>Ils serviront à compléter sa fiche uniquement après la publication d’un deuxième événement.</p>
              <input value={f.organizer_site} onChange={e=>setF({...f,organizer_site:e.target.value})} placeholder="Site officiel" style={inp}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <input value={f.organizer_facebook} onChange={e=>setF({...f,organizer_facebook:e.target.value})} placeholder="Facebook officiel" style={inp}/>
                <input value={f.organizer_instagram} onChange={e=>setF({...f,organizer_instagram:e.target.value})} placeholder="Instagram officiel" style={inp}/>
              </div>
              <input value={f.organizer_contact} onChange={e=>setF({...f,organizer_contact:e.target.value})} placeholder="E-mail ou téléphone public" style={inp}/>
            </div>
            <input value={f.ticket_url} onChange={e=>setF({...f,ticket_url:e.target.value})} placeholder="Lien billetterie (optionnel)" style={inp}/>
            <input value={f.official_source_url} onChange={e=>setF({...f,official_source_url:e.target.value})} placeholder="Annonce officielle : publication Facebook, Instagram, site…" style={inp}/>
            <input value={f.updates_url} onChange={e=>setF({...f,updates_url:e.target.value})} placeholder="Page à suivre pour les actualités (optionnel)" style={inp}/>
            <div style={{background:"#fff8e8",border:"1px solid #eed89c",borderRadius:10,padding:"10px 12px",fontSize:12,color:"#6b5419",lineHeight:1.45}}>🛡️ N’envoyez pas d’affiche ni de photo pour le moment. Malagasy Events utilise un visuel neutre jusqu’à la mise en place du registre d’autorisations.</div>
            <textarea value={f.description} onChange={e=>setF({...f,description:e.target.value})} placeholder="Description" rows={3} style={{...inp,resize:"vertical",fontFamily:"system-ui,sans-serif"}}/>
            <p style={{fontSize:12,color:"#999",margin:"0 0 2px"}}>Ta proposition est associée à ton compte pour protéger la communauté du spam.</p>
            <button onClick={submit} disabled={saving} style={{background:RED,color:WHITE,fontWeight:700,fontSize:14,padding:"12px 0",borderRadius:12,border:"none",cursor:"pointer",opacity:saving?0.6:1}}>{saving?"Envoi...":"Envoyer ma proposition"}</button>
          </div>
        </>)}
      </div>
    </div>
  )
}

/* ── ReminderModal ────────────────────────────────── */
function ReminderModal({ ev, onClose }) {
  const [notif,setNotif] = useState(typeof Notification!=="undefined"?Notification.permission:"unsupported")
  const askNotif = async () => {
    if (typeof Notification==="undefined") return
    const p = await Notification.requestPermission(); setNotif(p)
    if (p==="granted") new Notification("Rappel activé 🇲🇬",{body:`On te préviendra pour « ${ev.title} »`})
  }
  const btn = (bg,children,onClick) => (
    <button onClick={onClick} style={{width:"100%",background:bg,color:WHITE,fontWeight:700,fontSize:14,padding:"12px 0",borderRadius:12,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>{children}</button>
  )
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16}}>
      <div style={{background:WHITE,borderRadius:20,padding:24,width:"100%",maxWidth:360,boxShadow:"0 16px 48px rgba(0,0,0,0.25)"}}>
        <h3 style={{fontWeight:800,fontSize:16,margin:"0 0 6px",textAlign:"center"}}>🔔 Me le rappeler</h3>
        <p style={{fontSize:12,color:"#999",textAlign:"center",margin:"0 0 6px"}}>{ev.title}</p>
        <p style={{fontSize:12,color:"#aaa",textAlign:"center",margin:"0 0 18px"}}>📅 {fmtShort(ev.date)}{ev.city?` · ${ev.city}`:""}</p>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {btn(GREEN,<>📅 Ajouter à Google Agenda</>,()=>window.open(gCalUrl(ev),"_blank","noreferrer"))}
          {btn("#333",<>📥 Agenda iPhone / autre (.ics)</>,()=>downloadIcs(ev))}
          <p style={{fontSize:11,color:"#999",textAlign:"center",lineHeight:1.5,margin:"2px 0"}}>Ton téléphone te préviendra tout seul, même appli fermée — c'est le rappel le plus fiable.</p>
          {notif==="granted"
            ? <div style={{textAlign:"center",fontSize:12,color:GREEN,fontWeight:700}}>✓ Notifications navigateur activées</div>
            : notif!=="unsupported" && btn(RED,<>🔔 Activer les notifications ici</>,askNotif)}
        </div>
        <button onClick={onClose} style={{width:"100%",background:"none",border:"none",color:"#aaa",fontSize:13,cursor:"pointer",marginTop:12}}>Fermer</button>
      </div>
    </div>
  )
}

/* ── FollowButton ─────────────────────────────────── */
function FollowButton({ targetUserId, currentUser, onAuthRequired, small, onChange }) {
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(false)
  useEffect(() => { if (currentUser && targetUserId) check() }, [currentUser, targetUserId])
  const check = async () => {
    const { data } = await supabase.from('follows').select('id').eq('follower_id', currentUser.id).eq('following_id', targetUserId).maybeSingle()
    setFollowing(!!data)
  }
  const toggle = async e => {
    e.stopPropagation()
    if (!currentUser) { onAuthRequired(); return }
    setLoading(true)
    if (following) {
      const { error } = await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', targetUserId)
      if (error) alert("⚠️ " + error.message)
      else { setFollowing(false); onChange && onChange(-1) }
    } else {
      const { error } = await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: targetUserId })
      if (error && error.code !== '23505') alert("⚠️ Abonnement impossible (" + error.message + ")")
      else { setFollowing(true); onChange && onChange(1) }
    }
    setLoading(false)
  }
  if (targetUserId === currentUser?.id) return null
  const sz = small ? { fontSize: 11, padding: "5px 10px" } : { fontSize: 13, padding: "8px 16px" }
  return (
    <button onClick={toggle} disabled={loading} style={{ background: following ? "#f0f0f0" : RED, color: following ? "#555" : WHITE, fontWeight: 700, borderRadius: 99, border: "none", cursor: "pointer", transition: "all .2s", ...sz }}>
      {loading ? "..." : following ? "✓ Abonné" : "+ Suivre"}
    </button>
  )
}

/* ── Abonnement à une fiche organisateur ─────────── */
function OrgaFollowButton({ orgaId, currentUser, onAuthRequired, onChange }) {
  const [following,setFollowing] = useState(false)
  const [loading,setLoading] = useState(false)
  useEffect(()=>{ if (currentUser && orgaId) check() },[currentUser,orgaId])
  const check = async () => {
    const {data} = await supabase.from('orga_follows').select('id').eq('user_id',currentUser.id).eq('orga_id',orgaId).maybeSingle()
    setFollowing(!!data)
  }
  const toggle = async () => {
    if (!currentUser) { onAuthRequired?.(); return }
    setLoading(true)
    if (following) {
      const {error} = await supabase.from('orga_follows').delete().eq('user_id',currentUser.id).eq('orga_id',orgaId)
      if (error) alert('⚠️ '+error.message); else { setFollowing(false); onChange?.(-1) }
    } else {
      const {error} = await supabase.from('orga_follows').insert({user_id:currentUser.id,orga_id:orgaId})
      if (error && error.code!=='23505') alert('⚠️ Abonnement impossible ('+error.message+')'); else { setFollowing(true); onChange?.(1) }
    }
    setLoading(false)
  }
  return <button onClick={toggle} disabled={loading} style={{background:following?'#f0f0f0':GREEN,color:following?'#555':WHITE,fontWeight:800,fontSize:13,padding:'9px 15px',borderRadius:99,border:'none',cursor:'pointer'}}>{loading?'...':following?'✓ Abonné aux actus':'🔔 Suivre les actus'}</button>
}

/* ── UserProfileModal ─────────────────────────────── */
function UserProfileModal({ profileId, currentUser, onAuthRequired, onClose, onMessage }) {
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [blockState,setBlockState] = useState({mine:false,theirs:false})

  useEffect(() => { if (profileId) fetchAll() }, [profileId])

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: p }, { data: ps }, { count: fc }, { count: fgc }, {data:blockRows}] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', profileId).single(),
      supabase.from('posts').select('*').eq('user_id', profileId).order('created_at', { ascending: false }).limit(8),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profileId),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profileId),
      currentUser && currentUser.id!==profileId
        ? supabase.from('blocks').select('blocker_id,blocked_id').or(`and(blocker_id.eq.${currentUser.id},blocked_id.eq.${profileId}),and(blocker_id.eq.${profileId},blocked_id.eq.${currentUser.id})`)
        : {data:[]},
    ])
    setBlockState({
      mine:(blockRows||[]).some(b=>b.blocker_id===currentUser?.id),
      theirs:(blockRows||[]).some(b=>b.blocker_id===profileId),
    })
    setProfile(p); setPosts(ps || []); setFollowerCount(fc || 0); setFollowingCount(fgc || 0); setLoading(false)
  }
  const toggleProfileBlock = async () => {
    if (!currentUser) { onAuthRequired?.(); return }
    if (blockState.mine) {
      const {error}=await supabase.from('blocks').delete().eq('blocker_id',currentUser.id).eq('blocked_id',profileId)
      if (error) alert("⚠️ "+error.message); else setBlockState(s=>({...s,mine:false}))
      return
    }
    if (!window.confirm(`Bloquer ${profile?.username||"ce membre"} ? Son profil et ses publications seront masqués, et vous ne pourrez plus vous écrire.`)) return
    const {error}=await supabase.from('blocks').insert({blocker_id:currentUser.id,blocked_id:profileId})
    if (error && error.code!=='23505') alert("⚠️ "+error.message)
    else setBlockState(s=>({...s,mine:true}))
  }

  const initiale = (profile?.username || "?")[0].toUpperCase()

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 150, padding: 16 }}>
      <div style={{ background: WHITE, borderRadius: 24, width: "100%", maxWidth: 440, maxHeight: "88vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.3)" }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "#bbb" }}>Chargement...</div>
        ) : !profile ? (
          <div style={{ padding: 40, textAlign: "center", color: "#bbb" }}>Profil introuvable</div>
        ) : blockState.mine || blockState.theirs ? (
          <div style={{padding:36,textAlign:"center"}}>
            <button onClick={onClose} style={{float:"right",background:"#f2f2f2",border:"none",borderRadius:99,fontSize:18,padding:"3px 10px",cursor:"pointer"}}>×</button>
            <p style={{fontSize:42,margin:"18px 0 8px"}}>🚫</p>
            <h2 style={{fontSize:20,margin:"0 0 8px"}}>Profil inaccessible</h2>
            <p style={{fontSize:13,color:"#777",lineHeight:1.55,margin:"0 auto 18px"}}>{blockState.mine?`Tu as bloqué ${profile.username}. Son contenu est masqué et aucun message ne peut être échangé.`:"Ce membre n’est pas accessible."}</p>
            {blockState.mine&&<button onClick={toggleProfileBlock} style={{background:GREEN,color:WHITE,border:"none",borderRadius:99,padding:"10px 18px",fontWeight:800,cursor:"pointer"}}>Débloquer</button>}
          </div>
        ) : (
          <>
            <div style={{ background: RED, borderRadius: "24px 24px 0 0", padding: "28px 24px 20px", textAlign: "center", position: "relative" }}>
              <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: "rgba(255,255,255,0.2)", color: WHITE, fontWeight: 800, fontSize: 18, width: 32, height: 32, borderRadius: "50%", border: "none", cursor: "pointer" }}>×</button>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: WHITE, margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "3px solid rgba(255,255,255,0.3)" }}>
                {profile.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 28, fontWeight: 800, color: RED }}>{initiale}</span>}
              </div>
              <h2 style={{ color: WHITE, fontWeight: 800, fontSize: 18, margin: "0 0 4px" }}>{profile.username || "Anonyme"}</h2>
              {profile.code_postal && <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, margin: "0 0 6px" }}>📍 {profile.code_postal}</p>}
              {profile.is_member && <span style={{ background: GREEN, color: WHITE, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, display: "inline-block" }}>✓ Membre</span>}
            </div>
            {/* Stats */}
            <div style={{ display: "flex", borderBottom: "1px solid #f0f0f0" }}>
              {[{ n: posts.length, l: "Posts" }, { n: followerCount, l: "Abonnés" }, { n: followingCount, l: "Abonnements" }].map((s, i) => (
                <div key={i} style={{ flex: 1, padding: "16px 0", textAlign: "center", borderRight: i < 2 ? "1px solid #f0f0f0" : "none" }}>
                  <p style={{ fontWeight: 800, fontSize: 18, color: "#111", margin: 0 }}>{s.n}</p>
                  <p style={{ fontSize: 11, color: "#999", margin: 0 }}>{s.l}</p>
                </div>
              ))}
            </div>
            {/* Actions */}
            <div style={{ display: "flex", gap: 10, padding: "16px 20px", borderBottom: "1px solid #f0f0f0" }}>
              <FollowButton targetUserId={profileId} currentUser={currentUser} onAuthRequired={onAuthRequired} onChange={d=>setFollowerCount(c=>Math.max(0,c+d))} />
              {currentUser && currentUser.id !== profileId && (
                <button onClick={() => { onMessage(profileId, profile.username); onClose() }} style={{ background: "#f5f5f5", color: "#333", fontWeight: 700, fontSize: 13, padding: "8px 16px", borderRadius: 99, border: "none", cursor: "pointer" }}>✉️ Message</button>
              )}
              {currentUser && currentUser.id !== profileId && (
                <button onClick={toggleProfileBlock} title="Masquer ce membre et empêcher les messages" style={{background:"#fff3e0",color:"#b35c00",fontWeight:700,fontSize:13,padding:"8px 14px",borderRadius:99,border:"none",cursor:"pointer"}}>🚫 Bloquer</button>
              )}
            </div>
            {/* Posts */}
            <div style={{ padding: "16px 20px 20px" }}>
              <p style={{ fontWeight: 700, fontSize: 13, color: "#666", margin: "0 0 12px" }}>Publications récentes</p>
              {posts.length === 0 ? (
                <p style={{ fontSize: 13, color: "#bbb", textAlign: "center" }}>Aucune publication</p>
              ) : (
                posts.map(p => (
                  <div key={p.id} style={{ background: "#f8f8f8", borderRadius: 12, padding: "10px 12px", marginBottom: 8 }}>
                    <p style={{ fontSize: 13, color: "#333", margin: "0 0 4px", lineHeight: 1.4 }}>{p.content}</p>
                    {p.image_url && <img src={p.image_url} alt="" style={{ width: "100%", borderRadius: 8, marginTop: 4, maxHeight: 160, objectFit: "cover" }} />}
                    <p style={{ fontSize: 11, color: "#bbb", margin: "4px 0 0" }}>{ago(p.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ── PostCard ─────────────────────────────────────── */
function PostCard({ post, user, isAdmin, onAuthRequired, onMessage, onProfileClick, onDeleted, onUpdated }) {
  const canDelete = !!user && (user.id===post.user_id || isAdmin)
  const canEdit = canDelete
  const deletePost = async () => {
    if (!confirm("Supprimer ce post ?")) return
    const {error} = await supabase.from('posts').delete().eq('id',post.id)
    if (error) { alert("⚠️ "+error.message); return }
    onDeleted?.(post.id)
  }
  const [liked,setLiked]           = useState(false)
  const [likesCount,setLikesCount] = useState(0)
  const [showCmts,setShowCmts]     = useState(false)
  const [cmts,setCmts]             = useState([])
  const [cmtText,setCmtText]       = useState("")
  const [hover,setHover]           = useState(false)
  const [editing,setEditing]       = useState(false)
  const [editText,setEditText]     = useState(post.content||"")
  const [savingEdit,setSavingEdit] = useState(false)

  const saveEdit = async () => {
    const content = editText.trim(); if (!content) return
    setSavingEdit(true)
    const {error} = await supabase.from('posts').update({content}).eq('id',post.id)
    setSavingEdit(false)
    if (error) { alert('⚠️ Modification impossible ('+error.message+')'); return }
    onUpdated?.({...post,content}); setEditing(false)
  }

  useEffect(()=>{
    fetchLikes()
    if (user) checkLiked()
  },[user])

  const fetchLikes = async () => {
    const {count} = await supabase.from('post_likes').select('*',{count:'exact',head:true}).eq('post_id',post.id)
    setLikesCount(count||0)
  }

  const checkLiked = async () => {
    const {data} = await supabase.from('post_likes').select('id').eq('post_id',post.id).eq('user_id',user.id).maybeSingle()
    setLiked(!!data)
  }

  const toggleLike = async () => {
    if (!user) { onAuthRequired(); return }
    if (liked) {
      setLiked(false); setLikesCount(c=>c-1)
      const {error}=await supabase.from('post_likes').delete().eq('post_id',post.id).eq('user_id',user.id)
      if(error){ setLiked(true); setLikesCount(c=>c+1); alert("⚠️ "+error.message) }
    } else {
      setLiked(true); setLikesCount(c=>c+1)
      const {error}=await supabase.from('post_likes').insert({post_id:post.id,user_id:user.id})
      if(error){ setLiked(false); setLikesCount(c=>c-1); alert("⚠️ "+error.message) }
    }
  }

  const fetchCmts = async () => {
    const {data} = await supabase.from('post_comments').select('*,profiles(username,is_member,plan)').eq('post_id',post.id).order('created_at',{ascending:true})
    setCmts(data||[])
  }

  const openCmts = () => { setShowCmts(s=>!s); if (!showCmts) fetchCmts() }

  const postCmt = async e => {
    e.preventDefault()
    if (!user) { onAuthRequired(); return }
    if (!cmtText.trim()) return
    const {error} = await supabase.from('post_comments').insert({post_id:post.id,user_id:user.id,content:cmtText.trim()})
    if (error) { alert("⚠️ Commentaire non envoyé : "+error.message); return }
    setCmtText(""); fetchCmts()
  }

  const u = post.profiles
  const orga = post.organisateurs || null
  const orgaName = post.orga_id ? (orga?.name || "Organisateur") : null
  const orgaColor = safeHexColor(orga?.brand_color) || RED
  const initiale = ((orgaName||u?.username)||"?")[0].toUpperCase()

  const isProPost = u?.plan==="pro"
  const promotionLeft = postPromotionRemaining(post.promoted_until)
  return (
    <div onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{background:WHITE,borderRadius:20,boxShadow:hover?"0 8px 32px rgba(0,0,0,0.12)":"0 2px 12px rgba(0,0,0,0.07)",transition:"all .2s",marginBottom:16,overflow:"hidden",border:isProPost?"1.5px solid #e6b31e":"none"}}>
      {isProPost && <div style={{background:"linear-gradient(135deg,#b8860b,#e6b31e)",color:WHITE,fontSize:10,fontWeight:800,padding:"4px 16px",letterSpacing:0.5}}>⭐ MEMBRE PREMIUM</div>}
      <div style={{padding:"16px 16px 12px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <div style={{width:42,height:42,borderRadius:"50%",background:orgaName?orgaColor:RED,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0}}>
            {orgaName ? (orga?.logo_url ? <img src={orga.logo_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <span style={{fontSize:20}}>🎪</span>) : u?.avatar_url ? <img src={u.avatar_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <span style={{color:WHITE,fontWeight:800,fontSize:16}}>{initiale}</span>}
          </div>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
              <span onClick={e=>{e.stopPropagation();if(!orgaName)onProfileClick&&onProfileClick(post.user_id,u?.username)}} style={{fontWeight:700,fontSize:14,color:orgaName?orgaColor:(isOfficial(u?.username)?RED:"#111"),cursor:orgaName?'default':'pointer',textDecoration:orgaName?'none':'underline dotted'}}>{orgaName||u?.username||"Anonyme"}</span>
              {orgaName && <span style={{background:"#fde8ec",color:RED,fontSize:9,fontWeight:800,padding:"2px 6px",borderRadius:99}}>🎪 ORGANISATEUR</span>}
              {!orgaName && isOfficial(u?.username) && <span style={{background:RED,color:WHITE,fontSize:9,fontWeight:800,padding:"2px 6px",borderRadius:99}}>✓ OFFICIEL</span>}
              {!orgaName && !isOfficial(u?.username) && <PlanBadge plan={u?.plan}/>}
              {!orgaName && !isOfficial(u?.username) && <FanBadge profile={u}/>}
              {!orgaName && !isOfficial(u?.username) && !PLAN_BADGE[u?.plan] && u?.is_member && <span style={{background:GREEN,color:WHITE,fontSize:9,fontWeight:800,padding:"2px 6px",borderRadius:99}}>MEMBRE</span>}
            </div>
            <span style={{fontSize:11,color:"#bbb"}}>{ago(post.created_at)}{orgaName&&u?.username?" · via "+u.username:""}</span>
          </div>
          {user && user.id!==post.user_id && (
            <button onClick={()=>orgaName?onMessage({type:'orga',orga}):onMessage(post.user_id,u?.username)} style={{background:"#f5f5f5",color:"#555",fontWeight:600,fontSize:11,padding:"5px 10px",borderRadius:99,border:"none",cursor:"pointer"}}>✉️ Message</button>
          )}
        </div>
        {editing ? <div style={{display:'flex',flexDirection:'column',gap:8}}><textarea value={editText} onChange={e=>setEditText(e.target.value)} rows={4} style={{width:'100%',boxSizing:'border-box',border:'1.5px solid #ddd',borderRadius:12,padding:'10px 12px',fontSize:14,lineHeight:1.5,fontFamily:'system-ui,sans-serif',resize:'vertical'}}/><div style={{display:'flex',gap:8}}><button onClick={saveEdit} disabled={savingEdit||!editText.trim()} style={{background:GREEN,color:WHITE,fontWeight:700,fontSize:12,padding:'7px 13px',borderRadius:99,border:'none',cursor:'pointer'}}>{savingEdit?'...':'✓ Enregistrer'}</button><button onClick={()=>{setEditText(post.content||'');setEditing(false)}} style={{background:'#f0f0f0',color:'#666',fontWeight:700,fontSize:12,padding:'7px 13px',borderRadius:99,border:'none',cursor:'pointer'}}>Annuler</button></div></div> : <p style={{fontSize:15,color:"#222",margin:0,lineHeight:1.5,whiteSpace:"pre-wrap"}}>{post.content}</p>}
      </div>
      {promotionLeft && <div style={{padding:'0 16px 10px',display:'flex',alignItems:'center',gap:7}}><span style={{background:'linear-gradient(135deg,#b8860b,#e6b31e)',color:WHITE,fontSize:10,fontWeight:900,padding:'4px 8px',borderRadius:99}}>📣 MIS EN AVANT</span>{(user?.id===post.user_id||isAdmin)&&<span style={{fontSize:10.5,fontWeight:700,color:'#9b7200'}}>⏳ encore {promotionLeft}</span>}</div>}
      {post.image_url && (
        <div style={{width:"100%",maxHeight:320,overflow:"hidden"}}>
          <img src={post.image_url} alt="" style={{width:"100%",objectFit:"cover"}}/>
        </div>
      )}
      <div style={{padding:"10px 16px",display:"flex",gap:4,borderTop:"1px solid #f5f5f5"}}>
        <button onClick={toggleLike} style={{display:"flex",alignItems:"center",gap:5,background:liked?"#fde8ec":"#f5f5f5",color:liked?RED:"#666",fontWeight:700,fontSize:13,padding:"7px 14px",borderRadius:99,border:"none",cursor:"pointer"}}>
          {liked?"❤️":"🤍"} {likesCount}
        </button>
        <button onClick={openCmts} style={{display:"flex",alignItems:"center",gap:5,background:"#f5f5f5",color:"#666",fontWeight:700,fontSize:13,padding:"7px 14px",borderRadius:99,border:"none",cursor:"pointer"}}>
          💬 Commenter
        </button>
        <button onClick={()=>{ navigator.clipboard.writeText(`${post.content.slice(0,50)}... — Malagasy Events`) }} style={{display:"flex",alignItems:"center",gap:5,background:"#f5f5f5",color:"#666",fontWeight:700,fontSize:13,padding:"7px 14px",borderRadius:99,border:"none",cursor:"pointer",marginLeft:"auto"}}>
          📤
        </button>
      </div>
      {(canDelete || !user || post.user_id!==user.id) && (
        <div style={{padding:"0 16px 12px",display:"flex",alignItems:"center",gap:14,justifyContent:"flex-end"}}>
          {(!user||post.user_id!==user.id) && <ReportButton user={user} type="post" id={post.id} excerpt={post.content} onAuthRequired={onAuthRequired} small/>}
          {canEdit && <button onClick={()=>setEditing(true)} style={{background:"none",border:"none",color:GREEN,fontSize:12,fontWeight:700,cursor:"pointer",padding:0}}>✏️ Modifier</button>}
          {canDelete && <button onClick={deletePost} style={{background:"none",border:"none",color:RED,fontSize:12,fontWeight:700,cursor:"pointer",padding:0}}>🗑️ Supprimer</button>}
        </div>
      )}
      {showCmts && (
        <div style={{padding:"0 16px 16px"}}>
          {cmts.map(c=>(
            <div key={c.id} style={{display:"flex",gap:8,marginBottom:8}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:"#f0f0f0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#666",flexShrink:0}}>{(c.profiles?.username||"?")[0].toUpperCase()}</div>
              <div style={{background:"#f8f8f8",borderRadius:10,padding:"6px 10px",flex:1}}>
                <span style={{fontSize:11,fontWeight:700,color:"#333"}}>{c.profiles?.username||"Anonyme"} </span>
                <span style={{fontSize:13,color:"#444"}}>{c.content}</span>
              </div>
            </div>
          ))}
          <form onSubmit={postCmt} style={{display:"flex",gap:8,marginTop:8}}>
            <input value={cmtText} onChange={e=>setCmtText(e.target.value)} placeholder="Répondre..." style={{flex:1,border:"1.5px solid #e5e5e5",borderRadius:99,padding:"7px 12px",fontSize:13,outline:"none"}}/>
            <button type="submit" disabled={!cmtText.trim()} style={{background:RED,color:WHITE,fontWeight:700,padding:"7px 14px",borderRadius:99,border:"none",cursor:"pointer",opacity:cmtText.trim()?1:.5}}>→</button>
          </form>
        </div>
      )}
    </div>
  )
}

/* ── CommunityFeed ────────────────────────────────── */
/* ── Feed Entraide global (onglet Communauté) ────── */
function EntraideFeed({ user, onAuthRequired, onOpenEvent, events = initialEvents }) {
  const [items,setItems]             = useState([])
  const [unavailable,setUnavailable] = useState(false)
  const [loading,setLoading]         = useState(true)
  const [catFilter,setCatFilter]     = useState("tous")

  useEffect(()=>{ fetchAll() },[])

  const fetchAll = async () => {
    let {data,error} = await supabase.from('entraide').select('*,profiles(username)').order('created_at',{ascending:false}).limit(50)
    if (error) {
      const retry = await supabase.from('entraide').select('*').order('created_at',{ascending:false}).limit(50)
      if (retry.error) { setUnavailable(true); setLoading(false); return }
      data = retry.data
    }
    setItems((data||[]).filter(r=>{ const ev=events.find(e=>String(e.id)===String(r.event_id)); return ev && !isPast(ev.date) }))
    setLoading(false)
  }

  const upcoming = events.filter(e=>!isPast(e.date)).sort((a,b)=>a.date.localeCompare(b.date))
  const shown = catFilter==="tous" ? items : items.filter(i=>i.category===catFilter)

  return (
    <div>
      {/* Explication + CTA */}
      <div style={{background:"#e6f4ed",border:"1.5px solid #bfe3d0",borderRadius:16,padding:"14px 18px",marginBottom:16}}>
        <p style={{fontWeight:800,fontSize:14,color:GREEN,margin:"0 0 2px"}}>🤝 L'entraide de la communauté</p>
        <p style={{fontSize:13,color:"#3d6b52",margin:0}}>Covoiturage et hébergement pour aller aux événements. Choisis un événement ci-dessous pour proposer ou chercher.</p>
      </div>

      {/* Événements à venir : accès rapide */}
      <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:8,marginBottom:16}}>
        {upcoming.slice(0,8).map(ev=>(
          <button key={ev.id} onClick={()=>onOpenEvent(ev)} style={{flexShrink:0,background:WHITE,border:"1px solid #e5e5e5",borderRadius:12,padding:"8px 14px",cursor:"pointer",textAlign:"left"}}>
            <p style={{fontSize:12,fontWeight:800,color:"#111",margin:0,maxWidth:160,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{ev.title}</p>
            <p style={{fontSize:11,color:"#999",margin:0}}>📅 {fmtShort(ev.date)} · {ev.city}</p>
          </button>
        ))}
      </div>

      {/* Filtres */}
      <div style={{display:"flex",gap:6,marginBottom:14}}>
        {[["tous","Tous"],["trajet","🚗 Trajets"],["hebergement","🛏️ Hébergements"]].map(([k,l])=>(
          <button key={k} onClick={()=>setCatFilter(k)} style={{background:catFilter===k?"#333":WHITE,color:catFilter===k?WHITE:"#555",fontWeight:700,fontSize:12,padding:"6px 12px",borderRadius:99,border:catFilter===k?"none":"1px solid #e0e0e0",cursor:"pointer"}}>{l}</button>
        ))}
      </div>

      {/* Annonces */}
      {unavailable ? (
        <p style={{fontSize:13,color:"#999",textAlign:"center",padding:"24px 0"}}>🤝 Le module entraide arrive très bientôt !</p>
      ) : loading ? (
        <p style={{fontSize:13,color:"#bbb",textAlign:"center",padding:"24px 0"}}>Chargement...</p>
      ) : shown.length===0 ? (
        <div style={{textAlign:"center",padding:"28px 20px",background:WHITE,borderRadius:16,color:"#bbb"}}>
          <p style={{fontSize:28,margin:"0 0 6px"}}>🚗</p>
          <p style={{fontWeight:700,margin:0,fontSize:13}}>Aucune annonce pour l'instant.</p>
          <p style={{fontSize:12,margin:"4px 0 0"}}>Clique sur un événement ci-dessus et lance la première !</p>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {shown.map(r=>{
            const ev = events.find(e=>String(e.id)===String(r.event_id))
            const cat = ENTRAIDE_CATS[r.category]||ENTRAIDE_CATS.trajet
            return (
              <div key={r.id} onClick={()=>ev&&onOpenEvent(ev)} style={{background:WHITE,borderRadius:16,padding:"14px 16px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",cursor:"pointer"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                  <span style={{fontSize:18}}>{r.type==="propose"?cat.emoji:"🙋"}</span>
                  <p style={{fontSize:13,fontWeight:700,color:"#111",margin:0,flex:1}}>
                    {r.profiles?.username||"Un membre"} {r.type==="propose"?"propose":"cherche"} · {cat.label.toLowerCase()} · {r.places} {cat.placeLbl}{r.places>1?"s":""}
                  </p>
                  <span style={{fontSize:11,fontWeight:700,background:r.type==="propose"?"#e6f4ed":"#FAECE7",color:r.type==="propose"?GREEN:"#712B13",padding:"3px 10px",borderRadius:99}}>{r.type==="propose"?"Propose":"Cherche"}</span>
                </div>
                <p style={{fontSize:12,color:"#777",margin:"0 0 6px"}}>{r.category==="trajet"?"Depuis":"À"} {r.city}{r.note?` · ${r.note}`:""}</p>
                {ev && <p style={{fontSize:12,fontWeight:700,color:RED,margin:0}}>🎪 {ev.title} — {fmtShort(ev.date)} · {ev.city} →</p>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CommunityFeed({ user, userProfile, isAdmin, activeOrga, onAuthRequired, onMessage, onProfileClick, onOpenEvent, events, orgas = [] }) {
  const [posts,setPosts]         = useState([])
  const [content,setContent]     = useState("")
  const [imageUrl,setImageUrl]   = useState("")
  const [imgUploading,setImgUploading] = useState(false)
  const [loading,setLoading]     = useState(false)
  const [posting,setPosting]     = useState(false)
  const [feedMode,setFeedMode]   = useState("all") // "all" | "following" | "members"
  const [postAs,setPostAs]       = useState("me") // "me" | "orga"
  const [suggested,setSuggested] = useState([])
  const [members,setMembers]     = useState([])
  const [memberSearch,setMemberSearch] = useState("")
  const [membersLoading,setMembersLoading] = useState(false)
  const isMobile                 = useIsMobile()
  // Fiche organisateur dont l'utilisateur est propriétaire (mode orga) → peut poster en son nom
  // L'identité choisie dans le profil est celle utilisée pour publier.
  // Sans choix explicite, on conserve la première organisation gérée.
  const myOrga = user ? (activeOrga || orgas.find(o=>o.owner_id===user.id)) : null

  useEffect(()=>{
    if (feedMode==="members") fetchMembers()
    else if (feedMode!=="entraide") fetchPosts()
  },[feedMode, user, orgas])
  useEffect(()=>{ if(user) fetchSuggested() },[user])

  // Rattache les profils si la jointure Supabase échoue (colonne/relation manquante)
  const attachProfiles = async rows => {
    const ids = [...new Set(rows.map(r=>r.user_id).filter(Boolean))]
    const {data:profs} = ids.length ? await supabase.from('profiles').select('*').in('id',ids) : {data:[]}
    const map = Object.fromEntries((profs||[]).map(p=>[p.id,p]))
    return rows.map(r=>({...r,profiles:r.profiles||map[r.user_id]||null,organisateurs:(r.orga_id?orgas.find(o=>o.id===r.orga_id):null)||r.organisateurs||null}))
  }

  const fetchPosts = async () => {
    setLoading(true)
    let ids = null
    if (feedMode==="following" && user) {
      const {data:follows} = await supabase.from('follows').select('following_id').eq('follower_id',user.id)
      ids = (follows||[]).map(f=>f.following_id)
      if (ids.length===0) { setPosts([]); setLoading(false); return }
    }
    let q = supabase.from('posts').select('*,profiles(username,avatar_url,is_member,plan,fan_points,fan_badge),organisateurs(name,logo_url,brand_color)').order('created_at',{ascending:false}).limit(30)
    if (ids) q = supabase.from('posts').select('*,profiles(username,avatar_url,is_member,plan,fan_points,fan_badge),organisateurs(name,logo_url,brand_color)').in('user_id',ids).order('created_at',{ascending:false}).limit(30)
    let {data,error} = await q
    if (error) {
      console.warn("Jointure posts→profiles échouée, repli sans jointure :", error.message)
      let q2 = supabase.from('posts').select('*').order('created_at',{ascending:false}).limit(30)
      if (ids) q2 = supabase.from('posts').select('*').in('user_id',ids).order('created_at',{ascending:false}).limit(30)
      const r = await q2
      if (r.error) console.error("Lecture des posts impossible :", r.error.message)
      data = await attachProfiles(r.data||[])
    }
    const blockedIds = await fetchBlockedUserIds(user?.id)
    setPosts((data||[])
      .filter(post=>!blockedIds.includes(post.user_id))
      .map(r=>({...r,organisateurs:(r.orga_id?orgas.find(o=>o.id===r.orga_id):null)||r.organisateurs||null})))
    setLoading(false)
  }

  const fetchMembers = async () => {
    setMembersLoading(true)
    // select('*') = ne casse jamais si une colonne (created_at, email…) n'existe pas
    const {data,error} = await supabase.from('profiles').select('*').limit(500)
    if (error) console.error("Lecture des membres impossible :", error.message)
    const blockedIds = await fetchBlockedUserIds(user?.id)
    const sorted = (data||[]).filter(member=>!blockedIds.includes(member.id)).sort((a,b)=>String(b.created_at||"").localeCompare(String(a.created_at||"")))
    setMembers(sorted); setMembersLoading(false)
  }

  const norm = s => (s||"").toLowerCase().replace(/[_\s]+/g," ").trim()
  const filteredMembers = memberSearch.trim()
    ? members.filter(m => norm(m.username).includes(norm(memberSearch)))
    : members

  const fetchSuggested = async () => {
    const {data:follows} = await supabase.from('follows').select('following_id').eq('follower_id',user.id)
    const alreadyIds = [(follows||[]).map(f=>f.following_id), user.id].flat()
    const {data} = await supabase.from('profiles').select('id,username,avatar_url,is_member').not('id','in',`(${alreadyIds.join(',')})`).limit(5)
    const blockedIds = await fetchBlockedUserIds(user.id)
    setSuggested((data||[]).filter(member=>!blockedIds.includes(member.id)))
  }

  const submitPost = async e => {
    e.preventDefault()
    if (!user) { onAuthRequired(); return }
    if (!content.trim()) return
    setPosting(true)
    const payload = {user_id:user.id,content:content.trim(),image_url:imageUrl||null}
    if (postAs==="orga" && myOrga) payload.orga_id = myOrga.id
    let {error} = await supabase.from('posts').insert(payload)
    // Repli si la colonne orga_id n'existe pas encore côté Supabase
    if (error && payload.orga_id && (error.message||"").includes("orga_id")) {
      delete payload.orga_id
      const retry = await supabase.from('posts').insert(payload)
      error = retry.error
      if (!error) alert("ℹ️ Publié en ton nom : la publication en tant qu'organisateur n'est pas encore activée côté base (exécute supabase_poster_en_orga.sql).")
    }
    if (error) {
      if ((error.message||"").includes("row-level security")) alert("⏳ Pour garder un fil de qualité, chacun peut publier 1 post par jour.\n\n📢 Besoin d'annoncer plus souvent ou de faire de la publicité ? Contacte les admins — des offres existent pour ça.")
      else alert("⚠️ "+error.message)
    } else { setContent(""); setImageUrl(""); fetchPosts() }
    setPosting(false)
  }

  const initiale = (userProfile?.username||user?.email||"?")[0].toUpperCase()

  return (
    <div style={{maxWidth:900,margin:"0 auto",padding:isMobile?"12px":"24px",display:"flex",gap:24,alignItems:"flex-start"}}>
      {/* Main feed */}
      <div style={{flex:1,minWidth:0}}>
        {/* Feed mode tabs */}
        <div style={{display:"flex",gap:4,marginBottom:16,background:WHITE,borderRadius:14,padding:4,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          {[["entraide","🤝 Entraide"],["all","🌍 Tous"],["following","👥 Abonnements"],["members","🔍 Membres"]].map(([k,l])=>(
            <button key={k} onClick={()=>setFeedMode(k)} style={{flex:1,padding:"9px 0",borderRadius:10,border:"none",cursor:"pointer",fontWeight:700,fontSize:13,background:feedMode===k?RED:"transparent",color:feedMode===k?WHITE:"#888"}}>
              {l}
            </button>
          ))}
        </div>

        {/* Onglet Entraide */}
        {feedMode==="entraide" && (
          <EntraideFeed user={user} onAuthRequired={onAuthRequired} onOpenEvent={onOpenEvent} events={events}/>
        )}

        {/* Onglet Membres */}
        {feedMode==="members" && (
          <div>
            <div style={{position:"relative",marginBottom:16}}>
              <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:16,color:"#aaa"}}>🔍</span>
              <input value={memberSearch} onChange={e=>setMemberSearch(e.target.value)} placeholder="Chercher par pseudo..." style={{width:"100%",border:"1.5px solid #e5e5e5",borderRadius:14,padding:"11px 14px 11px 40px",fontSize:14,outline:"none",boxSizing:"border-box",background:WHITE}}/>
            </div>
            {membersLoading ? (
              <div style={{textAlign:"center",padding:40,color:"#bbb"}}>Chargement...</div>
            ) : filteredMembers.length===0 ? (
              <div style={{textAlign:"center",padding:40,color:"#bbb"}}>Aucun membre trouvé</div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {filteredMembers.map(m=>(
                  <div key={m.id} style={{background:WHITE,borderRadius:16,padding:"14px 16px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",display:"flex",alignItems:"center",gap:12}}>
                    <div onClick={()=>onProfileClick&&onProfileClick(m.id,m.username)} style={{width:48,height:48,borderRadius:"50%",background:RED,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0,cursor:"pointer"}}>
                      {m.avatar_url ? <img src={m.avatar_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <span style={{color:WHITE,fontWeight:800,fontSize:18}}>{(m.username||"?")[0].toUpperCase()}</span>}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span onClick={()=>onProfileClick&&onProfileClick(m.id,m.username)} style={{fontWeight:700,fontSize:14,color:isOfficial(m.username)?RED:"#111",cursor:"pointer"}}>{m.username||"Anonyme"}</span>
                        {isOfficial(m.username) && <span style={{background:RED,color:WHITE,fontSize:9,fontWeight:800,padding:"2px 6px",borderRadius:99}}>✓ OFFICIEL</span>}
                        {!isOfficial(m.username) && <PlanBadge plan={m.plan}/>}
                        {!isOfficial(m.username) && <FanBadge profile={m}/>}
                        {!isOfficial(m.username) && !PLAN_BADGE[m.plan] && m.is_member && <span style={{background:GREEN,color:WHITE,fontSize:9,fontWeight:800,padding:"2px 6px",borderRadius:99}}>MEMBRE</span>}
                      </div>
                      {m.code_postal && <p style={{fontSize:12,color:"#999",margin:0}}>📍 {m.code_postal}</p>}
                    </div>
                    <div style={{display:"flex",gap:8,flexShrink:0}}>
                      <button onClick={()=>onMessage&&onMessage(m.id,m.username)} style={{background:"#f5f5f5",color:"#555",fontWeight:700,fontSize:12,padding:"7px 12px",borderRadius:99,border:"none",cursor:"pointer"}}>✉️</button>
                      <FollowButton targetUserId={m.id} currentUser={user} onAuthRequired={onAuthRequired} small/>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Compose — uniquement dans "Tous" */}
        {feedMode==="all" && (user ? (
          <div style={{background:WHITE,borderRadius:20,boxShadow:"0 2px 12px rgba(0,0,0,0.07)",padding:20,marginBottom:16}}>
            <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
              <div style={{width:44,height:44,borderRadius:"50%",background:postAs==="orga"&&myOrga?(safeHexColor(myOrga.brand_color)||RED):RED,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,overflow:"hidden"}}>
                {postAs==="orga"&&myOrga?.logo_url ? <img src={myOrga.logo_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : userProfile?.avatar_url ? <img src={userProfile.avatar_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <span style={{color:WHITE,fontWeight:800}}>{postAs==="orga"&&myOrga?myOrga.name[0]?.toUpperCase():initiale}</span>}
              </div>
              <form onSubmit={submitPost} style={{flex:1,display:"flex",flexDirection:"column",gap:10}}>
                {myOrga && (
                  <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                    <span style={{fontSize:11,color:"#999",fontWeight:700}}>Publier en tant que :</span>
                    {[["me","👤 "+(userProfile?.username||"Moi")],["orga","🎪 "+myOrga.name]].map(([k,l])=>(
                      <button key={k} type="button" onClick={()=>setPostAs(k)} style={{background:postAs===k?(k==="orga"?RED:"#333"):"#f5f5f5",color:postAs===k?WHITE:"#777",fontWeight:700,fontSize:11,padding:"5px 11px",borderRadius:99,border:"none",cursor:"pointer"}}>{l}</button>
                    ))}
                  </div>
                )}
                <textarea value={content} onChange={e=>setContent(e.target.value)} placeholder={postAs==="orga"&&myOrga?`Annonce officielle de ${myOrga.name} 🎪...`:"Partage quelque chose avec la communauté 🇲🇬..."} rows={3} style={{border:"1.5px solid #eee",borderRadius:14,padding:"10px 14px",fontSize:14,outline:"none",resize:"none",fontFamily:"system-ui,sans-serif",width:"100%",boxSizing:"border-box"}}/>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <label htmlFor="post-img" style={{flex:1,display:"flex",alignItems:"center",gap:6,border:"1.5px solid #eee",borderRadius:10,padding:"8px 12px",fontSize:12,color:imageUrl?GREEN:"#888",cursor:"pointer",fontWeight:600}}>
                    {imgUploading?"⏳ Envoi...":imageUrl?"✓ Photo ajoutée":"📷 Ajouter une photo"}
                  </label>
                  <input id="post-img" type="file" accept="image/*" style={{display:"none"}} onChange={async e=>{
                    const f=e.target.files?.[0]; if(!f) return; setImgUploading(true)
                    // Les photos du fil sont compressées dans le navigateur avant
                    // publication. Cela évite les blocages de Storage sur Safari
                    // tout en limitant leur taille à 640 px / ~1 Mo.
                    const r=await imageFileToCompactDataUrl(f,640)
                    if(r.error) alert("⚠️ "+r.error); else setImageUrl(r.url)
                    setImgUploading(false)
                  }}/>
                  {imageUrl && <button type="button" onClick={()=>setImageUrl("")} style={{background:"#f0f0f0",color:"#888",border:"none",borderRadius:10,padding:"8px 10px",fontSize:12,cursor:"pointer"}}>✕</button>}
                  <button type="submit" disabled={!content.trim()||posting} style={{background:content.trim()?RED:"#ccc",color:WHITE,fontWeight:700,fontSize:13,padding:"8px 18px",borderRadius:12,border:"none",cursor:content.trim()?"pointer":"not-allowed"}}>
                    {posting?"...":"Publier"}
                  </button>
                </div>
                <p style={{fontSize:11,color:"#bbb",margin:"2px 0 0"}}>1 post par jour et par membre · 📢 publicité intensive interdite — contacte les admins pour promouvoir une activité</p>
              </form>
            </div>
          </div>
        ) : (
          <div onClick={onAuthRequired} style={{background:WHITE,borderRadius:20,boxShadow:"0 2px 12px rgba(0,0,0,0.07)",padding:20,marginBottom:16,cursor:"pointer",textAlign:"center",border:"2px dashed #eee"}}>
            <p style={{fontSize:14,color:"#999",margin:0}}>Connecte-toi pour partager avec la communauté 🇲🇬</p>
          </div>
        ))}

        {/* Feed */}
        {feedMode==="following" && posts.length>0 && (
          <p style={{fontSize:12,color:"#999",margin:"0 0 12px"}}>👥 Les publications des membres que tu suis. Pour publier, va dans l'onglet 🌍 Tous.</p>
        )}
        {feedMode!=="members" && feedMode!=="entraide" && (loading ? (
          <div style={{textAlign:"center",padding:40,color:"#bbb"}}>Chargement...</div>
        ) : posts.length===0 ? (
          <div style={{textAlign:"center",padding:60,background:WHITE,borderRadius:20}}>
            <p style={{fontSize:40,margin:"0 0 12px"}}>{feedMode==="following"?"😔":"🌺"}</p>
            <p style={{fontWeight:700,color:"#333"}}>{feedMode==="following"?"Abonne-toi à des membres pour voir leurs posts !":"Sois le premier à poster !"}</p>
            {feedMode==="following" && <button onClick={()=>setFeedMode("members")} style={{background:RED,color:WHITE,fontWeight:700,padding:"8px 20px",borderRadius:99,border:"none",cursor:"pointer",marginTop:8}}>Découvrir des membres</button>}
          </div>
        ) : (
          [...posts].sort((a,b)=>{
            const aPinned=postPromotionRemaining(a.promoted_until)?1:0
            const bPinned=postPromotionRemaining(b.promoted_until)?1:0
            if (bPinned!==aPinned) return bPinned-aPinned
            return new Date(b.created_at||0)-new Date(a.created_at||0)
          }).map(p=><PostCard key={p.id} post={p} user={user} isAdmin={isAdmin} onAuthRequired={onAuthRequired} onMessage={onMessage} onProfileClick={onProfileClick} onDeleted={id=>setPosts(list=>list.filter(x=>x.id!==id))} onUpdated={updated=>setPosts(list=>list.map(x=>x.id===updated.id?{...x,...updated}:x))}/>)
        ))}
      </div>

      {/* Sidebar suggestions (desktop only) */}
      {!isMobile && (
        <div style={{width:240,flexShrink:0}}>
          {suggested.length>0 && (
            <div style={{background:WHITE,borderRadius:20,boxShadow:"0 2px 12px rgba(0,0,0,0.07)",padding:16,marginBottom:16}}>
              <p style={{fontWeight:800,fontSize:13,color:"#333",margin:"0 0 12px"}}>💡 Suggestions</p>
              {suggested.map(s=>(
                <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                  <div onClick={()=>onProfileClick&&onProfileClick(s.id,s.username)} style={{width:36,height:36,borderRadius:"50%",background:RED,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0,cursor:"pointer"}}>
                    {s.avatar_url ? <img src={s.avatar_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <span style={{color:WHITE,fontWeight:800,fontSize:14}}>{(s.username||"?")[0].toUpperCase()}</span>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <p onClick={()=>onProfileClick&&onProfileClick(s.id,s.username)} style={{fontWeight:700,fontSize:12,color:"#111",margin:0,cursor:"pointer",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.username||"Anonyme"}</p>
                    {s.is_member && <span style={{background:GREEN,color:WHITE,fontSize:8,fontWeight:800,padding:"1px 4px",borderRadius:99}}>MEMBRE</span>}
                  </div>
                  <FollowButton targetUserId={s.id} currentUser={user} onAuthRequired={onAuthRequired} small />
                </div>
              ))}
            </div>
          )}
          <div style={{background:"linear-gradient(135deg,#C8102E,#a00d24)",borderRadius:20,padding:16,textAlign:"center"}}>
            <p style={{fontSize:24,margin:"0 0 6px"}}>🇲🇬</p>
            <p style={{color:WHITE,fontWeight:700,fontSize:12,margin:"0 0 4px"}}>Malagasy Events</p>
            <p style={{color:"rgba(255,255,255,0.7)",fontSize:11,margin:0}}>La communauté malagasy en France</p>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Messagerie dédiée à une organisation ─────────── */
function OrgaMessagesModal({ user, orga, onClose, initialMember }) {
  const [convs,setConvs] = useState([])
  const [selected,setSelected] = useState(initialMember||null)
  const [msgs,setMsgs] = useState([])
  const [text,setText] = useState('')
  const [search,setSearch] = useState('')
  const [results,setResults] = useState([])
  const end = useRef(null)
  const loadConvs = async () => {
    const {data} = await supabase.from('orga_messages').select('member_id,content,created_at,sender_id,sent_as_orga,read_at').eq('orga_id',orga.id).order('created_at',{ascending:false})
    const ids=[...new Set((data||[]).map(x=>x.member_id))]
    if(!ids.length){setConvs([]);return}
    const {data:profiles}=await supabase.from('profiles').select('id,username,avatar_url').in('id',ids)
    setConvs(ids.map(id=>{const last=(data||[]).find(x=>x.member_id===id);const p=(profiles||[]).find(x=>x.id===id)||{id,username:'Membre'};return {...p,preview:last?.content||'',unread:!!(last&&!last.sent_as_orga&&!last.read_at)} }))
  }
  const loadMsgs = async () => {
    if(!selected?.id)return
    const {data}=await supabase.from('orga_messages').select('*').eq('orga_id',orga.id).eq('member_id',selected.id).order('created_at',{ascending:true})
    setMsgs(data||[])
    await supabase.from('orga_messages').update({read_at:new Date().toISOString()}).eq('orga_id',orga.id).eq('member_id',selected.id).eq('sent_as_orga',false).is('read_at',null)
    loadConvs()
  }
  useEffect(()=>{loadConvs()},[orga.id])
  useEffect(()=>{loadMsgs()},[selected?.id])
  useEffect(()=>end.current?.scrollIntoView({behavior:'smooth'}),[msgs])
  const searchMembers = async v => {setSearch(v);if(!v.trim()){setResults([]);return};const {data}=await supabase.from('profiles').select('id,username,avatar_url').ilike('username',`%${v}%`).neq('id',user.id).limit(6);setResults(data||[])}
  const send = async e => {e.preventDefault();if(!text.trim()||!selected?.id)return;const {error}=await supabase.from('orga_messages').insert({orga_id:orga.id,member_id:selected.id,sender_id:user.id,sent_as_orga:true,content:text.trim()});if(error){alert('⚠️ '+error.message);return};setText('');loadMsgs()}
  const color=safeHexColor(orga.brand_color)||RED
  return <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:95,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}><div style={{background:WHITE,width:'100%',maxWidth:700,height:'80vh',borderRadius:22,overflow:'hidden',display:'flex',flexDirection:'column'}}>
    <div style={{background:color,color:WHITE,padding:'14px 18px',display:'flex',alignItems:'center',justifyContent:'space-between'}}><div style={{display:'flex',alignItems:'center',gap:9}}><div style={{width:32,height:32,borderRadius:'50%',overflow:'hidden',background:WHITE,color:color,display:'grid',placeItems:'center',fontWeight:900}}>{orga.logo_url?<img src={orga.logo_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:orga.name[0]}</div><b>Messages · {orga.name}</b></div><button onClick={onClose} style={{background:'rgba(255,255,255,.18)',color:WHITE,border:'none',borderRadius:99,fontSize:18,cursor:'pointer',padding:'3px 10px'}}>×</button></div>
    <div style={{display:'flex',flex:1,minHeight:0}}><div style={{width:220,borderRight:'1px solid #eee',overflowY:'auto'}}><div style={{padding:10}}><input value={search} onChange={e=>searchMembers(e.target.value)} placeholder="Nouveau message…" style={{width:'100%',boxSizing:'border-box',border:'1px solid #ddd',borderRadius:10,padding:'8px 10px',fontSize:12}}/>{results.map(p=><button key={p.id} onClick={()=>{setSelected(p);setSearch('');setResults([])}} style={{width:'100%',display:'flex',textAlign:'left',gap:7,alignItems:'center',background:WHITE,border:'none',padding:'8px 2px',cursor:'pointer'}}><Avatar url={p.avatar_url} name={p.username} size={26}/><span style={{fontSize:12,fontWeight:700}}>{p.username}</span></button>)}</div>{convs.map(p=><button key={p.id} onClick={()=>setSelected(p)} style={{width:'100%',display:'flex',gap:8,alignItems:'center',textAlign:'left',padding:'10px 12px',border:'none',borderTop:'1px solid #f4f4f4',background:selected?.id===p.id?'#f7f0f2':WHITE,cursor:'pointer'}}><Avatar url={p.avatar_url} name={p.username} size={32}/><span style={{minWidth:0,flex:1}}><b style={{fontSize:12}}>{p.username}</b><small style={{display:'block',color:'#999',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.preview}</small></span>{p.unread&&<i style={{width:8,height:8,borderRadius:'50%',background:GREEN}}/>}</button>)}</div>
    <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0}}>{selected?<><div style={{padding:'10px 14px',borderBottom:'1px solid #eee',fontSize:13,fontWeight:800}}>Discussion avec {selected.username}</div><div style={{flex:1,overflowY:'auto',padding:14,display:'flex',flexDirection:'column',gap:7}}>{msgs.map(m=><div key={m.id} style={{alignSelf:m.sent_as_orga?'flex-end':'flex-start',maxWidth:'78%',background:m.sent_as_orga?color:'#f1f1f1',color:m.sent_as_orga?WHITE:'#333',padding:'8px 11px',borderRadius:12,fontSize:13,lineHeight:1.4}}>{m.content}</div>)}<div ref={end}/></div><form onSubmit={send} style={{display:'flex',gap:8,padding:12,borderTop:'1px solid #eee'}}><input value={text} onChange={e=>setText(e.target.value)} placeholder={`Répondre en tant que ${orga.name}…`} style={{flex:1,border:'1px solid #ddd',borderRadius:99,padding:'9px 12px',fontSize:13}}/><button style={{background:color,color:WHITE,border:'none',borderRadius:99,padding:'9px 14px',fontWeight:800,cursor:'pointer'}}>Envoyer</button></form></>:<div style={{margin:'auto',color:'#aaa',fontSize:13}}>Choisis une discussion ou recherche un membre.</div>}</div></div>
  </div></div>
}

function ContactOrgaModal({ user, orga, onClose }) {
  const [text,setText] = useState('')
  const [sending,setSending] = useState(false)
  const [msgs,setMsgs] = useState([])
  const end = useRef(null)
  const color=safeHexColor(orga.brand_color)||RED
  const load = async () => {
    const {data}=await supabase.from('orga_messages').select('*').eq('orga_id',orga.id).eq('member_id',user.id).order('created_at',{ascending:true})
    setMsgs(data||[])
    await supabase.from('orga_messages').update({read_at:new Date().toISOString()}).eq('orga_id',orga.id).eq('member_id',user.id).eq('sent_as_orga',true).is('read_at',null)
  }
  useEffect(()=>{load()},[orga.id,user.id])
  useEffect(()=>end.current?.scrollIntoView({behavior:'smooth'}),[msgs])
  const send = async e => {e.preventDefault();if(!text.trim())return;setSending(true);const {error}=await supabase.from('orga_messages').insert({orga_id:orga.id,member_id:user.id,sender_id:user.id,sent_as_orga:false,content:text.trim()});setSending(false);if(error){alert('⚠️ '+error.message);return};setText('');load()}
  return <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:'fixed',inset:0,zIndex:160,background:'rgba(0,0,0,.6)',display:'grid',placeItems:'center',padding:16}}><div style={{background:WHITE,borderRadius:20,width:'100%',maxWidth:440,maxHeight:'82vh',display:'flex',flexDirection:'column',overflow:'hidden'}}><div style={{display:'flex',gap:10,alignItems:'center',padding:18,borderBottom:'1px solid #eee'}}><div style={{width:42,height:42,borderRadius:'50%',background:color,overflow:'hidden',display:'grid',placeItems:'center',color:WHITE,fontWeight:900}}>{orga.logo_url?<img src={orga.logo_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:orga.name[0]}</div><div style={{flex:1}}><h3 style={{margin:0,fontSize:17}}>Messages · {orga.name}</h3><p style={{margin:'3px 0 0',fontSize:12,color:'#888'}}>Boîte officielle de l’organisation</p></div><button onClick={onClose} style={{background:'#f2f2f2',border:'none',borderRadius:99,fontSize:20,cursor:'pointer',padding:'3px 10px'}}>×</button></div><div style={{flex:1,minHeight:120,overflowY:'auto',padding:14,display:'flex',flexDirection:'column',gap:7}}>{msgs.length===0&&<p style={{margin:'auto',textAlign:'center',color:'#999',fontSize:13}}>Démarre la conversation avec {orga.name}.</p>}{msgs.map(m=><div key={m.id} style={{alignSelf:m.sent_as_orga?'flex-start':'flex-end',maxWidth:'80%',background:m.sent_as_orga?'#f1f1f1':color,color:m.sent_as_orga?'#333':WHITE,padding:'8px 11px',borderRadius:12,fontSize:13,lineHeight:1.4}}>{m.content}</div>)}<div ref={end}/></div><form onSubmit={send} style={{display:'flex',gap:8,padding:12,borderTop:'1px solid #eee'}}><input value={text} onChange={e=>setText(e.target.value)} placeholder={`Écrire à ${orga.name}…`} style={{flex:1,border:'1px solid #ddd',borderRadius:99,padding:'10px 12px',fontSize:13}}/><button disabled={sending||!text.trim()} style={{background:color,color:WHITE,border:'none',borderRadius:99,padding:'9px 14px',fontWeight:800,cursor:'pointer'}}>{sending?'...':'Envoyer'}</button></form></div></div>
}

/* ── MessagesModal ────────────────────────────────── */
function MessagesModal({ user, userProfile, onClose, initialRecipientId, initialRecipientName, onProfileClick }) {
  const [convList,setConvList]       = useState([])
  const [convLoading,setConvLoading] = useState(true)
  const [convError,setConvError]     = useState("")
  const [selectedUserId,setSelected] = useState(initialRecipientId||null)
  const [selectedName,setSelName]    = useState(initialRecipientName||"")
  const [msgs,setMsgs]               = useState([])
  const [text,setText]               = useState("")
  const [sending,setSending]         = useState(false)
  const sendLock                     = useRef(false)
  const [search,setSearch]           = useState("")
  const [results,setResults]         = useState([])
  const msgEnd                       = useRef(null)
  const isMobile                     = useIsMobile()

  useEffect(()=>{
    fetchConvList()
    // (La permission notifications n'est PLUS demandée automatiquement :
    //  ça déclenchait les protections de confidentialité de Safari.)
  },[])

  useEffect(()=>{ if(selectedUserId) fetchMsgs() },[selectedUserId])
  useEffect(()=>{ msgEnd.current?.scrollIntoView({behavior:'smooth'}) },[msgs])

  // Realtime : écoute nouveaux messages reçus
  useEffect(()=>{
    if (!user) return
    const channel = supabase.channel(`realtime-msgs-${user.id}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`recipient_id=eq.${user.id}`}, payload => {
        const m = payload.new
        // Si on est dans la conv avec cet expéditeur, ajouter le message
        if (m.sender_id===selectedUserId) {
          setMsgs(prev=>prev.some(existing=>existing.id===m.id)?prev:[...prev, m])
        } else {
          // Sinon notif navigateur
          if (Notification.permission==='granted') {
            new Notification('Nouveau message — Malagasy Events 🇲🇬', {
              body: m.content?.slice(0,80) || "Tu as reçu un message",
              icon: '/favicon.ico',
            })
          }
          // Rafraîchir liste des convs
          fetchConvList()
        }
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'messages',filter:`recipient_id=eq.${user.id}`}, payload => {
        const m = payload.new
        if (m.sender_id===selectedUserId) setMsgs(prev=>prev.map(existing=>existing.id===m.id?m:existing))
      })
      .subscribe()
    return ()=>{ supabase.removeChannel(channel) }
  },[user, selectedUserId])

  const fetchConvList = async () => {
    setConvLoading(true); setConvError("")
    let {data,error} = await supabase.from('messages').select('sender_id,recipient_id,created_at,read,content,deleted_at').or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`).order('created_at',{ascending:false})
    // Compatibilité temporaire si le lot Supabase n'a pas encore ajouté deleted_at.
    if (error && (error.message||"").includes('deleted_at')) {
      const fallback = await supabase.from('messages').select('sender_id,recipient_id,created_at,read,content').or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`).order('created_at',{ascending:false})
      data=fallback.data; error=fallback.error
    }
    if (error) {
      console.error('[messages] chargement des conversations impossible',error)
      setConvList([]); setConvError("Impossible de charger tes conversations."); setConvLoading(false); return
    }
    const seen=new Set(); const uniq=[]; const unread={}; const last={}
    data.forEach(m=>{
      const other = m.sender_id===user.id?m.recipient_id:m.sender_id
      if (!seen.has(other)) { seen.add(other); uniq.push(other); last[other]=m }
      if (m.recipient_id===user.id && !m.read) unread[other]=true // message reçu non lu
    })
    if (uniq.length===0) { setConvList([]); setConvLoading(false); return }
    const {data:profiles,error:profilesError} = await supabase.from('profiles').select('id,username,avatar_url,plan,is_member').in('id',uniq)
    if (profilesError) {
      console.error('[messages] chargement des profils impossible',profilesError)
      setConvList([]); setConvError("Impossible de charger les profils des conversations."); setConvLoading(false); return
    }
    // ordonné par dernier message, avec drapeau "non lu" et aperçu
    const ordered = uniq.map(id=>{
      const p=(profiles||[]).find(x=>x.id===id)||{id,username:"?"}
      return {...p, unread:!!unread[id], preview:last[id]?.deleted_at?'Message supprimé':last[id]?.content||"", incoming:last[id]?.sender_id===id}
    })
    setConvList(ordered)
    setConvLoading(false)
  }

  const fetchMsgs = async () => {
    const {data} = await supabase.from('messages').select('*').or(`and(sender_id.eq.${user.id},recipient_id.eq.${selectedUserId}),and(sender_id.eq.${selectedUserId},recipient_id.eq.${user.id})`).order('created_at',{ascending:true})
    setMsgs(data||[])
    loadReactions((data||[]).map(m=>m.id))
    // mark as read
    await supabase.from('messages').update({read:true}).eq('recipient_id',user.id).eq('sender_id',selectedUserId)
    fetchConvList() // rafraîchit les gras "non lu"
  }

  const send = async e => {
    e.preventDefault()
    if (!text.trim()||!selectedUserId||sendLock.current) return
    if (iBlocked) { alert("🚫 Tu as bloqué "+selectedName+". Débloque-le/la dans ⚙️ pour écrire."); return }
    sendLock.current = true
    setSending(true)
    try {
      const {error} = await supabase.from('messages').insert({sender_id:user.id,recipient_id:selectedUserId,content:text.trim()})
      if (error) {
        if ((error.message||"").includes("row-level security")) alert("🚫 Impossible d'envoyer — l'un de vous a bloqué l'autre.")
        else alert("⚠️ "+error.message)
        return
      }
      setText(""); await fetchMsgs(); fetchConvList()
    } finally {
      sendLock.current = false
      setSending(false)
    }
  }

  /* ── Paramètres de discussion ── */
  const [showSettings,setShowSettings] = useState(false)
  const [convColor,setConvColor]       = useState("")
  const [convEmoji,setConvEmoji]       = useState("")
  const [iBlocked,setIBlocked]         = useState(false)
  const [reactions,setReactions]       = useState({})
  const [reactingId,setReactingId]     = useState(null)
  const [editingId,setEditingId]       = useState(null)
  const [editingText,setEditingText]   = useState("")
  const [messageBusyId,setMessageBusy] = useState(null)
  const CONV_COLORS = ["#C8102E","#1565c0","#3C3489","#007A3D","#e65100","#c2185b","#222222"]
  const CONV_EMOJIS = ["","🇲🇬","❤️","🌺","🎉","🔥","⭐","🤝"]
  const REACTS = ["❤️","😂","👍","😮","😢"]
  const bubbleColor = convColor || RED
  const selAvatar = convList.find(c=>c.id===selectedUserId)?.avatar_url

  useEffect(()=>{ if (selectedUserId) { loadConvMeta(); setShowSettings(false); setReactingId(null); setEditingId(null) } },[selectedUserId])
  const loadConvMeta = async () => {
    const [cs,bl] = await Promise.all([
      supabase.from('conv_settings').select('*').eq('user_id',user.id).eq('other_id',selectedUserId).maybeSingle(),
      supabase.from('blocks').select('id').eq('blocker_id',user.id).eq('blocked_id',selectedUserId).maybeSingle(),
    ])
    setConvColor(cs.data?.color||""); setConvEmoji(cs.data?.emoji||""); setIBlocked(!!bl.data)
  }
  const saveConvSetting = async patch => {
    const next = { color: patch.color!==undefined?patch.color:convColor, emoji: patch.emoji!==undefined?patch.emoji:convEmoji }
    setConvColor(next.color); setConvEmoji(next.emoji)
    const {error} = await supabase.from('conv_settings').upsert({user_id:user.id,other_id:selectedUserId,...next},{onConflict:'user_id,other_id'})
    if (error) alert("⚠️ Réglage non sauvegardé ("+error.message+") — as-tu exécuté le SQL messagerie ?")
  }
  const toggleBlock = async () => {
    if (iBlocked) {
      await supabase.from('blocks').delete().eq('blocker_id',user.id).eq('blocked_id',selectedUserId)
      setIBlocked(false)
    } else if (window.confirm("Bloquer "+selectedName+" ? Vous ne pourrez plus vous écrire (débloquable à tout moment).")) {
      const {error} = await supabase.from('blocks').insert({blocker_id:user.id,blocked_id:selectedUserId})
      if (error && error.code!=='23505') alert("⚠️ "+error.message)
      else setIBlocked(true)
    }
  }
  const reportConv = async () => {
    const reason = window.prompt("Pourquoi signales-tu cette conversation ?")
    if (reason===null) return
    const excerpt = ("Conversation avec @"+selectedName+" — derniers messages : "+msgs.slice(-3).map(m=>(m.sender_id===user.id?"moi: ":"eux: ")+m.content).join(" | ")).slice(0,400)
    const {error} = await supabase.from('reports').insert({target_type:'conversation',target_id:0,target_excerpt:excerpt,reason,reporter_id:user.id})
    alert(error?"⚠️ "+error.message:"🚩 Signalement envoyé aux admins. Merci !")
    setShowSettings(false)
  }
  const loadReactions = async ids => {
    if (!ids.length) { setReactions({}); return }
    const {data} = await supabase.from('message_reactions').select('*').in('message_id',ids)
    const map = {}; (data||[]).forEach(r=>{ (map[r.message_id]=map[r.message_id]||[]).push(r) })
    setReactions(map)
  }
  const react = async (msgId,emoji) => {
    setReactingId(null)
    const mine = (reactions[msgId]||[]).find(r=>r.user_id===user.id)
    if (mine && mine.emoji===emoji) await supabase.from('message_reactions').delete().eq('id',mine.id)
    else {
      const {error} = await supabase.from('message_reactions').upsert({message_id:msgId,user_id:user.id,emoji},{onConflict:'message_id,user_id'})
      if (error) { alert("⚠️ Réaction impossible ("+error.message+") — as-tu exécuté le SQL messagerie ?"); return }
    }
    loadReactions(msgs.map(m=>m.id))
  }
  const startEditingMessage = m => {
    if (m.sender_id!==user.id || m.deleted_at || Date.now()-new Date(m.created_at).getTime()>30*60*1000) return
    setEditingId(m.id); setEditingText(m.content); setReactingId(null)
  }
  const saveEditedMessage = async m => {
    const content = editingText.trim()
    if (!content || content===m.content) { setEditingId(null); return }
    setMessageBusy(m.id)
    const {data,error} = await supabase.from('messages').update({content}).eq('id',m.id).eq('sender_id',user.id).select('*').maybeSingle()
    setMessageBusy(null)
    if (error || !data) { alert("⚠️ Modification impossible : les droits de messagerie doivent être activés dans Supabase."); return }
    setMsgs(prev=>prev.map(existing=>existing.id===m.id?data:existing))
    setEditingId(null); setEditingText(""); fetchConvList()
  }
  const deleteMessage = async m => {
    if (m.sender_id!==user.id || !window.confirm("Supprimer ce message ?")) return
    setMessageBusy(m.id); setReactingId(null)
    const {data,error} = await supabase.from('messages').update({content:'',deleted_at:new Date().toISOString(),deleted_by:user.id,deleted_for_everyone:true}).eq('id',m.id).eq('sender_id',user.id).is('deleted_at',null).select('*').maybeSingle()
    setMessageBusy(null)
    if (error || !data) { alert("⚠️ Suppression impossible : le lot unique de messagerie doit être activé dans Supabase."); return }
    setMsgs(prev=>prev.map(existing=>existing.id===m.id?data:existing))
    setEditingId(null); fetchConvList()
  }

  const searchUsers = async val => {
    setSearch(val)
    if (!val.trim()) { setResults([]); return }
    const {data} = await supabase.from('profiles').select('id,username,avatar_url,plan,is_member').ilike('username',`%${val}%`).neq('id',user.id).limit(5)
    setResults(data||[])
  }

  const [selPlan,setSelPlan] = useState(null)
  const selectUser = (id,name,plan) => { setSelected(id); setSelName(name); setSelPlan(plan||null); setSearch(""); setResults([]) }
  useEffect(()=>{ // plan du destinataire initial (ouvert depuis un profil)
    if (initialRecipientId && selPlan===null) supabase.from('profiles').select('plan').eq('id',initialRecipientId).maybeSingle().then(({data})=>setSelPlan(data?.plan||""))
  },[initialRecipientId])

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:95,padding:16}}>
      <div style={{background:WHITE,borderRadius:24,width:"100%",maxWidth:700,height:"80vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,0.3)"}}>
        {/* Header */}
        <div style={{background:RED,padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <h3 style={{color:WHITE,fontWeight:800,margin:0}}>💬 Messages</h3>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",color:WHITE,fontWeight:800,fontSize:18,padding:"4px 10px",borderRadius:99,border:"none",cursor:"pointer"}}>×</button>
        </div>
        <div style={{flex:1,display:"flex",overflow:"hidden"}}>
          {/* Conversations list */}
          <div style={{width:isMobile&&selectedUserId?0:220,minWidth:isMobile&&selectedUserId?0:220,borderRight:"1px solid #f0f0f0",display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <div style={{padding:"12px"}}>
              <input value={search} onChange={e=>searchUsers(e.target.value)} placeholder="Chercher un utilisateur..." style={{width:"100%",border:"1.5px solid #eee",borderRadius:10,padding:"7px 12px",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
              {results.length>0 && (
                <div style={{background:WHITE,border:"1px solid #eee",borderRadius:10,marginTop:4,overflow:"hidden",boxShadow:"0 4px 16px rgba(0,0,0,0.1)"}}>
                  {results.map(r=>(
                    <div key={r.id} onClick={()=>selectUser(r.id,r.username,r.plan)} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",cursor:"pointer",borderBottom:"1px solid #f5f5f5"}}>
                      <Avatar url={r.avatar_url} name={r.username} size={32}/>
                      <span style={{fontSize:13,fontWeight:600,color:isOfficial(r.username)?RED:"#111"}}>{r.username}</span>
                      {isOfficial(r.username) ? <OfficialBadge size={8}/> : <><PlanBadge plan={r.plan} size={8}/>{!PLAN_BADGE[r.plan] && r.is_member && <span style={{background:GREEN,color:WHITE,fontSize:8,fontWeight:800,padding:"1px 5px",borderRadius:99}}>MEMBRE</span>}</>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{flex:1,overflowY:"auto"}}>
              {convList.map(c=>(
                <div key={c.id} onClick={()=>selectUser(c.id,c.username,c.plan)} style={{display:"flex",alignItems:"center",gap:10,padding:"12px",cursor:"pointer",background:selectedUserId===c.id?"#fde8ec":c.unread?"#fff8f9":"transparent",borderBottom:"1px solid #f5f5f5"}}>
                  <div style={{position:"relative",flexShrink:0}}>
                    <Avatar url={c.avatar_url} name={c.username} size={38}/>
                    {c.unread && <span style={{position:"absolute",top:-1,right:-1,width:11,height:11,borderRadius:"50%",background:GREEN,border:"2px solid #fff"}}/>}
                  </div>
                  <div style={{minWidth:0,flex:1}}>
                    <span style={{fontSize:13,fontWeight:c.unread?800:600,color:isOfficial(c.username)?RED:(c.unread?"#111":(selectedUserId===c.id?RED:"#333"))}}>{c.username}</span>
                    {isOfficial(c.username) ? <OfficialBadge size={8}/> : <><PlanBadge plan={c.plan} size={8}/>{!PLAN_BADGE[c.plan] && c.is_member && <span style={{background:GREEN,color:WHITE,fontSize:8,fontWeight:800,padding:"1px 5px",borderRadius:99}}>MEMBRE</span>}</>}
                    {c.preview && <p style={{fontSize:11,margin:"2px 0 0",color:c.unread?"#444":"#aaa",fontWeight:c.unread?700:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.incoming?"":"Toi : "}{c.preview}</p>}
                  </div>
                </div>
              ))}
              {convLoading && !search && (
                <p style={{fontSize:12,color:"#999",textAlign:"center",padding:16}}>Chargement des conversations…</p>
              )}
              {!convLoading && convError && !search && (
                <div style={{padding:16,textAlign:"center"}}><p style={{fontSize:12,color:RED,margin:"0 0 8px"}}>{convError}</p><button onClick={fetchConvList} style={{background:RED,color:WHITE,border:"none",borderRadius:99,padding:"7px 12px",fontSize:12,fontWeight:800,cursor:"pointer"}}>Réessayer</button></div>
              )}
              {!convLoading && !convError && convList.length===0 && !search && (
                <p style={{fontSize:12,color:"#bbb",textAlign:"center",padding:16}}>Cherche un utilisateur pour démarrer une conversation</p>
              )}
            </div>
          </div>
          {/* Messages */}
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
            {selectedUserId ? (
              <>
                <div style={{padding:"10px 16px",borderBottom:"1px solid #f0f0f0",display:"flex",alignItems:"center",gap:10}}>
                  {isMobile && <button onClick={()=>setSelected(null)} style={{background:"none",border:"none",color:RED,fontWeight:700,cursor:"pointer"}}>←</button>}
                  <div onClick={()=>onProfileClick&&onProfileClick(selectedUserId,selectedName)} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",minWidth:0,flex:1}} title="Voir le profil">
                    {convEmoji
                      ? <div style={{width:34,height:34,borderRadius:"50%",background:bubbleColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>{convEmoji}</div>
                      : <Avatar url={selAvatar} name={selectedName} size={34} bg={bubbleColor}/>}
                    <span style={{fontWeight:700,fontSize:14,color:isOfficial(selectedName)?RED:"#333",textDecoration:"underline dotted",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{selectedName}</span>
                    {isOfficial(selectedName) ? <OfficialBadge/> : <PlanBadge plan={selPlan}/>}
                  </div>
                  <button onClick={()=>setShowSettings(v=>!v)} title="Paramètres de la discussion" style={{background:showSettings?"#f0f0f0":"none",border:"none",fontSize:17,cursor:"pointer",borderRadius:99,padding:"4px 8px"}}>⚙️</button>
                </div>
                {showSettings && (
                  <div style={{borderBottom:"1px solid #f0f0f0",padding:"12px 16px",background:"#fafafa",display:"flex",flexDirection:"column",gap:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      <span style={{fontSize:11,fontWeight:700,color:"#999",textTransform:"uppercase",width:70}}>Couleur</span>
                      {CONV_COLORS.map(c=>(
                        <button key={c} onClick={()=>saveConvSetting({color:c===convColor?"":c})} style={{width:24,height:24,borderRadius:"50%",background:c,border:convColor===c?"3px solid #b8860b":"2px solid #fff",boxShadow:"0 1px 4px rgba(0,0,0,0.2)",cursor:"pointer"}}/>
                      ))}
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      <span style={{fontSize:11,fontWeight:700,color:"#999",textTransform:"uppercase",width:70}}>Icône</span>
                      {CONV_EMOJIS.map(em=>(
                        <button key={em||"none"} onClick={()=>saveConvSetting({emoji:em})} style={{width:28,height:28,borderRadius:8,background:convEmoji===em?"#fde8ec":"#fff",border:convEmoji===em?"1.5px solid #C8102E":"1px solid #e5e5e5",fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{em||"∅"}</button>
                      ))}
                    </div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      <button onClick={()=>onProfileClick&&onProfileClick(selectedUserId,selectedName)} style={{background:"#f0f0f0",color:"#333",fontWeight:700,fontSize:12,padding:"7px 12px",borderRadius:99,border:"none",cursor:"pointer"}}>👤 Voir le profil</button>
                      <button onClick={toggleBlock} style={{background:iBlocked?"#e6f4ed":"#fff3e0",color:iBlocked?GREEN:"#b35c00",fontWeight:700,fontSize:12,padding:"7px 12px",borderRadius:99,border:"none",cursor:"pointer"}}>{iBlocked?"✅ Débloquer":"🚫 Bloquer"}</button>
                      <button onClick={reportConv} style={{background:"#f0f0f0",color:"#555",fontWeight:700,fontSize:12,padding:"7px 12px",borderRadius:99,border:"none",cursor:"pointer"}}>🚩 Signaler</button>
                    </div>
                  </div>
                )}
                {iBlocked && (
                  <div style={{background:"#fff3e0",padding:"8px 16px",fontSize:12,color:"#b35c00",fontWeight:600,display:"flex",alignItems:"center",gap:8}}>
                    🚫 Tu as bloqué {selectedName} — vous ne pouvez plus vous écrire.
                    <button onClick={toggleBlock} style={{background:"none",border:"none",color:GREEN,fontWeight:800,fontSize:12,cursor:"pointer",textDecoration:"underline"}}>Débloquer</button>
                  </div>
                )}
                <div style={{flex:1,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:8}}>
                  {msgs.map(m=>{
                    const mine = m.sender_id===user.id
                    const deleted = !!m.deleted_at
                    const canEditMessage = mine && !deleted && Date.now()-new Date(m.created_at).getTime()<=30*60*1000
                    const rx = reactions[m.id]||[]
                    const counts = rx.reduce((a,r)=>{a[r.emoji]=(a[r.emoji]||0)+1;return a},{})
                    return (
                      <div key={m.id} style={{display:"flex",flexDirection:"column",alignItems:mine?"flex-end":"flex-start"}}>
                        {reactingId===m.id && editingId!==m.id && !deleted && (
                          <div style={{display:"flex",alignItems:"center",gap:2,background:WHITE,border:"1px solid #eee",borderRadius:99,padding:"3px 6px",boxShadow:"0 4px 14px rgba(0,0,0,0.15)",marginBottom:3,flexWrap:"wrap"}}>
                            {REACTS.map(em=>(
                              <button key={em} onClick={()=>react(m.id,em)} style={{background:(rx.find(r=>r.user_id===user.id)?.emoji===em)?"#fde8ec":"none",border:"none",fontSize:17,cursor:"pointer",borderRadius:99,padding:"2px 4px"}}>{em}</button>
                            ))}
                            {mine && <span style={{width:1,height:20,background:"#eee",margin:"0 3px"}}/>}
                            {canEditMessage && <button onClick={()=>startEditingMessage(m)} disabled={messageBusyId===m.id} style={{background:"none",border:"none",color:"#555",fontSize:11,fontWeight:800,cursor:"pointer",padding:"4px 6px"}}>✏️ Modifier</button>}
                            {mine && <button onClick={()=>deleteMessage(m)} disabled={messageBusyId===m.id} style={{background:"none",border:"none",color:RED,fontSize:11,fontWeight:800,cursor:"pointer",padding:"4px 6px"}}>🗑️ Supprimer</button>}
                          </div>
                        )}
                        {editingId===m.id ? (
                          <div style={{maxWidth:"78%",background:"#fff",border:`2px solid ${bubbleColor}`,borderRadius:14,padding:8,display:"flex",flexDirection:"column",gap:7}}>
                            <input autoFocus value={editingText} onChange={e=>setEditingText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();saveEditedMessage(m)} if(e.key==='Escape')setEditingId(null)}} maxLength={4000} style={{border:"1px solid #ddd",borderRadius:9,padding:"8px 10px",fontSize:14,minWidth:220,outline:"none"}}/>
                            <div style={{display:"flex",justifyContent:"flex-end",gap:6}}>
                              <button onClick={()=>setEditingId(null)} disabled={messageBusyId===m.id} style={{background:"#f2f2f2",border:"none",borderRadius:99,padding:"5px 9px",fontSize:11,fontWeight:700,cursor:"pointer"}}>Annuler</button>
                              <button onClick={()=>saveEditedMessage(m)} disabled={messageBusyId===m.id||!editingText.trim()} style={{background:bubbleColor,color:WHITE,border:"none",borderRadius:99,padding:"5px 9px",fontSize:11,fontWeight:800,cursor:"pointer",opacity:editingText.trim()?1:.5}}>{messageBusyId===m.id?"Enregistrement…":"Enregistrer"}</button>
                            </div>
                          </div>
                        ) : (
                          <div onClick={()=>!deleted&&setReactingId(reactingId===m.id?null:m.id)} title={deleted?"Message supprimé":mine?"Réagir, modifier ou supprimer":"Réagir"} style={{maxWidth:"70%",background:deleted?"#f4f4f4":mine?bubbleColor:"#f0f0f0",color:deleted?"#999":mine?WHITE:"#333",borderRadius:mine?"16px 16px 4px 16px":"16px 16px 16px 4px",padding:"9px 14px",fontSize:14,cursor:deleted?"default":"pointer",fontStyle:deleted?"italic":"normal"}}>
                            {deleted?'Message supprimé':m.content}
                            <div style={{fontSize:10,color:deleted?"#bbb":mine?"rgba(255,255,255,0.7)":"#bbb",marginTop:3,textAlign:"right"}}>{m.edited_at&&!deleted?'modifié · ':''}{ago(m.created_at)}</div>
                          </div>
                        )}
                        {rx.length>0 && (
                          <div style={{display:"flex",gap:4,marginTop:2}}>
                            {Object.entries(counts).map(([em,c])=>(
                              <span key={em} style={{background:WHITE,border:"1px solid #eee",borderRadius:99,fontSize:11,padding:"1px 7px",boxShadow:"0 1px 3px rgba(0,0,0,0.08)"}}>{em}{c>1?" "+c:""}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {msgs.length===0 && <p style={{textAlign:"center",color:"#bbb",fontSize:13}}>Dis bonjour 👋</p>}
                  <div ref={msgEnd}/>
                </div>
                <form onSubmit={send} style={{padding:"12px 16px",borderTop:"1px solid #f0f0f0",display:"flex",gap:8}}>
                  <input value={text} onChange={e=>setText(e.target.value)} placeholder="Ton message..." disabled={sending} style={{flex:1,border:"1.5px solid #eee",borderRadius:99,padding:"9px 16px",fontSize:13,outline:"none",opacity:sending?.7:1}}/>
                  <button type="submit" disabled={sending||!text.trim()||iBlocked} style={{background:RED,color:WHITE,fontWeight:700,padding:"9px 18px",borderRadius:99,border:"none",cursor:sending?"wait":"pointer",opacity:(!sending&&text.trim()&&!iBlocked)?1:.5}}>{sending?"Envoi…":"Envoyer"}</button>
                </form>
              </>
            ) : (
              <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:8,color:"#bbb"}}>
                <p style={{fontSize:32}}>💬</p>
                <p style={{fontSize:14,fontWeight:600}}>Sélectionne une conversation</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── AfterMoviePage ───────────────────────────────── */
const GASTRO_COLORS = {"Restaurant":{bg:"#FAECE7",color:"#712B13"},"Traiteur":{bg:"#e6f4ed",color:GREEN},"Food truck":{bg:"#fff3e0",color:"#e65100"},"Guide":{bg:"#EEEDFE",color:"#3C3489"},"Communauté":{bg:"#e3f2fd",color:"#1565c0"}}
const GASTRO_EMOJI  = {"Restaurant":"🍽️","Traiteur":"👨‍🍳","Food truck":"🚚","Guide":"📣","Communauté":"👥"}
const GASTRO_GRAD   = {"Restaurant":"linear-gradient(135deg,#C8102E,#7a0a1c)","Traiteur":"linear-gradient(135deg,#007A3D,#044d27)","Food truck":"linear-gradient(135deg,#e65100,#9c3a00)","Guide":"linear-gradient(135deg,#3C3489,#26215C)","Communauté":"linear-gradient(135deg,#1565c0,#0C447C)"}

const ORGA_COLORS = {"Association sportive":{bg:"#e3f2fd",color:"#1565c0"},"Association":{bg:"#e6f4ed",color:GREEN},"Organisateur":{bg:"#fde8ec",color:RED},"DJ & artistes":{bg:"#FBEAF0",color:"#72243E"},"Média":{bg:"#EEEDFE",color:"#3C3489"},"Groupe":{bg:"#fff3e0",color:"#b35c00"}}
const ORGA_GRAD = {"Association sportive":"linear-gradient(135deg,#1565c0,#0C447C)","Association":"linear-gradient(135deg,#007A3D,#044d27)","Organisateur":"linear-gradient(135deg,#C8102E,#7a0a1c)","DJ & artistes":"linear-gradient(135deg,#72243E,#4B1528)","Média":"linear-gradient(135deg,#3C3489,#26215C)","Groupe":"linear-gradient(135deg,#b35c00,#7a3d00)"}
const ORGA_EMOJI  = {"Association sportive":"🏆","Association":"🤝","Organisateur":"🎪","DJ & artistes":"🎧","Média":"📰","Groupe":"👥"}

function OrgaTeam({ orga, user, isOwner, isAdmin, onAuthRequired }) {
  const manage = isOwner || isAdmin
  const [mine,setMine] = useState(null)
  const [rows,setRows] = useState([])
  const [busy,setBusy] = useState(false)
  const load = async () => {
    if (manage) {
      const {data} = await supabase.from('orga_team').select('*, profiles(username,avatar_url)').eq('orga_id',orga.id).order('created_at',{ascending:false})
      setRows(data||[])
    } else if (user) {
      const {data} = await supabase.from('orga_team').select('status').eq('orga_id',orga.id).eq('user_id',user.id).maybeSingle()
      setMine(data||null)
    }
  }
  useEffect(()=>{ load() },[orga.id,user,manage])
  const join = async () => {
    if (!user) { onAuthRequired(); return }
    setBusy(true)
    const {error} = await supabase.from('orga_team').insert({orga_id:orga.id,user_id:user.id,status:'pending'})
    if (!error) setMine({status:'pending'})
    setBusy(false)
  }
  const decide = async (id,status) => { await supabase.from('orga_team').update({status}).eq('id',id); await load() }
  const removeRow = async id => { await supabase.from('orga_team').delete().eq('id',id); await load() }
  const pill = (bg,color,txt) => <span style={{background:bg,color,fontWeight:800,fontSize:12.5,padding:"8px 14px",borderRadius:99,display:"inline-block"}}>{txt}</span>

  if (!manage) {
    if (!user) return null
    return (
      <div style={{margin:"0 0 16px"}}>
        {!mine
          ? <button onClick={join} disabled={busy} style={{background:"#eef4fc",color:"#185FA5",fontWeight:800,fontSize:13,padding:"9px 16px",borderRadius:99,border:"none",cursor:"pointer"}}>🤝 Rejoindre l'équipe</button>
          : mine.status==="pending" ? pill("#fff3e0","#a15a1a","⏳ Demande envoyée")
          : mine.status==="accepted" ? pill("#e6f4ed",GREEN,"✅ Membre de l'équipe")
          : pill("#f0f0f0","#999","Demande non retenue")}
      </div>
    )
  }
  const pending = rows.filter(r=>r.status==="pending")
  const members = rows.filter(r=>r.status==="accepted")
  const Row = ({r,children}) => (
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderTop:"1px solid #e6eee9"}}>
      <span style={{flex:1,fontSize:12.5,fontWeight:700,color:"#333"}}>{r.profiles?.username||"Membre"}</span>{children}
    </div>
  )
  return (
    <div style={{background:"#f7faf8",border:"1px solid #dcefe3",borderRadius:14,padding:"12px 14px",margin:"0 0 16px"}}>
      <p style={{fontWeight:800,fontSize:13,color:GREEN,margin:"0 0 4px"}}>🤝 Mon équipe</p>
      {pending.length>0 && <>
        <p style={{fontSize:11,fontWeight:700,color:"#999",textTransform:"uppercase",margin:"8px 0 2px"}}>Demandes ({pending.length})</p>
        {pending.map(r=><Row key={r.id} r={r}>
          <button onClick={()=>decide(r.id,"accepted")} style={{background:GREEN,color:WHITE,border:"none",borderRadius:99,fontSize:11.5,fontWeight:700,padding:"5px 12px",cursor:"pointer"}}>Accepter</button>
          <button onClick={()=>decide(r.id,"rejected")} style={{background:"#f0f0f0",color:"#888",border:"none",borderRadius:99,fontSize:11.5,fontWeight:700,padding:"5px 12px",cursor:"pointer"}}>Refuser</button>
        </Row>)}
      </>}
      <p style={{fontSize:11,fontWeight:700,color:"#999",textTransform:"uppercase",margin:"10px 0 2px"}}>Membres ({members.length})</p>
      {members.length ? members.map(r=><Row key={r.id} r={r}>
        <button onClick={()=>removeRow(r.id)} style={{background:"none",border:"none",color:"#ccc",fontSize:13,cursor:"pointer"}}>🗑️</button>
      </Row>) : <p style={{fontSize:12,color:"#888",margin:"4px 0 0"}}>Aucun membre pour l'instant.</p>}
    </div>
  )
}

function OrgaDetail({ o, isMobile, user, userProfile, isAdmin, events, onOpenEvent, onClose, onUpdated, onAuthRequired }) {
  const col = ORGA_COLORS[o.type]||{bg:"#f5f5f5",color:"#555"}
  const brandColor = safeHexColor(o.brand_color)||col.color
  const isOwner = !!user && o.owner_id===user.id
  const canEdit = isOwner || (!!user && isAdmin)
  const isPro = o.plan==='pro' && (!o.plan_until || o.plan_until >= new Date().toISOString().slice(0,10))
  const memberCanPost = userProfile?.plan==="organisateur"
  const canPost = (isOwner && (isPro || memberCanPost)) || (!!user && isAdmin)
  const [editing,setEditing] = useState(false)
  const [form,setForm] = useState({...o})
  const [saving,setSaving] = useState(false)
  const [posts,setPosts] = useState([])
  const [postText,setPostText] = useState("")
  const [postImg,setPostImg] = useState("")
  const [postImgUp,setPostImgUp] = useState(false)
  const [posting,setPosting] = useState(false)
  const [followerCount,setFollowerCount] = useState(0)
  const [followers,setFollowers] = useState([])
  const [showFollowers,setShowFollowers] = useState(false)
  const [editingPostId,setEditingPostId] = useState(null)
  const [editingPostText,setEditingPostText] = useState('')
  const [savingPostEdit,setSavingPostEdit] = useState(false)
  useEffect(()=>{
    supabase.from('orga_posts').select('*, profiles(username)').eq('orga_id',o.id).order('created_at',{ascending:false}).limit(20)
      .then(({data})=>setPosts(data||[]))
    supabase.from('orga_follows').select('*',{count:'exact',head:true}).eq('orga_id',o.id)
      .then(({count})=>setFollowerCount(count||0))
    if (isOwner) {
      ;(async()=>{
        const {data: rows} = await supabase.from('orga_follows').select('user_id,created_at').eq('orga_id',o.id).order('created_at',{ascending:false})
        const ids = (rows||[]).map(x=>x.user_id)
        const {data: profiles} = ids.length ? await supabase.from('profiles').select('id,username,avatar_url,code_postal').in('id',ids) : {data:[]}
        setFollowers(ids.map(id=>(profiles||[]).find(p=>p.id===id)).filter(Boolean))
      })()
    }
  },[o.id,isOwner])
  const publish = async () => {
    const content = postText.trim(); if(!content) return
    setPosting(true)
    const {data,error} = await supabase.from('orga_posts').insert({orga_id:o.id,user_id:user.id,content,image_url:postImg.trim()}).select('*, profiles(username)').single()
    if (error) alert("⚠️ Publication refusée ("+error.message+").\nSeul le propriétaire de la fiche avec un forfait Organisateur actif peut publier.")
    else { setPosts(p=>[data,...p]); setPostText(""); setPostImg("") }
    setPosting(false)
  }
  const delPost = async id => {
    if (!confirm("Supprimer cette actu ?")) return
    setPosts(p=>p.filter(x=>x.id!==id))
    await supabase.from('orga_posts').delete().eq('id',id)
  }
  const savePostEdit = async id => {
    const content = editingPostText.trim(); if (!content) return
    setSavingPostEdit(true)
    const {error} = await supabase.from('orga_posts').update({content}).eq('id',id)
    setSavingPostEdit(false)
    if (error) { alert('⚠️ Modification impossible ('+error.message+')'); return }
    setPosts(list=>list.map(p=>p.id===id?{...p,content}:p)); setEditingPostId(null)
  }
  const featuredLabel = until => {
    const ms = new Date(until||0).getTime()-Date.now()
    if (ms<=0) return null
    const hours = Math.ceil(ms/3600000)
    return hours>=48 ? `${Math.ceil(hours/24)} jours` : `${hours} h`
  }
  const extendFeatured = async p => {
    const end = new Date(p.featured_until||0)
    const start = end.getTime()>Date.now() ? end : new Date()
    const featured_until = new Date(start.getTime()+7*24*3600000).toISOString()
    const {data,error} = await supabase.from('orga_posts').update({featured_until}).eq('id',p.id).select().single()
    if (error) { alert('⚠️ Prolongation impossible ('+error.message+')'); return }
    setPosts(list=>list.map(x=>x.id===p.id?{...x,...data}:x))
  }
  const initials = o.name.split(" ").filter(Boolean).map(w=>w[0]).slice(0,2).join("").toUpperCase()
  const theirEvents = events.filter(e=>eventBelongsToOrga(e,o)).sort((a,b)=>new Date(a.date)-new Date(b.date))
  const isRnsPartner = canonicalOrgaName(o.name)==="rns rencontre nationale sportive"
  const inp = {border:"1.5px solid #e5e5e5",borderRadius:10,padding:"9px 12px",fontSize:13,outline:"none",width:"100%",boxSizing:"border-box"}

  const save = async () => {
    setSaving(true)
    const payload = {...form}; delete payload.id
    if (!isAdmin) { delete payload.plan; delete payload.plan_until; delete payload.owner_id }
    const {error} = await supabase.from('organisateurs').update(payload).eq('id',o.id)
    if (error) alert("⚠️ Non sauvegardé ("+error.message+").\nSeul le compte propriétaire de la fiche ou l'admin officiel peut modifier.")
    else { onUpdated({...payload,id:o.id}); setEditing(false) }
    setSaving(false)
  }

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"flex-start",justifyContent:"center",zIndex:80,overflowY:"auto",padding:16}}>
      <div style={{background:WHITE,borderRadius:24,width:"100%",maxWidth:600,margin:"auto",boxShadow:"0 24px 80px rgba(0,0,0,0.3)",overflow:"hidden"}}>
        <div style={{position:"relative",height:isMobile?140:170,background:`linear-gradient(135deg, ${brandColor} 0%, #161616 130%)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:4,display:"flex"}}>
            <div style={{flex:1,background:WHITE}}/><div style={{flex:1,background:RED}}/><div style={{flex:1,background:GREEN}}/>
          </div>
          <button onClick={onClose} style={{position:"absolute",top:14,right:14,background:"rgba(0,0,0,0.4)",color:WHITE,fontWeight:800,fontSize:20,width:36,height:36,borderRadius:"50%",border:"none",cursor:"pointer"}}>×</button>
          <div style={{width:60,height:60,borderRadius:"50%",background:WHITE,color:brandColor,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:20,overflow:'hidden',border:'2px solid rgba(255,255,255,.45)'}}>{o.logo_url?<img src={o.logo_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:initials}</div>
          <span style={{color:"rgba(255,255,255,0.9)",fontWeight:800,fontSize:11,letterSpacing:2.5,textTransform:"uppercase"}}>🇲🇬 Organisateurs & associations</span>
        </div>
        <div style={{padding:isMobile?"18px 20px 24px":"22px 28px 30px"}}>
          {!editing ? (<>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10}}>
              <h2 style={{fontWeight:800,fontSize:21,color:"#111",margin:"0 0 8px"}}>{o.name}</h2>
              {canEdit && <button onClick={()=>{setForm({...o});setEditing(true)}} style={{background:"#f0f0f0",color:"#333",fontWeight:700,fontSize:12,padding:"7px 14px",borderRadius:99,border:"none",cursor:"pointer",whiteSpace:"nowrap"}}>✏️ Modifier</button>}
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:14}}>
              <span style={{background:col.bg,color:col.color,fontSize:12,fontWeight:700,padding:"4px 12px",borderRadius:99}}>{ORGA_EMOJI[o.type]||"🎪"} {o.type}</span>
              {isPro && <span style={{background:"linear-gradient(135deg,#b8860b,#e6b31e)",color:WHITE,fontSize:11,fontWeight:800,padding:"4px 10px",borderRadius:99,letterSpacing:0.5}}>⭐ PRO</span>}
              {o.city && <span style={{fontSize:13,color:"#666",fontWeight:600}}>📍 {o.city}</span>}
              <span style={{fontSize:13,color:"#999"}}>👥 {followerCount} abonné{followerCount>1?'s':''}</span>
            </div>
            {o.note && <p style={{fontSize:14,color:"#555",lineHeight:1.6,margin:"0 0 16px"}}>{o.note}</p>}
            {!isOwner && <div style={{margin:"0 0 16px"}}><OrgaFollowButton orgaId={o.id} currentUser={user} onAuthRequired={onAuthRequired} onChange={d=>setFollowerCount(c=>Math.max(0,c+d))}/></div>}
            {isOwner && <div style={{background:'#f7faf8',border:'1px solid #dcefe3',borderRadius:14,padding:'12px 14px',margin:'0 0 16px'}}>
              <button onClick={()=>setShowFollowers(v=>!v)} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',background:'none',border:'none',padding:0,cursor:'pointer',fontWeight:800,fontSize:13,color:GREEN}}><span>👥 Tes abonnés · {followerCount}</span><span>{showFollowers?'▲':'▼'}</span></button>
              {showFollowers && <div style={{marginTop:10}}>{followers.length?followers.map(p=><div key={p.id} style={{display:'flex',alignItems:'center',gap:9,padding:'7px 0',borderTop:'1px solid #e6eee9'}}><div style={{width:30,height:30,borderRadius:'50%',background:'#e6f4ed',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',color:GREEN,fontWeight:800}}>{p.avatar_url?<img src={p.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:(p.username||'?')[0].toUpperCase()}</div><div><p style={{fontSize:12.5,fontWeight:700,margin:0,color:'#333'}}>{p.username||'Membre'}</p>{p.code_postal&&<p style={{fontSize:10.5,color:'#999',margin:'1px 0 0'}}>📍 {p.code_postal}</p>}</div></div>):<p style={{fontSize:12,color:'#888',margin:'8px 0 0'}}>Pas encore d’abonné. Partage ta fiche pour lancer ta communauté.</p>}</div>}
            </div>}
            <OrgaTeam orga={o} user={user} isOwner={isOwner} isAdmin={isAdmin} onAuthRequired={onAuthRequired}/>
            {o.contact && (
              <div style={{display:"flex",alignItems:"center",gap:10,background:"#f7f7f7",borderRadius:12,padding:"10px 14px",fontSize:13,color:"#333",fontWeight:600,marginBottom:14}}>📞 {o.contact}</div>
            )}
            {(posts.length>0 || canPost || isOwner) && (
              <div style={{marginBottom:16}}>
                <p style={{fontWeight:700,fontSize:13,color:"#444",margin:"0 0 8px"}}>📣 Actus {isPro && <span style={{fontSize:10,fontWeight:800,color:"#b8860b"}}>· espace PRO</span>}</p>
                {canPost && (
                  <div style={{background:"#faf6ec",border:"1.5px solid #e6d9a8",borderRadius:12,padding:12,marginBottom:10}}>
                    <textarea value={postText} onChange={e=>setPostText(e.target.value)} placeholder="Annoncez un événement, une promo, une actualité…" rows={2} style={{...inp,resize:"vertical",fontFamily:"system-ui,sans-serif",marginBottom:8}}/>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <label htmlFor={`orga-img-${o.id}`} style={{flex:1,display:"flex",alignItems:"center",gap:6,border:"1.5px solid #e6d9a8",borderRadius:10,padding:"9px 12px",fontSize:12,color:postImg?GREEN:"#7a5c00",cursor:"pointer",fontWeight:600,background:WHITE}}>{postImgUp?"⏳ Envoi...":postImg?"✓ Photo ajoutée":"📷 Ajouter une photo"}</label>
                      <input id={`orga-img-${o.id}`} type="file" accept="image/*" style={{display:"none"}} onChange={async e=>{const f=e.target.files?.[0];if(!f)return;setPostImgUp(true);const r=await uploadImage(f,user.id,"orga");if(r.error)alert("⚠️ "+r.error);else setPostImg(r.url);setPostImgUp(false)}}/>
                      {postImg && <button onClick={()=>setPostImg("")} style={{background:"#f0f0f0",color:"#888",border:"none",borderRadius:10,padding:"9px 10px",fontSize:12,cursor:"pointer"}}>✕</button>}
                      <button onClick={publish} disabled={posting||!postText.trim()} style={{background:RED,color:WHITE,fontWeight:700,fontSize:13,padding:"9px 18px",borderRadius:10,border:"none",cursor:"pointer",opacity:posting||!postText.trim()?0.5:1,whiteSpace:"nowrap"}}>{posting?"...":"📣 Publier"}</button>
                    </div>
                  </div>
                )}
                {isOwner && !canPost && (
                  <div style={{background:"#faf6ec",border:"1.5px solid #e6d9a8",borderRadius:12,padding:"12px 14px",marginBottom:10,fontSize:13,color:"#7a5c00",lineHeight:1.5}}>
                    ⭐ Publiez vos actus directement sur votre fiche avec le <b>forfait Organisateur</b>. Contactez-nous via la Communauté pour l'activer.
                  </div>
                )}
                {posts.length===0 && !canPost && !isOwner ? null : posts.length===0 ? (
                  <p style={{fontSize:12,color:"#aaa",margin:0}}>Aucune actu pour le moment.</p>
                ) : (
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {posts.map(p=>(
                      <div key={p.id} style={{background:"#f8f8f8",borderRadius:12,padding:"10px 14px"}}>
                        {featuredLabel(p.featured_until) && <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:7}}><span style={{background:'linear-gradient(135deg,#b8860b,#e6b31e)',color:WHITE,fontSize:9,fontWeight:900,padding:'3px 7px',borderRadius:99,letterSpacing:.3}}>⭐ À LA UNE</span>{(isAdmin || (user && p.user_id===user.id)) && <span style={{fontSize:10.5,fontWeight:700,color:'#9b7200'}}>⏳ visible encore {featuredLabel(p.featured_until)}</span>}</div>}
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                          <span style={{fontSize:12,fontWeight:700,color:col.color}}>{o.name}</span>
                          <span style={{fontSize:11,color:"#aaa"}}>{ago(p.created_at)}</span>
                          {(isAdmin || (user && p.user_id===user.id)) && <div style={{marginLeft:'auto',display:'flex',gap:8}}>{isAdmin && <button onClick={()=>extendFeatured(p)} title="Ajouter 7 jours à la une" style={{background:'none',border:'none',color:'#b8860b',fontSize:11,cursor:'pointer',fontWeight:700}}>⭐ +7j</button>}<button onClick={()=>{setEditingPostId(p.id);setEditingPostText(p.content||'')}} style={{background:"none",border:"none",color:GREEN,fontSize:11,cursor:"pointer",fontWeight:700}}>✏️</button><button onClick={()=>delPost(p.id)} style={{background:"none",border:"none",color:"#c00",fontSize:11,cursor:"pointer",fontWeight:700}}>🗑️</button></div>}
                        </div>
                        {editingPostId===p.id ? <div style={{display:'flex',flexDirection:'column',gap:7}}><textarea value={editingPostText} onChange={e=>setEditingPostText(e.target.value)} rows={3} style={{width:'100%',boxSizing:'border-box',border:'1.5px solid #ddd',borderRadius:10,padding:'8px 10px',fontSize:13,fontFamily:'system-ui,sans-serif',resize:'vertical'}}/><div style={{display:'flex',gap:7}}><button onClick={()=>savePostEdit(p.id)} disabled={savingPostEdit||!editingPostText.trim()} style={{background:GREEN,color:WHITE,border:'none',borderRadius:99,padding:'6px 12px',fontWeight:700,fontSize:11,cursor:'pointer'}}>{savingPostEdit?'...':'✓ Enregistrer'}</button><button onClick={()=>setEditingPostId(null)} style={{background:'#eee',color:'#666',border:'none',borderRadius:99,padding:'6px 12px',fontWeight:700,fontSize:11,cursor:'pointer'}}>Annuler</button></div></div> : <p style={{fontSize:13.5,color:"#222",margin:0,lineHeight:1.5,whiteSpace:"pre-wrap"}}>{p.content}</p>}
                        {p.image_url && <img src={p.image_url} alt="" style={{width:"100%",borderRadius:10,marginTop:8,maxHeight:260,objectFit:"cover"}}/>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {theirEvents.length>0 && (
              <div style={{marginBottom:16}}>
                <p style={{fontWeight:700,fontSize:13,color:"#444",margin:"0 0 8px"}}>🎪 Leurs événements sur le site</p>
                <div style={{display:"flex",flexDirection:"column",gap:isRnsPartner?10:6}}>
                  {theirEvents.map(e=>(
                    isRnsPartner ? (
                      <button key={e.id} onClick={()=>{onClose();onOpenEvent(e)}} style={{display:"grid",gridTemplateColumns:"88px 1fr",gap:12,alignItems:"stretch",textAlign:"left",background:"#f8f8f8",border:"1px solid #ededed",borderRadius:14,padding:0,overflow:"hidden",cursor:"pointer"}}>
                        <div style={{height:96,background:"#eef5f0",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
                          {e.image?<img src={e.image} alt={`Affiche officielle de ${e.title}`} style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"top"}}/>:<img src="/images/rns-cen-logo.jpg" alt="Logo RNS CEN" style={{width:"72%",height:"72%",objectFit:"contain"}}/>}
                        </div>
                        <span style={{padding:"11px 12px 11px 0",alignSelf:"center"}}>
                          <span style={{display:"block",fontSize:13.5,fontWeight:800,color:"#111",lineHeight:1.35}}>{e.title}</span>
                          <span style={{display:"block",fontSize:12,color:"#777",marginTop:4}}>{fmtShort(e.date)} · {e.city}{isPast(e.date)?" · passé":""}</span>
                          {!e.image && <span style={{display:"block",fontSize:10.5,color:"#9a6a00",fontWeight:700,marginTop:5}}>Affiche officielle à venir</span>}
                          <span style={{display:"block",fontSize:11,color:RED,fontWeight:800,marginTop:6}}>Voir la fiche complète →</span>
                        </span>
                      </button>
                    ) : (
                      <button key={e.id} onClick={()=>{onClose();onOpenEvent(e)}} style={{textAlign:"left",background:"#f8f8f8",border:"none",borderRadius:10,padding:"9px 12px",cursor:"pointer"}}>
                        <span style={{fontSize:13,fontWeight:700,color:"#111"}}>{e.title}</span>
                        <span style={{fontSize:12,color:"#888"}}> — {fmtShort(e.date)} · {e.city}{isPast(e.date)?" (passé)":""}</span>
                      </button>
                    )
                  ))}
                </div>
              </div>
            )}
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {o.fb && <a href={safeUrl(o.fb)} target="_blank" rel="noreferrer" style={{flex:1,minWidth:110,textAlign:"center",background:"#1565c0",color:WHITE,fontSize:13,fontWeight:700,padding:"11px 14px",borderRadius:12,textDecoration:"none"}}>📘 Facebook</a>}
              {o.insta && <a href={safeUrl(o.insta)} target="_blank" rel="noreferrer" style={{flex:1,minWidth:110,textAlign:"center",background:"#c2185b",color:WHITE,fontSize:13,fontWeight:700,padding:"11px 14px",borderRadius:12,textDecoration:"none"}}>📸 Instagram</a>}
              {o.site && <a href={safeUrl(o.site)} target="_blank" rel="noreferrer" style={{flex:1,minWidth:110,textAlign:"center",background:GREEN,color:WHITE,fontSize:13,fontWeight:700,padding:"11px 14px",borderRadius:12,textDecoration:"none"}}>🌐 Site web</a>}
            </div>
            {!o.owner_id && (
              <p style={{fontSize:12,color:"#aaa",margin:"16px 0 0",textAlign:"center"}}>C'est votre organisation ? Contactez-nous via la Communauté pour gérer cette fiche.</p>
            )}
          </>) : (<>
            <h2 style={{fontWeight:800,fontSize:18,color:"#111",margin:"0 0 14px"}}>✏️ Modifier la fiche</h2>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Nom *" style={inp}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <select value={form.type||"Association"} onChange={e=>setForm({...form,type:e.target.value})} style={inp}>
                  {Object.keys(ORGA_COLORS).map(t=><option key={t} value={t}>{t}</option>)}
                </select>
                <input value={form.city||""} onChange={e=>setForm({...form,city:e.target.value})} placeholder="Ville" style={inp}/>
                <input value={form.region||""} onChange={e=>setForm({...form,region:e.target.value})} placeholder="Région" style={inp}/>
                <input value={form.followers||""} onChange={e=>setForm({...form,followers:e.target.value})} placeholder="Abonnés (ex: 5 000)" style={inp}/>
              </div>
              <div style={{background:'#fafafa',border:'1px solid #eee',borderRadius:12,padding:12}}>
                <p style={{fontSize:12,fontWeight:800,color:'#666',margin:'0 0 9px'}}>🎨 Identité de votre organisation</p>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                  <div style={{width:44,height:44,borderRadius:'50%',background:form.logo_url?WHITE:(safeHexColor(form.brand_color)||col.color),overflow:'hidden',display:'grid',placeItems:'center',color:WHITE,fontWeight:900,flexShrink:0}}>{form.logo_url?<img src={form.logo_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:initials}</div>
                  <label htmlFor={`orga-logo-${o.id}`} style={{background:WHITE,border:'1.5px solid #ddd',borderRadius:10,padding:'8px 11px',fontSize:12,fontWeight:700,color:'#555',cursor:'pointer'}}>{postImgUp?'⏳ Envoi...':'📷 Ajouter / changer le logo'}</label>
                  <input id={`orga-logo-${o.id}`} type="file" accept="image/*" style={{display:'none'}} onChange={async e=>{const f=e.target.files?.[0];if(!f)return;setPostImgUp(true);const r=await imageFileToCompactDataUrl(f);if(r.error)alert('⚠️ '+r.error);else setForm({...form,logo_url:r.url});setPostImgUp(false)}}/>
                  {form.logo_url&&<button onClick={()=>setForm({...form,logo_url:''})} style={{background:'none',border:'none',color:RED,fontWeight:700,fontSize:12,cursor:'pointer'}}>Retirer</button>}
                </div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{['#111827','#5B21B6','#7E3F8F','#0C4A6E','#0F766E','#A84A1C','#6D2032','#4B5563'].map(c=><button type="button" key={c} title={c} onClick={()=>setForm({...form,brand_color:c})} style={{width:27,height:27,borderRadius:'50%',background:c,border:safeHexColor(form.brand_color)===c?'3px solid #111':'3px solid #fff',boxShadow:'0 0 0 1px #ddd',cursor:'pointer'}}/>)}</div>
              </div>
              <textarea value={form.note||""} onChange={e=>setForm({...form,note:e.target.value})} placeholder="Présentation" rows={3} style={{...inp,resize:"vertical",fontFamily:"system-ui,sans-serif"}}/>
              <input value={form.contact||""} onChange={e=>setForm({...form,contact:e.target.value})} placeholder="Contact public (tél, email)" style={inp}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <input value={form.fb||""} onChange={e=>setForm({...form,fb:e.target.value})} placeholder="Lien Facebook" style={inp}/>
                <input value={form.insta||""} onChange={e=>setForm({...form,insta:e.target.value})} placeholder="Lien Instagram" style={inp}/>
              </div>
              <input value={form.site||""} onChange={e=>setForm({...form,site:e.target.value})} placeholder="Site web" style={inp}/>
              <div style={{display:"flex",gap:8}}>
                <button onClick={save} disabled={saving} style={{background:GREEN,color:WHITE,fontWeight:700,fontSize:13,padding:"10px 20px",borderRadius:10,border:"none",cursor:"pointer"}}>{saving?"...":"✓ Sauvegarder"}</button>
                <button onClick={()=>setEditing(false)} style={{background:"#f0f0f0",color:"#555",fontWeight:700,fontSize:13,padding:"10px 16px",borderRadius:10,border:"none",cursor:"pointer"}}>Annuler</button>
              </div>
            </div>
          </>)}
        </div>
      </div>
    </div>
  )
}

const CAT_STYLE = {
  eglise:   {emoji:"⛪", label:"Église",    color:"#185FA5", bg:"#eef4fc", grad:"linear-gradient(135deg,#185FA5,#0C447C)"},
  boutique: {emoji:"🛍️", label:"Boutique",  color:"#993556", bg:"#fbeaf0", grad:"linear-gradient(135deg,#993556,#72243E)"},
  artisanat:{emoji:"🧵", label:"Artisanat", color:"#3B6D11", bg:"#eaf3de", grad:"linear-gradient(135deg,#3B6D11,#27500A)"},
}
const LIEUX_PAGES = {
  eglise:   {emoji:"⛪", title:"Églises malagasy",             sub:"Paroisses et communautés chrétiennes malagasy en France", filterBy:"denom"},
  shopping: {emoji:"🛍️", title:"Boutiques & artisanat malagasy", sub:"Produits, épiceries et artisanat de Madagascar en France", filterBy:"category", cats:["boutique","artisanat"]},
}
function LieuxPage({ isMobile, page, lieux, initialSearch="" }) {
  const meta = LIEUX_PAGES[page]||LIEUX_PAGES.eglise
  const cats = meta.cats||[page]
  const items = lieux.filter(l=>cats.includes(l.category))
  const [q,setQ] = useState(initialSearch)
  const [filter,setFilter] = useState("Tous")
  const [zone,setZone] = useState("Toutes")
  const [selected,setSelected] = useState(null)
  const mapRef = useRef(null)
  const mapInstance = useRef(null)

  // Carte des lieux géolocalisés (comme la page Gastronomie)
  const located = items.filter(l=>l.lat&&l.lng)
  useEffect(()=>{
    if (!window.L || !mapRef.current) return
    const map = window.L.map(mapRef.current, {scrollWheelZoom:false}).setView([46.6,2.4],5)
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap"}).addTo(map)
    located.forEach(l=>{
      const s = CAT_STYLE[l.category]||CAT_STYLE.eglise
      window.L.marker([l.lat,l.lng]).addTo(map).bindPopup(`<b>${s.emoji} ${l.name}</b><br/>${l.denom||s.label}${l.city?" · "+l.city:""}`)
    })
    mapInstance.current = map
    return ()=>{ map.remove(); mapInstance.current = null }
  },[page, items.length])

  // Filtres de zone (région) + « En ligne » pour les boutiques web
  const isOnline = l => /en ligne/i.test(l.city||"")
  const zones = ["Toutes",...[...new Set(items.map(l=>l.region).filter(Boolean))].sort(),...(items.some(isOnline)?["🌐 En ligne"]:[])]
  const matchZone = l => zone==="Toutes" || (zone==="🌐 En ligne" ? isOnline(l) : l.region===zone)

  // Filtres propres, sans doublon : par catégorie (Boutiques/Artisanat) ou par obédience (églises)
  const chips = meta.filterBy==="category"
    ? ["Tous",...cats.filter(c=>items.some(l=>l.category===c))]
    : ["Tous",...[...new Set(items.map(l=>l.denom).filter(Boolean))].sort()]
  const chipLabel = c => c==="Tous" ? "Tous" : (CAT_STYLE[c] ? `${CAT_STYLE[c].emoji} ${CAT_STYLE[c].label}s` : c)
  const matchFilter = l => filter==="Tous" || (meta.filterBy==="category" ? l.category===filter : l.denom===filter)

  const nq = q.trim().toLowerCase()
  const list = items.filter(l=>{
    const qOk = !nq || [l.name,l.city,l.address,l.note,l.denom].some(v=>(v||"").toLowerCase().includes(nq))
    return matchFilter(l) && matchZone(l) && qOk
  }).sort((a,b)=>(b.featured?1:0)-(a.featured?1:0))
  const st = l => CAT_STYLE[l.category]||CAT_STYLE.eglise

  return (
    <div style={{maxWidth:900,margin:"0 auto",padding:isMobile?"20px 16px 60px":"32px 24px 80px"}}>
      <h2 style={{fontWeight:800,fontSize:isMobile?22:28,color:"#111",margin:"0 0 4px"}}>{meta.emoji} {meta.title}</h2>
      <p style={{color:"#666",fontSize:14,margin:"0 0 16px"}}>{meta.sub} — {items.length} référencé{items.length>1?"s":""}</p>

      {items.length===0 ? (
        <div style={{textAlign:"center",padding:"48px 24px",background:WHITE,borderRadius:20,color:"#999"}}>
          <p style={{fontSize:32,margin:"0 0 8px"}}>{meta.emoji}</p>
          <p style={{fontWeight:700,margin:0}}>Bientôt disponible</p>
          <p style={{fontSize:13,margin:"4px 0 0"}}>Cet annuaire se remplit petit à petit.</p>
        </div>
      ) : (<>
        {/* Carte */}
        <div style={{position:"relative",zIndex:0,isolation:"isolate",borderRadius:20,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.08)",marginBottom:14}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:4,display:"flex",zIndex:500}}>
            <div style={{flex:1,background:WHITE}}/><div style={{flex:1,background:RED}}/><div style={{flex:1,background:GREEN}}/>
          </div>
          <div ref={mapRef} style={{height:isMobile?240:320,width:"100%",background:"#e8eef2"}}/>
          {located.length===0 && (
            <div style={{position:"absolute",inset:0,zIndex:400,background:"rgba(255,255,255,0.75)",display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",padding:20}}>
              <p style={{fontWeight:700,color:"#555",fontSize:14,margin:0}}>📍 La carte s'activera dès que les adresses seront renseignées.</p>
            </div>
          )}
        </div>
        <div style={{position:"relative",marginBottom:14}}>
          <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:15,color:"#aaa"}}>🔍</span>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Rechercher par nom ou ville..." style={{width:"100%",border:"1.5px solid #e5e5e5",borderRadius:14,padding:"11px 14px 11px 40px",fontSize:14,outline:"none",boxSizing:"border-box",background:WHITE}}/>
        </div>
        {chips.length>2 && (
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
            {chips.map(c=>(
              <button key={c} onClick={()=>setFilter(c)} style={{background:filter===c?RED:WHITE,color:filter===c?WHITE:"#444",fontWeight:700,fontSize:13,padding:"8px 16px",borderRadius:99,border:filter===c?"none":"1px solid #e0e0e0",cursor:"pointer"}}>{chipLabel(c)}</button>
            ))}
          </div>
        )}
        {zones.length>2 && (
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:18,alignItems:"center"}}>
            <span style={{fontSize:12,color:"#999",fontWeight:700}}>📍 Zone :</span>
            {zones.map(z=>(
              <button key={z} onClick={()=>setZone(z)} style={{background:zone===z?"#333":WHITE,color:zone===z?WHITE:"#555",fontWeight:700,fontSize:12,padding:"6px 12px",borderRadius:99,border:zone===z?"none":"1px solid #e0e0e0",cursor:"pointer"}}>{z}</button>
            ))}
          </div>
        )}
        {list.length===0 && <p style={{color:"#bbb",fontSize:13,textAlign:"center",padding:"30px 0"}}>Aucun résultat pour « {q} »</p>}
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill, minmax(280px, 1fr))",gap:16}}>
          {list.map(l=>{
            const s = st(l)
            const online = /en ligne/i.test(l.city||"")
            return (
              <div key={l.id} onClick={()=>setSelected(l)} style={{background:WHITE,borderRadius:18,boxShadow:l.featured?"0 4px 18px rgba(184,134,11,0.3)":"0 3px 14px rgba(0,0,0,0.07)",border:l.featured?"1.5px solid #e6b31e":"1px solid #f0f0f0",overflow:"hidden",cursor:"pointer",transition:"transform .15s",display:"flex",flexDirection:"column"}}>
                {/* Bandeau coloré par catégorie */}
                <div style={{height:70,background:s.grad,position:"relative",display:"flex",alignItems:"center",padding:"0 16px"}}>
                  <div style={{width:46,height:46,borderRadius:14,background:"rgba(255,255,255,0.92)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{s.emoji}</div>
                  {l.featured && <span style={{position:"absolute",top:8,right:8,background:"rgba(255,255,255,0.95)",color:"#b8860b",fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:99}}>⭐ À LA UNE</span>}
                  {online && <span style={{position:"absolute",bottom:8,right:8,background:"rgba(0,0,0,0.25)",color:WHITE,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99}}>🌐 en ligne</span>}
                </div>
                <div style={{padding:"12px 16px 14px",display:"flex",flexDirection:"column",gap:8,flex:1}}>
                  <p style={{fontWeight:800,fontSize:15.5,color:"#111",margin:0,lineHeight:1.25}}>{l.name}</p>
                  <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                    {l.denom && <span style={{background:s.bg,color:s.color,fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:99}}>{l.denom}</span>}
                    {l.city && <span style={{fontSize:12,color:"#888",fontWeight:600}}>📍 {l.city}</span>}
                  </div>
                  {l.note && <p style={{fontSize:12.5,color:"#777",margin:0,lineHeight:1.5,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{l.note}</p>}
                  <div style={{display:"flex",alignItems:"center",gap:10,marginTop:"auto",paddingTop:4}}>
                    {l.followers && <span style={{fontSize:12,color:"#999",fontWeight:600}}>👥 {l.followers}</span>}
                    <span style={{marginLeft:"auto",fontSize:12,fontWeight:800,color:s.color}}>Voir →</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </>)}

      {selected && (() => { const s = st(selected); return (
        <div onClick={e=>e.target===e.currentTarget&&setSelected(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"flex-start",justifyContent:"center",zIndex:80,overflowY:"auto",padding:16}}>
          <div style={{background:WHITE,borderRadius:24,width:"100%",maxWidth:520,margin:"auto",boxShadow:"0 24px 80px rgba(0,0,0,0.3)",overflow:"hidden"}}>
            <div style={{position:"relative",height:isMobile?130:150,background:s.grad,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8}}>
              {(() => { const aff = safeUrl(selected.image||selected.photo||selected.affiche||""); return aff && <img src={aff} alt={selected.name} onError={e=>{e.currentTarget.style.display="none"}} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}/> })()}
              <button onClick={()=>setSelected(null)} style={{position:"absolute",top:14,right:14,background:"rgba(0,0,0,0.4)",color:WHITE,fontWeight:800,fontSize:20,width:36,height:36,borderRadius:"50%",border:"none",cursor:"pointer",zIndex:2}}>×</button>
              {!(selected.image||selected.photo||selected.affiche) && <div style={{width:64,height:64,borderRadius:18,background:"rgba(255,255,255,0.95)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32}}>{s.emoji}</div>}
              {!(selected.image||selected.photo||selected.affiche) && <span style={{color:"rgba(255,255,255,0.9)",fontWeight:800,fontSize:11,letterSpacing:2,textTransform:"uppercase"}}>{s.emoji} {s.label} malagasy</span>}
            </div>
            <div style={{padding:isMobile?"18px 20px 24px":"22px 28px 30px"}}>
              <h2 style={{fontWeight:800,fontSize:20,color:"#111",margin:"0 0 8px"}}>{selected.name}</h2>
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:14}}>
                {selected.denom && <span style={{background:s.bg,color:s.color,fontSize:12,fontWeight:700,padding:"4px 12px",borderRadius:99}}>{selected.denom}</span>}
                {selected.city && <span style={{fontSize:13,color:"#666",fontWeight:600}}>📍 {selected.city}</span>}
                {selected.followers && <span style={{fontSize:13,color:"#999"}}>👥 {selected.followers}</span>}
              </div>
              {selected.address && <div style={{display:"flex",alignItems:"center",gap:10,background:"#f7f7f7",borderRadius:12,padding:"10px 14px",fontSize:13,color:"#333",fontWeight:600,marginBottom:12}}>📍 {selected.address}</div>}
              {selected.note && <p style={{fontSize:14,color:"#555",lineHeight:1.6,margin:"0 0 16px"}}>{selected.note}</p>}
              {selected.contact && <div style={{display:"flex",alignItems:"center",gap:10,background:"#f7f7f7",borderRadius:12,padding:"10px 14px",fontSize:13,color:"#333",fontWeight:600,marginBottom:12}}>📞 {selected.contact}</div>}
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {selected.fb && <a href={safeUrl(selected.fb)} target="_blank" rel="noreferrer" style={{flex:1,minWidth:110,textAlign:"center",background:"#1565c0",color:WHITE,fontSize:13,fontWeight:700,padding:"11px 14px",borderRadius:12,textDecoration:"none"}}>📘 Facebook</a>}
                {selected.insta && <a href={safeUrl(selected.insta)} target="_blank" rel="noreferrer" style={{flex:1,minWidth:110,textAlign:"center",background:"#c2185b",color:WHITE,fontSize:13,fontWeight:700,padding:"11px 14px",borderRadius:12,textDecoration:"none"}}>📸 Instagram</a>}
                {selected.site && <a href={safeUrl(selected.site)} target="_blank" rel="noreferrer" style={{flex:1,minWidth:110,textAlign:"center",background:GREEN,color:WHITE,fontSize:13,fontWeight:700,padding:"11px 14px",borderRadius:12,textDecoration:"none"}}>🌐 Site web</a>}
              </div>
              <p style={{fontSize:12,color:"#aaa",margin:"16px 0 0",textAlign:"center"}}>C'est votre {selected.category==="eglise"?"paroisse":"structure"} ? Contactez-nous pour compléter cette fiche.</p>
            </div>
          </div>
        </div>
      )})()}
    </div>
  )
}

function OrgaPage({ isMobile, orgas, events, user, userProfile, isAdmin, onOpenEvent, onOrgaUpdated, gastro = [], lieux = [], onGoto, onAuthRequired, sportOnly = false, initialSearch="" }) {
  const [famille,setFamille] = useState("evenementiel")
  const isIncompletePlaceholder = o => /fiche à compléter/i.test(o.note||"") && ![o.city,o.region,o.site,o.fb,o.insta,o.contact].some(Boolean)
  const publicOrgas = isAdmin ? orgas : orgas.filter(o=>!isIncompletePlaceholder(o))
  const boutiquesArt = lieux.filter(l=>l.category==="boutique"||l.category==="artisanat")
  const eglises = lieux.filter(l=>l.category==="eglise")
  const FAMILLES = [
    ["evenementiel","🎪 Événementiel", publicOrgas.length],
    ["gastro","🍽️ Gastronomie", gastro.length],
    ["boutiques","🛍️ Boutiques & artisanat", boutiquesArt.length],
    ["eglises","⛪ Églises", eglises.length],
  ]
  const totalPros = publicOrgas.length + gastro.length + lieux.length
  const [filter,setFilter] = useState(sportOnly ? "Association sportive" : "Tous")
  const [q,setQ] = useState(initialSearch)
  const [selected,setSelected] = useState(null)
  const types = ["Tous",...Object.keys(ORGA_COLORS)]
  const nq = q.trim().toLowerCase()
  const base = publicOrgas.filter(o=>{
    const typeOk = (sportOnly ? o.type==="Association sportive" : true) && (filter==="Tous" || o.type===filter)
    const qOk = !nq || [o.name,o.city,o.region,o.note].some(v=>(v||"").toLowerCase().includes(nq))
    return typeOk && qOk
  })
  // Épinglés puis fiches Pro en tête de l'annuaire
  const today = new Date().toISOString().slice(0,10)
  const isProOrga = o => o.plan==='pro' && (!o.plan_until||o.plan_until>=today)
  const rank = o => (o.featured?2:0)+(isProOrga(o)?1:0)
  const list = [...base].sort((a,b)=>rank(b)-rank(a))
  const sportEvents = events
    .filter(e=>e.category==="Sport"&&!isPast(e.date))
    .sort((a,b)=>String(a.date).localeCompare(String(b.date)))
  const initials = nm => nm.split(" ").filter(Boolean).map(w=>w[0]).slice(0,2).join("").toUpperCase()

  return (
    <div style={{maxWidth:900,margin:"0 auto",padding:isMobile?"20px 16px 60px":"32px 24px 80px"}}>
      <h2 style={{fontWeight:800,fontSize:isMobile?22:28,color:"#111",margin:"0 0 4px"}}>{sportOnly?"🏆 Sportifs malagasy":"💼 Professionnels & associations"}</h2>
      <p style={{color:"#666",fontSize:14,margin:"0 0 16px"}}>{sportOnly?<>Clubs, associations sportives et organisateurs de tournois de la communauté malagasy — <b>{list.length} structures recensées</b>.</>:<>La base des professionnels de la communauté malagasy en France — <b>{totalPros} structures recensées</b>. Ta structure manque ? Crée ton compte et réclame ta fiche !</>}</p>
      {sportOnly && (
        <section style={{background:WHITE,border:"1px solid #e8eef7",borderRadius:18,padding:isMobile?14:18,marginBottom:20,boxShadow:"0 4px 16px rgba(24,83,145,.07)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:sportEvents.length?12:0}}>
            <div>
              <p style={{color:"#185FA5",fontWeight:900,fontSize:11,letterSpacing:1,textTransform:"uppercase",margin:"0 0 3px"}}>Agenda sportif</p>
              <h3 style={{fontSize:isMobile?17:19,color:"#17243a",margin:0}}>🏆 Prochains événements sportifs</h3>
            </div>
            <span style={{background:"#eef4fc",color:"#185FA5",fontWeight:900,fontSize:12,padding:"5px 9px",borderRadius:99}}>{sportEvents.length}</span>
          </div>
          {sportEvents.length===0
            ? <p style={{color:"#888",fontSize:13,margin:"10px 0 0"}}>Aucun événement sportif à venir pour le moment.</p>
            : <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(2,minmax(0,1fr))",gap:9}}>
                {sportEvents.map(event=><button key={event.id} onClick={()=>onOpenEvent(event)} style={{display:"flex",alignItems:"center",gap:10,textAlign:"left",background:"#f7f9fc",border:"1px solid #e5ebf3",borderRadius:13,padding:"10px 12px",cursor:"pointer"}}>
                  <span style={{fontSize:22}}>🏆</span>
                  <span style={{minWidth:0,flex:1}}>
                    <strong style={{display:"block",fontSize:13,color:"#17243a",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{event.title}</strong>
                    <span style={{display:"block",fontSize:11.5,color:"#77808e",marginTop:2}}>📅 {fmtShort(event.date)}{event.city?` · 📍 ${event.city}`:""}</span>
                  </span>
                  <span style={{color:"#185FA5",fontWeight:900}}>›</span>
                </button>)}
              </div>}
        </section>
      )}
      {!sportOnly && <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:18,background:WHITE,borderRadius:16,padding:8,boxShadow:"0 2px 10px rgba(0,0,0,0.06)"}}>
        {FAMILLES.map(([k,l,c])=>(
          <button key={k} onClick={()=>setFamille(k)} style={{flex:isMobile?"1 1 45%":1,background:famille===k?RED:"transparent",color:famille===k?WHITE:"#555",fontWeight:700,fontSize:12.5,padding:"10px 8px",borderRadius:12,border:"none",cursor:"pointer"}}>
            {l} <span style={{opacity:.7}}>· {c}</span>
          </button>
        ))}
      </div>}

      {!sportOnly && famille!=="evenementiel" && (()=>{
        const fam = famille==="gastro"
          ? {items:gastro, page:"gastro", label:"Gastronomie", emoji:g=>GASTRO_EMOJI[g.type]||"🍽️", grad:g=>GASTRO_GRAD[g.type]||"linear-gradient(135deg,#C8102E,#7a0a1c)", sub:g=>g.type+(g.city?" · "+g.city:"")}
          : famille==="boutiques"
          ? {items:boutiquesArt, page:"boutiques", label:"Boutiques & artisanat", emoji:l=>l.category==="artisanat"?"🧵":"🛍️", grad:l=>l.category==="artisanat"?"linear-gradient(135deg,#007A3D,#044d27)":"linear-gradient(135deg,#7a0a1c,#4a0611)", sub:l=>(l.denom||l.category)+(l.city?" · "+l.city:"")}
          : {items:eglises, page:"eglises", label:"Églises", emoji:()=>"⛪", grad:()=>"linear-gradient(135deg,#1565c0,#0C447C)", sub:l=>(l.denom||"")+(l.city?" · "+l.city:"")}
        const famItems = fam.items.filter(it=>!nq || [it.name,it.city,it.region,it.note,it.type,it.denom,it.category].some(v=>(v||"").toLowerCase().includes(nq)))
        return (
          <div>
            <div style={{position:"relative",marginBottom:14}}>
              <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:15,color:"#aaa"}}>🔍</span>
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder={`Rechercher dans ${fam.label.toLowerCase()}...`} style={{width:"100%",border:"1.5px solid #e5e5e5",borderRadius:14,padding:"11px 14px 11px 40px",fontSize:14,outline:"none",boxSizing:"border-box",background:WHITE}}/>
            </div>
            {famItems.length===0 && <p style={{color:"#bbb",fontSize:13,textAlign:"center",padding:"24px 0"}}>Aucun résultat pour « {q} »</p>}
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill, minmax(250px, 1fr))",gap:12,marginBottom:16}}>
              {famItems.map(it=>(
                <div key={it.id} onClick={()=>onGoto&&onGoto(fam.page)} style={{background:WHITE,borderRadius:16,boxShadow:"0 3px 12px rgba(0,0,0,0.06)",border:"1px solid #f0f0f0",overflow:"hidden",cursor:"pointer",display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:58,alignSelf:"stretch",background:fam.grad(it),display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{fam.emoji(it)}</div>
                  <div style={{minWidth:0,padding:"12px 12px 12px 0",flex:1}}>
                    <p style={{fontWeight:800,fontSize:14,color:"#111",margin:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{it.name}</p>
                    <p style={{fontSize:11.5,color:"#999",margin:0}}>{fam.sub(it)}</p>
                  </div>
                  <span style={{fontSize:16,color:"#ccc",paddingRight:12}}>›</span>
                </div>
              ))}
            </div>
            <button onClick={()=>onGoto&&onGoto(fam.page)} style={{width:"100%",background:"#f5f5f5",color:"#555",fontWeight:700,fontSize:13,padding:"12px 0",borderRadius:14,border:"none",cursor:"pointer"}}>Ouvrir l'annuaire {fam.label} complet →</button>
          </div>
        )
      })()}

      {(sportOnly || famille==="evenementiel") && (<>
      <div style={{position:"relative",marginBottom:14}}>
        <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:15,color:"#aaa"}}>🔍</span>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Rechercher un organisateur, une association, une ville..." style={{width:"100%",border:"1.5px solid #e5e5e5",borderRadius:14,padding:"11px 14px 11px 40px",fontSize:14,outline:"none",boxSizing:"border-box",background:WHITE}}/>
      </div>

      {!sportOnly && <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:18}}>
        {types.map(t=>(
          <button key={t} onClick={()=>setFilter(t)} style={{background:filter===t?RED:WHITE,color:filter===t?WHITE:"#444",fontWeight:700,fontSize:13,padding:"8px 16px",borderRadius:99,border:filter===t?"none":"1px solid #e0e0e0",cursor:"pointer"}}>
            {t==="Tous"?"Tous":`${ORGA_EMOJI[t]||""} ${t}`}
          </button>
        ))}
      </div>}
      {list.length===0 && <p style={{color:"#bbb",fontSize:13,textAlign:"center",padding:"30px 0"}}>Aucun résultat pour « {q} »</p>}

      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill, minmax(270px, 1fr))",gap:14}}>
        {list.map(o=>{
          const col = ORGA_COLORS[o.type]||{bg:"#f5f5f5",color:"#555"}
          const grad = ORGA_GRAD[o.type]||"linear-gradient(135deg,#555,#333)"
          const brandColor = safeHexColor(o.brand_color)
          const cardGrad = brandColor ? `linear-gradient(135deg,${brandColor},#171717)` : grad
          const isPro = o.plan==='pro' && (!o.plan_until || o.plan_until >= new Date().toISOString().slice(0,10))
          const count = events.filter(e=>eventBelongsToOrga(e,o)).length
          return (
            <div key={`${normalizedDirectoryName(o.name)}:${o.id}`} onClick={()=>setSelected(o)} style={{background:WHITE,borderRadius:18,boxShadow:o.featured?"0 4px 18px rgba(184,134,11,0.3)":"0 3px 14px rgba(0,0,0,0.07)",border:o.featured?"1.5px solid #e6b31e":"1px solid #f0f0f0",overflow:"hidden",cursor:"pointer",display:"flex",flexDirection:"column"}}>
              <div style={{height:70,background:cardGrad,position:"relative",display:"flex",alignItems:"center",padding:"0 16px"}}>
                <div style={{width:46,height:46,borderRadius:14,background:"rgba(255,255,255,0.92)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0,overflow:'hidden',color:brandColor||col.color,fontWeight:900}}>{o.logo_url?<img src={o.logo_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:(ORGA_EMOJI[o.type]||"🎪")}</div>
                {o.featured && <span style={{position:"absolute",top:8,right:8,background:"rgba(255,255,255,0.95)",color:"#b8860b",fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:99}}>⭐ À LA UNE</span>}
                {isPro && !o.featured && <span style={{position:"absolute",top:8,right:8,background:"linear-gradient(135deg,#b8860b,#e6b31e)",color:WHITE,fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:99}}>⭐ PRO</span>}
              </div>
              <div style={{padding:"12px 16px 14px",display:"flex",flexDirection:"column",gap:8,flex:1}}>
                <p style={{fontWeight:800,fontSize:15.5,color:"#111",margin:0,lineHeight:1.25}}>{o.name}</p>
                <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                  <span style={{background:col.bg,color:col.color,fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:99}}>{ORGA_EMOJI[o.type]||""} {o.type}</span>
                  {o.city && <span style={{fontSize:12,color:"#888",fontWeight:600}}>📍 {o.city}</span>}
                </div>
                {o.note && <p style={{fontSize:12.5,color:"#777",margin:0,lineHeight:1.5,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{o.note}</p>}
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginTop:"auto",paddingTop:4}}>
                  {o.followers && <span style={{fontSize:12,color:"#999",fontWeight:600}}>👥 {o.followers}</span>}
                  {count>0 && <span style={{fontSize:11,fontWeight:700,background:"#fde8ec",color:RED,padding:"3px 10px",borderRadius:99}}>🎪 {count} évén.{count>1?"s":""}</span>}
                  {o.owner_id && <span style={{fontSize:11,fontWeight:700,background:"#e6f4ed",color:GREEN,padding:"3px 8px",borderRadius:99}}>✓ orga</span>}
                  <span style={{marginLeft:"auto",fontSize:12,fontWeight:800,color:col.color}}>Voir →</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      </>)}

      {selected && <OrgaDetail o={selected} isMobile={isMobile} user={user} userProfile={userProfile} isAdmin={isAdmin} events={events} onOpenEvent={onOpenEvent} onClose={()=>setSelected(null)} onUpdated={u=>{onOrgaUpdated(u);setSelected(u)}} onAuthRequired={onAuthRequired}/>} 
    </div>
  )
}

function GastroDetail({ g, isMobile, onClose }) {
  const col = GASTRO_COLORS[g.type]||{bg:"#f5f5f5",color:"#555"}
  const initials = g.name.split(" ").filter(Boolean).map(w=>w[0]).slice(0,2).join("").toUpperCase()
  const affiche = safeUrl(g.image||g.photo||g.affiche||"")
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"flex-start",justifyContent:"center",zIndex:80,overflowY:"auto",padding:16}}>
      <div style={{background:WHITE,borderRadius:24,width:"100%",maxWidth:560,margin:"auto",boxShadow:"0 24px 80px rgba(0,0,0,0.3)",overflow:"hidden"}}>
        <div style={{position:"relative",height:isMobile?150:190,background:`linear-gradient(135deg, ${RED} 0%, #6e0a16 55%, ${GREEN} 140%)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8}}>
          {affiche && <img src={affiche} alt={g.name} onError={e=>{e.currentTarget.style.display="none"}} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}/>}
          <div style={{position:"absolute",top:0,left:0,right:0,height:4,display:"flex"}}>
            <div style={{flex:1,background:WHITE}}/><div style={{flex:1,background:RED}}/><div style={{flex:1,background:GREEN}}/>
          </div>
          <button onClick={onClose} style={{position:"absolute",top:14,right:14,background:"rgba(0,0,0,0.4)",color:WHITE,fontWeight:800,fontSize:20,width:36,height:36,borderRadius:"50%",border:"none",cursor:"pointer",zIndex:2}}>×</button>
          {!affiche && <div style={{width:64,height:64,borderRadius:"50%",background:WHITE,color:col.color,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:22}}>{initials}</div>}
          {!affiche && <span style={{color:"rgba(255,255,255,0.9)",fontWeight:800,fontSize:11,letterSpacing:2.5,textTransform:"uppercase"}}>🇲🇬 Gastronomie Malagasy</span>}
        </div>
        <div style={{padding:isMobile?"18px 20px 24px":"22px 28px 30px"}}>
          <h2 style={{fontWeight:800,fontSize:22,color:"#111",margin:"0 0 8px"}}>{g.name}</h2>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:14}}>
            <span style={{background:col.bg,color:col.color,fontSize:12,fontWeight:700,padding:"4px 12px",borderRadius:99}}>{GASTRO_EMOJI[g.type]} {g.type}</span>
            {g.city && <span style={{fontSize:13,color:"#666",fontWeight:600}}>📍 {g.city}</span>}
          </div>
          {g.note && <p style={{fontSize:14,color:"#555",lineHeight:1.6,margin:"0 0 16px"}}>{g.note}</p>}
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:18}}>
            {g.address && (
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(g.address)}`} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",gap:10,background:"#f7f7f7",borderRadius:12,padding:"10px 14px",fontSize:13,color:"#333",textDecoration:"none",fontWeight:600}}>
                🗺️ <span>{g.address}</span><span style={{marginLeft:"auto",color:GREEN,fontSize:12,whiteSpace:"nowrap"}}>Itinéraire →</span>
              </a>
            )}
            {g.phone && (
              <a href={`tel:${g.phone.replace(/\s/g,"")}`} style={{display:"flex",alignItems:"center",gap:10,background:"#f7f7f7",borderRadius:12,padding:"10px 14px",fontSize:13,color:"#333",textDecoration:"none",fontWeight:600}}>
                📞 {g.phone}<span style={{marginLeft:"auto",color:GREEN,fontSize:12}}>Appeler →</span>
              </a>
            )}
            {g.contact && (
              <div style={{display:"flex",alignItems:"center",gap:10,background:"#f7f7f7",borderRadius:12,padding:"10px 14px",fontSize:13,color:"#333",fontWeight:600}}>
                👤 {g.contact}
              </div>
            )}
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {g.site && <a href={safeUrl(g.site)} target="_blank" rel="noreferrer" style={{flex:1,minWidth:120,textAlign:"center",background:GREEN,color:WHITE,fontSize:13,fontWeight:700,padding:"11px 16px",borderRadius:12,textDecoration:"none"}}>🌐 Site officiel</a>}
            {g.fb && <a href={safeUrl(g.fb)} target="_blank" rel="noreferrer" style={{flex:1,minWidth:120,textAlign:"center",background:"#1565c0",color:WHITE,fontSize:13,fontWeight:700,padding:"11px 16px",borderRadius:12,textDecoration:"none"}}>📘 Facebook</a>}
            {g.insta && <a href={safeUrl(g.insta)} target="_blank" rel="noreferrer" style={{flex:1,minWidth:120,textAlign:"center",background:"#c2185b",color:WHITE,fontSize:13,fontWeight:700,padding:"11px 16px",borderRadius:12,textDecoration:"none"}}>📸 Instagram</a>}
            {g.tiktok && <a href={safeUrl(g.tiktok)} target="_blank" rel="noreferrer" style={{flex:1,minWidth:120,textAlign:"center",background:"#111",color:WHITE,fontSize:13,fontWeight:700,padding:"11px 16px",borderRadius:12,textDecoration:"none"}}>🎵 TikTok</a>}
          </div>
        </div>
      </div>
    </div>
  )
}

function GastroPage({ isMobile, gastro = initialGastro, initialSearch="" }) {
  const [filter,setFilter] = useState("Tous")
  const [regionFilter,setRegionFilter] = useState("Toutes")
  const [q,setQ] = useState(initialSearch)
  const [selected,setSelected] = useState(null)
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const types = ["Tous","Restaurant","Traiteur","Food truck"]
  const regions = ["Toutes",...[...new Set(gastro.map(g=>g.region).filter(Boolean))].sort()]
  const nq = q.trim().toLowerCase()
  const list = gastro.filter(g=>{
    const typeOk   = filter==="Tous" || g.type===filter
    const regionOk = regionFilter==="Toutes" || g.region===regionFilter
    const qOk = !nq || [g.name,g.city,g.region,g.type,g.note,g.address].some(v=>(v||"").toLowerCase().includes(nq))
    return typeOk && regionOk && qOk
  }).sort((a,b)=>(b.featured?1:0)-(a.featured?1:0)) // épinglés en tête
  const located = gastro.filter(g=>g.lat&&g.lng)

  useEffect(()=>{
    if (!window.L || !mapRef.current || mapInstance.current) return
    const map = window.L.map(mapRef.current, {scrollWheelZoom:false}).setView([46.6,2.4],5)
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap"}).addTo(map)
    located.forEach(g=>{
      window.L.marker([g.lat,g.lng]).addTo(map).bindPopup(`<b>${GASTRO_EMOJI[g.type]||"🍽️"} ${g.name}</b><br/>${g.type}${g.city?" · "+g.city:""}`)
    })
    mapInstance.current = map
    return ()=>{ map.remove(); mapInstance.current = null }
  },[])

  const initials = n => n.split(" ").filter(Boolean).map(w=>w[0]).slice(0,2).join("").toUpperCase()

  return (
    <div style={{maxWidth:900,margin:"0 auto",padding:isMobile?"20px 16px 60px":"32px 24px 80px"}}>
      <h2 style={{fontWeight:800,fontSize:isMobile?22:28,color:"#111",margin:"0 0 4px"}}>🍽️ Gastronomie malagasy</h2>
      <p style={{color:"#666",fontSize:14,margin:"0 0 8px"}}>Restaurants, traiteurs et food trucks au lien malagasy vérifié — {gastro.length} fiches</p>
      <p style={{color:"#999",fontSize:12,lineHeight:1.5,margin:"0 0 20px"}}>Une fiche est affichée seulement si l'activité, l'offre culinaire ou la personne qui la porte revendique explicitement un lien avec Madagascar.</p>

      {/* Carte */}
      <div style={{position:"relative",zIndex:0,isolation:"isolate",borderRadius:20,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.08)",marginBottom:8}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:4,display:"flex",zIndex:500}}>
          <div style={{flex:1,background:WHITE}}/><div style={{flex:1,background:RED}}/><div style={{flex:1,background:GREEN}}/>
        </div>
        <div ref={mapRef} style={{height:isMobile?260:340,width:"100%",background:"#e8eef2"}}/>
        {located.length===0 && (
          <div style={{position:"absolute",inset:0,zIndex:400,background:"rgba(255,255,255,0.75)",display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",padding:20}}>
            <p style={{fontWeight:700,color:"#555",fontSize:14,margin:0}}>📍 La carte s'activera dès que les adresses seront renseignées.<br/><span style={{fontWeight:400,fontSize:13,color:"#888"}}>Envoie-nous l'adresse de ton resto ou traiteur préféré !</span></p>
          </div>
        )}
      </div>
      <p style={{fontSize:12,color:"#999",margin:"0 0 20px"}}>{located.length>0?`${located.length} adresse${located.length>1?"s":""} sur la carte`:""}</p>

      {/* Recherche textuelle */}
      <div style={{position:"relative",marginBottom:16}}>
        <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:15,color:"#aaa"}}>🔍</span>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Rechercher un restaurant, un traiteur, une ville..." style={{width:"100%",border:"1.5px solid #e5e5e5",borderRadius:14,padding:"11px 14px 11px 40px",fontSize:14,outline:"none",boxSizing:"border-box",background:WHITE}}/>
      </div>

      {/* Filtres */}
      <p style={{fontSize:11,fontWeight:700,color:"#999",letterSpacing:1,textTransform:"uppercase",margin:"0 0 6px"}}>Type</p>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
        {types.map(t=>(
          <button key={t} onClick={()=>setFilter(t)} style={{background:filter===t?RED:WHITE,color:filter===t?WHITE:"#444",fontWeight:700,fontSize:13,padding:"8px 16px",borderRadius:99,border:filter===t?"none":"1px solid #e0e0e0",cursor:"pointer"}}>
            {t==="Tous"?"Tous":`${GASTRO_EMOJI[t]} ${t}${t==="Food truck"?"s":"s"}`}
          </button>
        ))}
      </div>
      <p style={{fontSize:11,fontWeight:700,color:"#999",letterSpacing:1,textTransform:"uppercase",margin:"0 0 6px"}}>Région</p>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:18}}>
        {regions.map(r=>(
          <button key={r} onClick={()=>setRegionFilter(r)} style={{background:regionFilter===r?GREEN:WHITE,color:regionFilter===r?WHITE:"#444",fontWeight:700,fontSize:13,padding:"8px 16px",borderRadius:99,border:regionFilter===r?"none":"1px solid #e0e0e0",cursor:"pointer"}}>
            {r==="Toutes"?"Toutes":`📍 ${r}`}
          </button>
        ))}
      </div>
      {list.length===0 && (
        <div style={{textAlign:"center",padding:"32px 24px",background:WHITE,borderRadius:16,color:"#bbb",marginBottom:14}}>
          <p style={{fontWeight:700,margin:0}}>{q?`Aucun résultat pour « ${q} »`:"Aucune adresse pour ces filtres"}</p>
        </div>
      )}

      {/* Cartes */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill, minmax(260px, 1fr))",gap:14}}>
        {list.map(g=>{
          const col = GASTRO_COLORS[g.type]||{bg:"#f5f5f5",color:"#555"}
          const grad = GASTRO_GRAD[g.type]||"linear-gradient(135deg,#555,#333)"
          return (
            <div key={g.id} onClick={()=>setSelected(g)} style={{background:WHITE,borderRadius:18,boxShadow:g.featured?"0 4px 18px rgba(184,134,11,0.3)":"0 3px 14px rgba(0,0,0,0.07)",border:g.featured?"1.5px solid #e6b31e":"1px solid #f0f0f0",overflow:"hidden",cursor:"pointer",display:"flex",flexDirection:"column"}}>
              <div style={{height:70,background:grad,position:"relative",display:"flex",alignItems:"center",padding:"0 16px",gap:12}}>
                <div style={{width:46,height:46,borderRadius:14,background:"rgba(255,255,255,0.92)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{GASTRO_EMOJI[g.type]||"🍽️"}</div>
                {g.lat && <span style={{background:"rgba(255,255,255,0.22)",color:WHITE,fontSize:10,fontWeight:800,padding:"3px 9px",borderRadius:99}}>🗺️ SUR LA CARTE</span>}
                {g.featured && <span style={{position:"absolute",top:8,right:8,background:"rgba(255,255,255,0.95)",color:"#b8860b",fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:99}}>⭐ À LA UNE</span>}
              </div>
              <div style={{padding:"12px 16px 14px",display:"flex",flexDirection:"column",gap:8,flex:1}}>
                <p style={{fontWeight:800,fontSize:15.5,color:"#111",margin:0,lineHeight:1.25}}>{g.name}</p>
                <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                  <span style={{background:col.bg,color:col.color,fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:99}}>{GASTRO_EMOJI[g.type]} {g.type}</span>
                  {g.city && <span style={{fontSize:12,color:"#888",fontWeight:600}}>📍 {g.city}</span>}
                </div>
                {g.note && <p style={{fontSize:12.5,color:"#777",margin:0,lineHeight:1.5,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{g.note}</p>}
                <div onClick={e=>e.stopPropagation()} style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginTop:"auto",paddingTop:4}}>
                  {g.fb && <a href={safeUrl(g.fb)} target="_blank" rel="noreferrer" style={{background:"#eef4fc",color:"#1565c0",fontSize:11.5,fontWeight:700,padding:"4px 10px",borderRadius:99,textDecoration:"none"}}>📘</a>}
                  {g.insta && <a href={safeUrl(g.insta)} target="_blank" rel="noreferrer" style={{background:"#fdeef4",color:"#c2185b",fontSize:11.5,fontWeight:700,padding:"4px 10px",borderRadius:99,textDecoration:"none"}}>📸</a>}
                  {g.tiktok && <a href={safeUrl(g.tiktok)} target="_blank" rel="noreferrer" style={{background:"#f0f0f0",color:"#222",fontSize:11.5,fontWeight:700,padding:"4px 10px",borderRadius:99,textDecoration:"none"}}>🎵</a>}
                  {g.phone && <span style={{fontSize:11.5,color:"#999",fontWeight:600}}>📞</span>}
                  <span style={{marginLeft:"auto",fontSize:12,fontWeight:800,color:col.color}}>Voir →</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {selected && <GastroDetail g={selected} isMobile={isMobile} onClose={()=>setSelected(null)}/>}
    </div>
  )
}

function AfterMoviePage({ videos, events, user, userProfile, onAuthRequired, onBack }) {
  const [activeFilter,setActiveFilter] = useState("Tous")
  const [playing,setPlaying]           = useState(null)
  const isMobile                       = useIsMobile()

  const aftermovies = videos.filter(v=>!v.isTeaser||v.type==="communaute")
  const teasers     = videos.filter(v=>v.isTeaser)

  const years   = ["Tous",...[...new Set(videos.map(v=>new Date(v.date).getFullYear().toString()))].sort((a,b)=>b-a)]
  const cities  = [...new Set(videos.filter(v=>v.city).map(v=>v.city))]
  const filters = [...years, ...cities]

  const filtered = videos.filter(v=>{
    if (activeFilter==="Tous") return true
    if (cities.includes(activeFilter)) return v.city===activeFilter
    return new Date(v.date).getFullYear().toString()===activeFilter
  }).sort((a,b)=>(b.featured?1:0)-(a.featured?1:0)) // épinglés en tête

  const featured = aftermovies[0]

  const totalViews = videos.reduce((acc,v)=>acc+(v.views||0),0)

  return (
    <div style={{minHeight:"100vh",background:"#0d0d0d",fontFamily:"system-ui,sans-serif"}}>
      {/* Hero */}
      <div style={{position:"relative",background:"linear-gradient(135deg,#1a0005,#0d0d0d)",padding:isMobile?"32px 16px 40px":"60px 40px 60px",textAlign:"center"}}>
        <button onClick={onBack} style={{position:"absolute",top:20,left:20,background:"rgba(255,255,255,0.1)",color:WHITE,fontWeight:700,padding:"8px 16px",borderRadius:99,border:"none",cursor:"pointer",fontSize:13}}>← Retour</button>
        <p style={{fontSize:isMobile?40:56,margin:"0 0 8px"}}>🎬</p>
        <h1 style={{color:WHITE,fontWeight:900,fontSize:isMobile?24:40,margin:"0 0 12px",letterSpacing:-1}}>Revivez les moments</h1>
        <p style={{color:"rgba(255,255,255,0.6)",fontSize:14,margin:"0 0 32px"}}>Tous les after-movies et teasers de la communauté malagasy</p>
        {/* Stats */}
        <div style={{display:"flex",justifyContent:"center",gap:isMobile?16:40,flexWrap:"wrap"}}>
          {[
            {n:videos.filter(v=>!v.isTeaser).length, l:"Events couverts"},
            {n:[...new Set(videos.map(v=>v.city).filter(Boolean))].length, l:"Villes"},
            {n:videos.length, l:"Vidéos"},
            {n:(totalViews/1000).toFixed(1)+"k", l:"Vues totales"},
          ].map((s,i)=>(
            <div key={i} style={{textAlign:"center"}}>
              <p style={{color:WHITE,fontWeight:900,fontSize:isMobile?22:32,margin:0}}>{s.n}</p>
              <p style={{color:"rgba(255,255,255,0.5)",fontSize:12,margin:0}}>{s.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Featured */}
      {featured && !playing && (
        <div style={{maxWidth:900,margin:"0 auto",padding:isMobile?"16px":"32px 24px"}}>
          <p style={{color:"rgba(255,255,255,0.5)",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:2,margin:"0 0 12px"}}>⭐ À la une</p>
          <div onClick={()=>setPlaying(featured)} style={{position:"relative",borderRadius:20,overflow:"hidden",cursor:"pointer"}}>
            <img src={featured.thumbnail} alt="" style={{width:"100%",height:isMobile?200:380,objectFit:"cover",display:"block"}}/>
            <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,0.8) 0%,transparent 50%)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div style={{width:72,height:72,borderRadius:"50%",background:"rgba(255,255,255,0.9)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>▶️</div>
            </div>
            <div style={{position:"absolute",bottom:20,left:20,right:20}}>
              <p style={{color:WHITE,fontWeight:800,fontSize:isMobile?16:22,margin:"0 0 4px"}}>{featured.title}</p>
              <p style={{color:"rgba(255,255,255,0.7)",fontSize:13,margin:0}}>📍 {featured.city} · {fmtShort(featured.date)} · 👁️ {(featured.views||0).toLocaleString('fr-FR')} vues</p>
            </div>
          </div>
        </div>
      )}

      {/* Video player inline */}
      {playing && (
        <div style={{maxWidth:900,margin:"0 auto",padding:isMobile?"16px":"32px 24px"}}>
          <button onClick={()=>setPlaying(null)} style={{background:"rgba(255,255,255,0.1)",color:WHITE,fontWeight:700,padding:"8px 16px",borderRadius:99,border:"none",cursor:"pointer",marginBottom:16}}>← Retour à la liste</button>
          <div style={{position:"relative",paddingBottom:"56.25%",height:0,borderRadius:16,overflow:"hidden",background:"#000"}}>
            <iframe src={playing.youtubeUrl} style={{position:"absolute",inset:0,width:"100%",height:"100%"}} allow="autoplay;fullscreen" allowFullScreen title={playing.title}/>
          </div>
          <p style={{color:WHITE,fontWeight:800,fontSize:18,margin:"16px 0 4px"}}>{playing.title}</p>
          <p style={{color:"rgba(255,255,255,0.6)",fontSize:13,margin:"0 0 20px"}}>📍 {playing.city} · {fmtShort(playing.date)} · {(playing.views||0).toLocaleString('fr-FR')} vues</p>
          <CommentSection mediaId={playing.id} user={user} onAuthRequired={onAuthRequired}/>
        </div>
      )}

      {/* Filters */}
      <div style={{maxWidth:900,margin:"0 auto",padding:isMobile?"0 16px 16px":"0 24px 16px"}}>
        <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
          {filters.map(f=>(
            <button key={f} onClick={()=>setActiveFilter(f)} style={{background:activeFilter===f?RED:"rgba(255,255,255,0.08)",color:activeFilter===f?WHITE:"rgba(255,255,255,0.6)",fontWeight:700,fontSize:12,padding:"6px 14px",borderRadius:99,border:"none",cursor:"pointer",whiteSpace:"nowrap"}}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{maxWidth:900,margin:"0 auto",padding:isMobile?"0 12px 40px":"0 24px 60px"}}>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:16}}>
          {filtered.map(v=>(
            <div key={v.id} onClick={()=>setPlaying(v)} style={{background:"#1a1a1a",borderRadius:16,overflow:"hidden",cursor:"pointer",border:v.featured?"1.5px solid #e6b31e":"none"}}>
              <div style={{position:"relative"}}>
                <img src={v.thumbnail} alt="" style={{width:"100%",height:160,objectFit:"cover",display:"block"}}/>
                <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.3)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <div style={{width:44,height:44,borderRadius:"50%",background:"rgba(255,255,255,0.85)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>▶</div>
                </div>
                {v.featured && <span style={{position:"absolute",top:8,right:8,background:"linear-gradient(135deg,#b8860b,#e6b31e)",color:WHITE,fontSize:10,fontWeight:800,padding:"3px 8px",borderRadius:99}}>⭐ À LA UNE</span>}
                {v.isTeaser && <span style={{position:"absolute",top:8,left:8,background:"#ff6b00",color:WHITE,fontSize:10,fontWeight:800,padding:"3px 8px",borderRadius:99}}>🎬 TEASER</span>}
                {v.type==="communaute" && <span style={{position:"absolute",top:8,left:8,background:GREEN,color:WHITE,fontSize:10,fontWeight:800,padding:"3px 8px",borderRadius:99}}>👥 COMMUNAUTÉ</span>}
              </div>
              <div style={{padding:12}}>
                <p style={{color:WHITE,fontWeight:700,fontSize:13,margin:"0 0 6px",lineHeight:1.3}}>{v.title}</p>
                <p style={{color:"rgba(255,255,255,0.5)",fontSize:11,margin:0}}>📍 {v.city||"—"} · {fmtShort(v.date)} · 👁️ {(v.views||0).toLocaleString('fr-FR')}</p>
              </div>
            </div>
          ))}
        </div>
        {filtered.length===0 && (
          <div style={{textAlign:"center",padding:60,color:"rgba(255,255,255,0.3)"}}>
            <p style={{fontSize:32}}>🎬</p>
            <p>Aucune vidéo pour ce filtre</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── EventCard ────────────────────────────────────── */
/* ── CalendarView : calendrier mensuel des événements (auto depuis la base) ── */
function CalendarView({ events, isMobile, onOpenEvent }) {
  const [cur,setCur] = useState(()=>{ const d=new Date(); return {y:d.getFullYear(),m:d.getMonth()} })
  const [openDay,setOpenDay] = useState(null)
  const monthNames = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"]
  const dayNames = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"]
  const first = new Date(cur.y,cur.m,1)
  const offset = (first.getDay()+6)%7 // Lundi = 0
  const daysInMonth = new Date(cur.y,cur.m+1,0).getDate()
  const todayStr = new Date().toISOString().slice(0,10)
  const byDay = {}
  events.forEach(e=>{ if(!e.date) return; const [yy,mm]=e.date.split("-"); if(+yy===cur.y && +mm===cur.m+1){ (byDay[e.date]=byDay[e.date]||[]).push(e) } })
  const move = d => setCur(c=>{ let m=c.m+d,y=c.y; if(m<0){m=11;y--} if(m>11){m=0;y++} return {y,m} })
  const cells = []
  for (let i=0;i<offset;i++) cells.push(null)
  for (let d=1;d<=daysInMonth;d++) cells.push(d)

  return (
    <div style={{background:WHITE,borderRadius:18,padding:isMobile?12:18,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <button onClick={()=>move(-1)} style={{background:"#f5f5f5",border:"none",borderRadius:10,width:36,height:36,fontSize:16,cursor:"pointer",fontWeight:800,color:"#555"}}>‹</button>
        <h3 style={{fontWeight:800,fontSize:isMobile?15:18,margin:0,color:"#111"}}>{monthNames[cur.m]} {cur.y}</h3>
        <button onClick={()=>move(1)} style={{background:"#f5f5f5",border:"none",borderRadius:10,width:36,height:36,fontSize:16,cursor:"pointer",fontWeight:800,color:"#555"}}>›</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:isMobile?3:6}}>
        {dayNames.map(d=><div key={d} style={{textAlign:"center",fontSize:11,fontWeight:700,color:"#aaa",padding:"2px 0"}}>{isMobile?d[0]:d}</div>)}
        {cells.map((d,i)=>{
          if (d===null) return <div key={"e"+i}/>
          const ds = `${cur.y}-${String(cur.m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`
          const evs = byDay[ds]||[]
          const isToday = ds===todayStr
          return (
            <div key={ds} style={{minHeight:isMobile?52:72,borderRadius:10,border:isToday?`1.5px solid ${RED}`:"1px solid #f0f0f0",padding:isMobile?3:5,background:evs.length?"#fff":"#fafafa",display:"flex",flexDirection:"column",gap:2,overflow:"hidden"}}>
              <span style={{fontSize:11,fontWeight:isToday?800:600,color:isToday?RED:"#999"}}>{d}</span>
              {evs.slice(0,isMobile?1:2).map(e=>{
                const col = CAT_COLORS[e.category]||{bg:"#eee",color:"#555"}
                return <button key={e.id} onClick={()=>onOpenEvent(e)} title={e.title} style={{background:col.bg,color:col.color,border:"none",borderRadius:6,padding:isMobile?"1px 3px":"2px 5px",fontSize:isMobile?8:10,fontWeight:700,cursor:"pointer",textAlign:"left",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",width:"100%"}}>{isMobile?"•":`${CAT_EMOJI[e.category]||""} ${e.title}`}</button>
              })}
              {evs.length>(isMobile?1:2) && <button onClick={()=>setOpenDay(openDay===ds?null:ds)} style={{fontSize:9,color:GREEN,fontWeight:900,background:'none',border:'none',padding:0,cursor:'pointer',textAlign:'left'}}>+{evs.length-(isMobile?1:2)} voir tout</button>}
            </div>
          )
        })}
      </div>
      {openDay && byDay[openDay] && <div style={{marginTop:14,background:'#f7fbf8',border:'1px solid #d8eadf',borderRadius:12,padding:12}}><p style={{fontWeight:800,fontSize:13,margin:'0 0 8px'}}>📅 Tous les événements du {new Date(openDay+'T12:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'long'})}</p>{byDay[openDay].map(e=><button key={e.id} onClick={()=>onOpenEvent(e)} style={{display:'block',width:'100%',textAlign:'left',background:WHITE,border:'1px solid #e8eee9',borderRadius:9,padding:'8px 10px',marginTop:6,cursor:'pointer',fontWeight:700,fontSize:12,color:'#333'}}>{CAT_EMOJI[e.category]||'📌'} {e.title}</button>)}</div>}
      <p style={{fontSize:11,color:"#bbb",textAlign:"center",marginTop:12}}>📅 Jusqu’à 2 événements sont visibles par jour (1 sur mobile) ; « + voir tout » ouvre les autres.</p>
    </div>
  )
}

function EventCard({ event, onSelect, user, onAuthRequired, isAdmin, onDelete, onEdit }) {
  const [fav,setFav]             = useState(false)
  const [interested,setInterested] = useState(false)
  const [interestCount,setCount] = useState(0)
  const [hover,setHover]         = useState(false)
  const [showShare,setShowShare] = useState(false)
  const [showReminder,setReminder] = useState(false)
  const [calTip,setCalTip]       = useState(false)
  const isMobile                 = useIsMobile()
  const cd                       = !isPast(event.date) ? countdown(event.date) : null
  const cat                      = CAT_COLORS[event.category]||CAT_COLORS.Autre
  const canEdit                  = !!user && (user.id===event.owner_id || isAdmin)
  const eventIsSynced            = isSyncedEvent(event)

  useEffect(()=>{
    if (!eventIsSynced) { setCount(0); setFav(false); setInterested(false); return }
    fetchCount()
    if (user) { checkFav(); checkInterest() }
  },[user,event.id])

  const fetchCount = async () => {
    const {count} = await supabase.from('event_interests').select('*',{count:'exact',head:true}).eq('event_id',event.id)
    setCount(count||0)
  }
  const checkFav = async () => {
    const {data} = await supabase.from('favorites').select('id').eq('event_id',event.id).eq('user_id',user.id).maybeSingle()
    setFav(!!data)
  }
  const checkInterest = async () => {
    const {data} = await supabase.from('event_interests').select('id').eq('event_id',event.id).eq('user_id',user.id).maybeSingle()
    setInterested(!!data)
  }

  const toggleFav = async e => {
    e.stopPropagation()
    if (!user) { onAuthRequired(); return }
    if (!eventIsSynced) { alert("Cet événement sera interactif après la mise à jour groupée de la base."); return }
    if (fav) { setFav(false); const {error}=await supabase.from('favorites').delete().eq('event_id',event.id).eq('user_id',user.id); if(error){setFav(true);alert("⚠️ "+error.message)} }
    else { setFav(true); const {error}=await supabase.from('favorites').insert({event_id:event.id,user_id:user.id}); if(error){setFav(false);alert("⚠️ "+error.message)} }
  }

  const toggleInterest = async e => {
    e.stopPropagation()
    if (!user) { onAuthRequired(); return }
    if (!eventIsSynced) { alert("Cet événement sera interactif après la mise à jour groupée de la base."); return }
    if (interested) { setInterested(false); setCount(c=>c-1); const {error}=await supabase.from('event_interests').delete().eq('event_id',event.id).eq('user_id',user.id); if(error){setInterested(true);setCount(c=>c+1);alert("⚠️ "+error.message)} }
    else { setInterested(true); setCount(c=>c+1); const {error}=await supabase.from('event_interests').insert({event_id:event.id,user_id:user.id}); if(error){setInterested(false);setCount(c=>c-1);alert("⚠️ "+error.message)} }
  }

  return (
    <>
      <div onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
        style={{background:WHITE,borderRadius:20,overflow:"hidden",boxShadow:hover?"0 12px 40px rgba(0,0,0,0.15)":"0 2px 12px rgba(0,0,0,0.08)",transform:hover?"translateY(-4px)":"none",transition:"all .25s",cursor:"pointer",display:"flex",flexDirection:"column"}}>

        {/* Image */}
        <div onClick={()=>onSelect(event)} style={{position:"relative",height:180,overflow:"hidden"}}>
          {event.image
            ? <img src={event.image} alt={`Affiche officielle de ${event.title}`} style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"top",transition:"transform .3s",transform:hover?"scale(1.05)":"scale(1)"}}/>
            : <BrandedCover event={event}/>}
          <FlagStripe/>
          {event.image && <EventCategoryTint event={event}/>}
          <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,0.45) 0%,transparent 60%)",pointerEvents:"none"}}/>
          {/* Badges top-left */}
          <div style={{position:"absolute",top:10,left:10,display:"flex",flexDirection:"column",gap:4}}>
            {isNew(event.createdAt) && <span style={{background:"#ff6b00",color:WHITE,fontSize:10,fontWeight:800,padding:"3px 8px",borderRadius:99}}>🆕 NOUVEAU</span>}
            {cd && <span style={{background:cd.today?"#ff2d20":cd.hot?RED:"rgba(0,0,0,0.6)",color:WHITE,fontSize:cd.today?11:10,fontWeight:900,padding:cd.today?"5px 10px":"3px 8px",borderRadius:99,boxShadow:cd.today?"0 0 0 3px rgba(255,255,255,.85), 0 4px 14px rgba(200,16,46,.5)":"none",letterSpacing:(cd.today?0.3:0)}}>{cd.text}</span>}
          </div>
          {/* Fav btn top-right */}
          <button onClick={toggleFav} style={{position:"absolute",top:8,right:8,background:"rgba(255,255,255,0.9)",borderRadius:"50%",width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",border:"none",cursor:"pointer",fontSize:16}}>
            {fav?"❤️":"🤍"}
          </button>
          {/* Category bottom-left */}
          <span style={{position:"absolute",bottom:10,left:10,background:cat.color,color:WHITE,fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:99}}>{event.category}</span>
        </div>

        {/* Content */}
        <div onClick={()=>onSelect(event)} style={{padding:"14px 16px 10px",flex:1}}>
          <h3 style={{fontWeight:800,fontSize:15,color:"#111",margin:"0 0 8px",lineHeight:1.3}}>{event.title}</h3>
          <p style={{fontSize:12,color:"#666",margin:"0 0 3px"}}>📅 {fmtShort(event.date)}</p>
          <p style={{fontSize:12,color:"#666",margin:"0 0 3px"}}>📍 {event.location}</p>
          <p style={{fontSize:12,color:"#666",margin:"0 0 8px"}}>👤 {event.organizer}</p>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
            <span style={{background:event.price==="Gratuit"?"linear-gradient(135deg,#e6f4ed,#c7ead5)":"linear-gradient(135deg,#fff1f3,#fde0e6)",color:event.price==="Gratuit"?GREEN:RED,fontWeight:900,fontSize:event.price?18:12,padding:event.price?'8px 12px':'6px 10px',borderRadius:12,border:`1px solid ${event.price==="Gratuit"?'#bce3c9':'#f4c0ca'}`,letterSpacing:-.3,boxShadow:'0 2px 7px rgba(200,16,46,.08)'}}>{event.price?priceDisplay(event.price):'Prix non renseigné'}</span>
            {interestCount>0 && <span style={{fontSize:11,color:"#888"}}>👀 {interestCount} intéressé{interestCount>1?"s":""}</span>}
          </div>
        </div>

        {/* Actions */}
        <div style={{padding:"10px 16px 14px",borderTop:"1px solid #f5f5f5",display:"flex",gap:6,flexWrap:"wrap"}}>
          <button onClick={toggleInterest} style={{display:"flex",alignItems:"center",gap:4,background:interested?"#e6f4ed":"#f5f5f5",color:interested?GREEN:"#666",fontWeight:700,fontSize:11,padding:"6px 10px",borderRadius:99,border:"none",cursor:"pointer"}}>
            {interested?"✓ Intéressé":"👀 Intéressé"}
          </button>
          <button onClick={e=>{e.stopPropagation();downloadICS(event);setCalTip(true);setTimeout(()=>setCalTip(false),2000)}} style={{background:"#f5f5f5",color:"#666",fontWeight:700,fontSize:11,padding:"6px 10px",borderRadius:99,border:"none",cursor:"pointer"}}>
            {calTip?"✓":"📅"}
          </button>
          {!isPast(event.date) && (
            <button onClick={e=>{e.stopPropagation();setReminder(true)}} style={{background:"#f5f5f5",color:"#666",fontWeight:700,fontSize:11,padding:"6px 10px",borderRadius:99,border:"none",cursor:"pointer"}}>🔔</button>
          )}
          <button onClick={e=>{e.stopPropagation();setShowShare(true)}} style={{background:"#f5f5f5",color:"#666",fontWeight:700,fontSize:11,padding:"6px 10px",borderRadius:99,border:"none",cursor:"pointer",marginLeft:"auto"}}>📤</button>
          {BILLETTERIE_ACTIVE && isVerifiedTicketUrl(eventTicketUrl(event))
            ? <a href={eventTicketUrl(event)} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{background:RED,color:WHITE,fontWeight:700,fontSize:11,padding:"6px 12px",borderRadius:99,textDecoration:"none"}}>🎟️ Billets</a>
            : <span style={{background:"#f0f0f0",color:"#999",fontWeight:700,fontSize:11,padding:"6px 12px",borderRadius:99}}>🎟️ Billets</span>}
        </div>
        {canEdit && (
          <div style={{padding:"0 16px 12px",display:"flex",gap:8}}>
            <button onClick={e=>{e.stopPropagation();onEdit?.(event)}} style={{background:'#e6f4ed',color:GREEN,fontWeight:700,fontSize:11,padding:'5px 12px',borderRadius:99,border:'none',cursor:'pointer'}}>✏️ Modifier</button>
            {isAdmin && <button onClick={e=>{e.stopPropagation();onDelete&&onDelete(event.id)}} style={{background:"#fde8ec",color:RED,fontWeight:700,fontSize:11,padding:"5px 12px",borderRadius:99,border:"none",cursor:"pointer"}}>🗑️ Supprimer</button>}
          </div>
        )}
      </div>

      {showShare && <ShareMenu ev={event} onClose={()=>setShowShare(false)}/>}
      {showReminder && <ReminderModal ev={event} onClose={()=>setReminder(false)}/>}
      {showReminder && !user && (onAuthRequired(), setReminder(false))}
    </>
  )
}

/* ── EventDetail ──────────────────────────────────── */
/* ── Qui y va ? ───────────────────────────────────── */
const AVATAR_COLORS = [["#FAECE7","#712B13"],["#E1F5EE","#085041"],["#E6F1FB","#0C447C"],["#FAEEDA","#633806"],["#EEEDFE","#3C3489"],["#FBEAF0","#72243E"]]

function EventPeople({ event, user, onAuthRequired, interested, toggleInterest, count }) {
  const [people,setPeople] = useState([])

  useEffect(()=>{ fetchPeople() },[count])

  const fetchPeople = async () => {
    const {data,error} = await supabase.from('event_interests').select('user_id,profiles(username,avatar_url)').eq('event_id',event.id)
    if (!error && data) { setPeople(data); return }
    const {data:raw} = await supabase.from('event_interests').select('user_id').eq('event_id',event.id)
    if (!raw?.length) { setPeople([]); return }
    const {data:profs} = await supabase.from('profiles').select('id,username,avatar_url').in('id',raw.map(r=>r.user_id))
    setPeople(raw.map(r=>({user_id:r.user_id,profiles:profs?.find(p=>p.id===r.user_id)})))
  }

  const names = people.map(p=>p.profiles?.username).filter(Boolean)
  const summary = names.length===0 ? "" : names.length<=3 ? names.join(", ") : `${names.slice(0,3).join(", ")} et ${names.length-3} autre${names.length-3>1?"s":""}`

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:16}}>
        <div style={{display:"flex"}}>
          {people.slice(0,6).map((p,i)=>{
            const [bg,fg] = AVATAR_COLORS[i%AVATAR_COLORS.length]
            const u = p.profiles?.username||"?"
            return p.profiles?.avatar_url
              ? <img key={p.user_id} src={p.profiles.avatar_url} alt={u} title={u} style={{width:34,height:34,borderRadius:"50%",border:"2px solid #fff",marginLeft:i?-8:0,objectFit:"cover"}}/>
              : <div key={p.user_id} title={u} style={{width:34,height:34,borderRadius:"50%",background:bg,color:fg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,border:"2px solid #fff",marginLeft:i?-8:0}}>{u.slice(0,2).toUpperCase()}</div>
          })}
          {people.length>6 && <div style={{width:34,height:34,borderRadius:"50%",background:"#f0f0f0",color:"#666",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,border:"2px solid #fff",marginLeft:-8}}>+{people.length-6}</div>}
        </div>
        <span style={{fontSize:13,color:"#666"}}>
          {count===0 ? "Personne pour l'instant — lance le mouvement !" : `${summary||count+" personne"+(count>1?"s":"")} ${count>1?"y vont":"y va"}`}
        </span>
        <button onClick={toggleInterest} style={{marginLeft:"auto",background:interested?"#e6f4ed":RED,color:interested?GREEN:WHITE,fontWeight:700,fontSize:13,padding:"8px 16px",borderRadius:99,border:"none",cursor:"pointer",whiteSpace:"nowrap"}}>
          {interested?"✓ J'y vais !":"🙋 J'y vais"}
        </button>
      </div>
      <CommentSection eventId={event.id} user={user} onAuthRequired={onAuthRequired}/>
    </div>
  )
}

/* ── Entraide : covoiturage + hébergement ────────── */
const ENTRAIDE_CATS = {
  trajet:      {emoji:"🚗", label:"Trajet",      placeLbl:"place",  cta:"un trajet"},
  hebergement: {emoji:"🛏️", label:"Hébergement", placeLbl:"couchage", cta:"un hébergement"},
}
const isSyncedEvent = event => /^\d+$/.test(String(event?.id||""))

function EntraideActions({ item, user, onAuthRequired, onProfileClick }) {
  const [likes,setLikes]       = useState(0)
  const [liked,setLiked]       = useState(false)
  const [open,setOpen]         = useState(false)
  const [comments,setComments] = useState([])
  const [text,setText]         = useState("")
  const [busy,setBusy]         = useState(false)
  const [cEditId,setCEditId]   = useState(null)
  const [cEditText,setCEditText] = useState("")

  const load = async () => {
    const {count} = await supabase.from('entraide_likes').select('*',{count:'exact',head:true}).eq('entraide_id',item.id)
    setLikes(count||0)
    if (user) {
      const {data} = await supabase.from('entraide_likes').select('user_id').eq('entraide_id',item.id).eq('user_id',user.id).maybeSingle()
      setLiked(!!data)
    }
  }
  useEffect(()=>{ load() },[item.id,user])

  const toggleLike = async () => {
    if (!user) { onAuthRequired(); return }
    if (liked) { await supabase.from('entraide_likes').delete().eq('entraide_id',item.id).eq('user_id',user.id); setLiked(false); setLikes(n=>Math.max(0,n-1)) }
    else { const {error}=await supabase.from('entraide_likes').insert({entraide_id:item.id,user_id:user.id}); if(!error){ setLiked(true); setLikes(n=>n+1) } }
  }

  const loadComments = async () => {
    const {data} = await supabase.from('entraide_comments').select('*,profiles(username)').eq('entraide_id',item.id).order('created_at',{ascending:true})
    setComments(data||[])
  }
  const toggleComments = async () => { const nx=!open; setOpen(nx); if(nx) await loadComments() }

  const send = async e => {
    e.preventDefault()
    if (!user) { onAuthRequired(); return }
    if (!text.trim()) return
    setBusy(true)
    const {error} = await supabase.from('entraide_comments').insert({entraide_id:item.id,user_id:user.id,content:text.trim()})
    if (!error) { setText(""); await loadComments() }
    setBusy(false)
  }
  const saveEdit = async id => {
    if (!cEditText.trim()) return
    await supabase.from('entraide_comments').update({content:cEditText.trim()}).eq('id',id).eq('user_id',user.id)
    setCEditId(null); setCEditText(""); await loadComments()
  }
  const delComment = async id => { await supabase.from('entraide_comments').delete().eq('id',id).eq('user_id',user.id); await loadComments() }

  return (
    <div style={{marginTop:8,paddingTop:8,borderTop:"1px solid #eee"}}>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <button onClick={toggleLike} style={{background:"none",border:"none",cursor:"pointer",fontSize:12.5,fontWeight:700,color:liked?RED:"#888",display:"flex",alignItems:"center",gap:4}}>{liked?"❤️":"🤍"} {likes>0?likes:""}</button>
        <button onClick={toggleComments} style={{background:"none",border:"none",cursor:"pointer",fontSize:12.5,fontWeight:700,color:"#888"}}>💬 Commenter{comments.length>0?` · ${comments.length}`:""}</button>
      </div>
      {open && (
        <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:6}}>
          {comments.map(c=>(
            <div key={c.id} style={{fontSize:12,color:"#444"}}>
              {cEditId===c.id ? (
                <div style={{display:"flex",gap:6}}>
                  <input value={cEditText} onChange={e=>setCEditText(e.target.value)} style={{flex:1,border:"1.5px solid #e5e5e5",borderRadius:99,padding:"5px 10px",fontSize:12,outline:"none"}}/>
                  <button onClick={()=>saveEdit(c.id)} style={{background:GREEN,color:WHITE,border:"none",borderRadius:99,fontSize:11.5,fontWeight:700,padding:"5px 10px",cursor:"pointer"}}>OK</button>
                  <button onClick={()=>{setCEditId(null);setCEditText("")}} style={{background:"none",border:"none",color:"#999",fontSize:11.5,cursor:"pointer"}}>✕</button>
                </div>
              ) : (
                <span>
                  {c.user_id && user && c.user_id!==user.id
                    ? <button onClick={()=>onProfileClick&&onProfileClick(c.user_id, c.profiles?.username||"Un membre")} style={{background:"none",border:"none",padding:0,color:"#185FA5",fontWeight:700,fontSize:12,cursor:"pointer"}}>{c.profiles?.username||"Un membre"}</button>
                    : <b style={{color:"#111"}}>{c.profiles?.username||"Un membre"}</b>}
                  {" · "}{c.content}
                  {user && c.user_id===user.id && <>
                    {" "}<button onClick={()=>{setCEditId(c.id);setCEditText(c.content)}} style={{background:"none",border:"none",color:"#aaa",fontSize:11,cursor:"pointer"}}>✏️</button>
                    <button onClick={()=>delComment(c.id)} style={{background:"none",border:"none",color:"#ccc",fontSize:11,cursor:"pointer"}}>🗑️</button>
                  </>}
                </span>
              )}
            </div>
          ))}
          {comments.length===0 && <p style={{fontSize:11.5,color:"#bbb",margin:0}}>Sois le premier à répondre à cette annonce.</p>}
          <form onSubmit={send} style={{display:"flex",gap:6}}>
            <input value={text} onChange={e=>setText(e.target.value)} placeholder="Écrire un message…" style={{flex:1,border:"1.5px solid #e5e5e5",borderRadius:99,padding:"7px 12px",fontSize:12.5,outline:"none"}}/>
            <button type="submit" disabled={busy} style={{background:GREEN,color:WHITE,fontWeight:700,fontSize:12.5,padding:"7px 14px",borderRadius:99,border:"none",cursor:"pointer"}}>{busy?"…":"Envoyer"}</button>
          </form>
        </div>
      )}
    </div>
  )
}

function EntraideSection({ event, user, onAuthRequired, onProfileClick }) {
  const [items,setItems]             = useState([])
  const [unavailable,setUnavailable] = useState(false)
  const [catFilter,setCatFilter]     = useState("tous")
  const [showForm,setShowForm]       = useState(false)
  const [saving,setSaving]           = useState(false)
  const [errorMessage,setErrorMessage] = useState("")
  const [editId,setEditId]           = useState(null)
  const [form,setForm]               = useState({category:"trajet",type:"propose",city:"",places:1,note:""})

  useEffect(()=>{ fetchItems() },[event.id])

  const fetchItems = async () => {
    setErrorMessage("")
    if (!isSyncedEvent(event)) return
    let {data,error} = await supabase.from('entraide').select('*,profiles(username)').eq('event_id',event.id).order('created_at',{ascending:false})
    if (error) {
      const retry = await supabase.from('entraide').select('*').eq('event_id',event.id).order('created_at',{ascending:false})
      if (retry.error) { setUnavailable(true); setErrorMessage("Impossible de charger l'entraide pour le moment. Réessaie dans quelques instants."); return }
      data = retry.data
    }
    setItems(data||[])
  }

  const resetForm = () => { setForm({category:"trajet",type:"propose",city:"",places:1,note:""}); setShowForm(false); setEditId(null) }

  const submit = async e => {
    e.preventDefault()
    if (!user) { onAuthRequired(); return }
    if (!form.city.trim()) return
    setSaving(true)
    const payload = {category:form.category,type:form.type,city:form.city.trim(),places:form.places,note:form.note.trim()}
    const {error} = editId
      ? await supabase.from('entraide').update(payload).eq('id',editId).eq('user_id',user.id)
      : await supabase.from('entraide').insert({event_id:event.id,user_id:user.id,...payload})
    if (!error) { setErrorMessage(""); resetForm(); await fetchItems() }
    else setErrorMessage("L'annonce n'a pas été enregistrée : "+error.message)
    setSaving(false)
  }

  const startEdit = it => { setForm({category:it.category,type:it.type,city:it.city||"",places:it.places||1,note:it.note||""}); setEditId(it.id); setShowForm(true) }

  const remove = async id => { const {error}=await supabase.from('entraide').delete().eq('id',id).eq('user_id',user.id); if(error){setErrorMessage("Suppression impossible : "+error.message);return} await fetchItems() }

  if (!isSyncedEvent(event)) return <div style={{background:"#fff8e8",border:"1px solid #eed89c",borderRadius:14,padding:14,color:"#6b5419",fontSize:13,lineHeight:1.5}}>🤝 Cet événement doit encore être synchronisé avec la base avant d'accepter des annonces. Il est inclus dans la mise à jour groupée en attente.</div>
  if (unavailable) return <div style={{textAlign:"center",padding:"24px 0"}}><p style={{fontSize:13,color:RED,margin:"0 0 10px"}}>⚠️ {errorMessage||"Le module entraide est momentanément indisponible."}</p><button onClick={()=>{setUnavailable(false);fetchItems()}} style={{background:GREEN,color:WHITE,border:0,borderRadius:99,padding:"8px 14px",fontWeight:800,cursor:"pointer"}}>Réessayer</button></div>

  const shown = catFilter==="tous" ? items : items.filter(i=>i.category===catFilter)

  return (
    <div>
      {errorMessage && <p role="alert" style={{background:"#fde8ec",color:RED,borderRadius:10,padding:"9px 12px",fontSize:12,fontWeight:700}}>{errorMessage}</p>}
      <div style={{display:"flex",gap:6,marginBottom:14}}>
        {[["tous","Tous"],["trajet","🚗 Trajets"],["hebergement","🛏️ Hébergements"]].map(([k,l])=>(
          <button key={k} onClick={()=>setCatFilter(k)} style={{background:catFilter===k?"#333":WHITE,color:catFilter===k?WHITE:"#555",fontWeight:700,fontSize:12,padding:"6px 12px",borderRadius:99,border:catFilter===k?"none":"1px solid #e0e0e0",cursor:"pointer"}}>{l}</button>
        ))}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:14}}>
        {shown.map(r=>{
          const cat = ENTRAIDE_CATS[r.category]||ENTRAIDE_CATS.trajet
          return (
            <div key={r.id} style={{background:"#f8f8f8",borderRadius:14,padding:"12px 14px"}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:20}}>{r.type==="propose"?cat.emoji:"🙋"}</span>
                <div style={{minWidth:0,flex:1}}>
                  <p style={{fontSize:13,fontWeight:700,color:"#111",margin:0}}>
                    {r.user_id && user && r.user_id!==user.id
                      ? <button onClick={()=>onProfileClick&&onProfileClick(r.user_id, r.profiles?.username||"Un membre")} style={{background:"none",border:"none",padding:0,color:"#185FA5",fontWeight:700,fontSize:13,cursor:"pointer",textDecoration:"underline"}}>{r.profiles?.username||"Un membre"}</button>
                      : <span>{r.profiles?.username||"Un membre"}</span>}
                    {" "}{r.type==="propose"?"propose":"cherche"} · {cat.label.toLowerCase()} · {r.places} {cat.placeLbl}{r.places>1?"s":""}
                  </p>
                  <p style={{fontSize:12,color:"#777",margin:0}}>{r.category==="trajet"?"Depuis":"À"} {r.city}{r.note?` · ${r.note}`:""}</p>
                </div>
                <span style={{fontSize:11,fontWeight:700,background:r.type==="propose"?"#e6f4ed":"#FAECE7",color:r.type==="propose"?GREEN:"#712B13",padding:"3px 10px",borderRadius:99,whiteSpace:"nowrap"}}>{r.type==="propose"?"Propose":"Cherche"}</span>
                {user && r.user_id===user.id && <button onClick={()=>startEdit(r)} style={{background:"none",border:"none",color:"#888",cursor:"pointer",fontSize:14}}>✏️</button>}
                {user && r.user_id===user.id && <button onClick={()=>remove(r.id)} style={{background:"none",border:"none",color:"#bbb",cursor:"pointer",fontSize:14}}>🗑️</button>}
              </div>
              <EntraideActions item={r} user={user} onAuthRequired={onAuthRequired} onProfileClick={onProfileClick}/>
            </div>
          )
        })}
        {shown.length===0 && <p style={{fontSize:12,color:"#bbb",textAlign:"center",margin:"12px 0"}}>Aucune annonce pour l'instant. Lance la première 👇</p>}
      </div>

      {!showForm ? (
        <button onClick={()=>{ if(!user){onAuthRequired();return} setShowForm(true) }} style={{background:GREEN,color:WHITE,fontWeight:700,fontSize:13,padding:"10px 18px",borderRadius:99,border:"none",cursor:"pointer"}}>
          + Proposer ou chercher (trajet, hébergement)
        </button>
      ) : (
        <form onSubmit={submit} style={{background:"#f8f8f8",borderRadius:14,padding:16,display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"flex",gap:8}}>
            {[["trajet","🚗 Trajet"],["hebergement","🛏️ Hébergement"]].map(([v,l])=>(
              <button key={v} type="button" onClick={()=>setForm({...form,category:v})} style={{flex:1,background:form.category===v?"#333":WHITE,color:form.category===v?WHITE:"#444",fontWeight:700,fontSize:13,padding:"8px",borderRadius:10,border:form.category===v?"none":"1px solid #e0e0e0",cursor:"pointer"}}>{l}</button>
            ))}
          </div>
          <div style={{display:"flex",gap:8}}>
            {[["propose","✅ Je propose"],["cherche","🙋 Je cherche"]].map(([v,l])=>(
              <button key={v} type="button" onClick={()=>setForm({...form,type:v})} style={{flex:1,background:form.type===v?GREEN:WHITE,color:form.type===v?WHITE:"#444",fontWeight:700,fontSize:13,padding:"8px",borderRadius:10,border:form.type===v?"none":"1px solid #e0e0e0",cursor:"pointer"}}>{l}</button>
            ))}
          </div>
          <div style={{display:"flex",gap:8}}>
            <input required value={form.city} onChange={e=>setForm({...form,city:e.target.value})} placeholder={form.category==="trajet"?"Ville de départ *":"Ville / quartier *"} style={{flex:2,border:"1.5px solid #e5e5e5",borderRadius:10,padding:"9px 12px",fontSize:13,outline:"none"}}/>
            <select value={form.places} onChange={e=>setForm({...form,places:+e.target.value})} style={{flex:1,border:"1.5px solid #e5e5e5",borderRadius:10,padding:"9px 8px",fontSize:13,outline:"none",background:WHITE}}>
              {[1,2,3,4,5,6].map(n=><option key={n} value={n}>{n} {ENTRAIDE_CATS[form.category].placeLbl}{n>1?"s":""}</option>)}
            </select>
          </div>
          <input value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder="Détails (horaire, participation, conditions...)" style={{border:"1.5px solid #e5e5e5",borderRadius:10,padding:"9px 12px",fontSize:13,outline:"none"}}/>
          <div style={{display:"flex",gap:8}}>
            <button type="submit" disabled={saving} style={{background:GREEN,color:WHITE,fontWeight:700,fontSize:13,padding:"9px 18px",borderRadius:99,border:"none",cursor:"pointer"}}>{saving?"...":editId?"Enregistrer":"Publier"}</button>
            <button type="button" onClick={resetForm} style={{background:"none",color:"#888",fontWeight:700,fontSize:13,padding:"9px 12px",border:"none",cursor:"pointer"}}>Annuler</button>
          </div>
          <p style={{fontSize:11,color:"#aaa",margin:0}}>💡 Organisez les détails dans le fil « Qui y va ? » — évitez de publier votre numéro en clair.</p>
        </form>
      )}
    </div>
  )
}

/* ── Modification d'un événement : auteur ou admin ── */
function EventEditModal({ event, onClose, onSaved }) {
  const [form,setForm] = useState({title:event.title||'',date:event.date||'',city:event.city||'',location:event.location||'',category:event.category||'Soirée',price:event.price||'',organizer:event.organizer||'',ticketUrl:eventTicketUrl(event)||'',official_source_url:eventOfficialSourceUrl(event)||'',updates_url:eventUpdatesUrl(event)||'',image:event.image||'',description:event.description||''})
  const [saving,setSaving] = useState(false)
  const inp = {width:'100%',boxSizing:'border-box',border:'1.5px solid #e3e3e3',borderRadius:10,padding:'9px 11px',fontSize:13,outline:'none'}
  const save = async e => {
    e.preventDefault()
    if (!form.title.trim() || !form.date) { alert('Le titre et la date sont obligatoires.'); return }
    setSaving(true)
    const payload = {...form,title:form.title.trim(),ticketUrl:safeUrl(form.ticketUrl),official_source_url:safeUrl(form.official_source_url),updates_url:safeUrl(form.updates_url),image:"",mediaUrls:[]}
    const {data,error} = await supabase.from('events').update(payload).eq('id',event.id).select().single()
    setSaving(false)
    if (error) { alert('⚠️ Modification impossible ('+error.message+')'); return }
    onSaved?.(data); onClose()
  }
  return <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:'fixed',inset:0,zIndex:180,background:'rgba(0,0,0,.7)',display:'flex',alignItems:'flex-start',justifyContent:'center',overflowY:'auto',padding:16}}>
    <form onSubmit={save} style={{background:WHITE,borderRadius:20,width:'100%',maxWidth:560,margin:'auto',padding:24,boxShadow:'0 24px 80px rgba(0,0,0,.3)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}><div><h3 style={{margin:0,fontSize:18,color:'#111'}}>✏️ Modifier l’événement</h3><p style={{fontSize:12,color:'#888',margin:'4px 0 0'}}>Les changements sont visibles immédiatement.</p></div><button type="button" onClick={onClose} style={{background:'#f2f2f2',border:'none',borderRadius:'50%',width:32,height:32,fontSize:18,cursor:'pointer'}}>×</button></div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        <input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Titre *" style={inp}/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}><input required type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={inp}/><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={inp}>{Object.keys(CAT_COLORS).map(x=><option key={x}>{x}</option>)}</select></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}><input value={form.city} onChange={e=>setForm({...form,city:e.target.value})} placeholder="Ville" style={inp}/><input value={form.location} onChange={e=>setForm({...form,location:e.target.value})} placeholder="Lieu" style={inp}/></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}><input value={form.organizer} onChange={e=>setForm({...form,organizer:e.target.value})} placeholder="Organisateur" style={inp}/><input value={form.price} onChange={e=>setForm({...form,price:e.target.value})} placeholder="Prix (ex. Gratuit)" style={inp}/></div>
        <input value={form.ticketUrl} onChange={e=>setForm({...form,ticketUrl:e.target.value})} placeholder="Lien de billetterie" style={inp}/>
        <input value={form.official_source_url} onChange={e=>setForm({...form,official_source_url:e.target.value})} placeholder="Annonce officielle (Facebook, Instagram, site…)" style={inp}/>
        <input value={form.updates_url} onChange={e=>setForm({...form,updates_url:e.target.value})} placeholder="Page officielle à suivre" style={inp}/>
        <div style={{background:"#fff8e8",border:"1px solid #eed89c",borderRadius:10,padding:"10px 12px",fontSize:12,color:"#6b5419",lineHeight:1.45}}>🛡️ Les affiches et photos d’événements sont temporairement désactivées. Elles seront réactivées uniquement avec une autorisation écrite vérifiable.</div>
        <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Description" rows={5} style={{...inp,resize:'vertical',fontFamily:'system-ui,sans-serif'}}/>
      </div>
      <div style={{display:'flex',gap:8,marginTop:16}}><button type="submit" disabled={saving} style={{background:GREEN,color:WHITE,border:'none',borderRadius:12,padding:'10px 18px',fontWeight:800,fontSize:13,cursor:'pointer'}}>{saving?'...':'✓ Enregistrer'}</button><button type="button" onClick={onClose} style={{background:'#f0f0f0',color:'#666',border:'none',borderRadius:12,padding:'10px 16px',fontWeight:700,fontSize:13,cursor:'pointer'}}>Annuler</button></div>
    </form>
  </div>
}

function EventDetail({ event, onClose, user, onAuthRequired, isAdmin, onUpdated, onProfileClick, organizerProfile, onOrganizerClick }) {
  const [showShare,setShowShare]   = useState(false)
  const [showReminder,setReminder] = useState(false)
  const [showTicket,setShowTicket] = useState(false)
  const [interested,setInterested] = useState(false)
  const [fav,setFav]               = useState(false)
  const [count,setCount]           = useState(0)
  const [tab,setTab]               = useState("infos")
  const [editing,setEditing]       = useState(!!event._edit)
  const isMobile                   = useIsMobile()
  const isYoutube = url => url&&(url.includes('youtube')||url.includes('youtu.be'))
  const canEdit = !!user && (user.id===event.owner_id || isAdmin)
  const eventIsSynced = isSyncedEvent(event)
  const officialPartnerPosters = approvedPartnerPosters(event)

  useEffect(()=>{
    if (!eventIsSynced) { setCount(0); setFav(false); setInterested(false); return }
    fetchCount()
    if (user) { checkFav(); checkInterest() }
  },[user,event.id])

  const fetchCount = async () => { const {count:c} = await supabase.from('event_interests').select('*',{count:'exact',head:true}).eq('event_id',event.id); setCount(c||0) }
  const checkFav = async () => { const {data} = await supabase.from('favorites').select('id').eq('event_id',event.id).eq('user_id',user.id).maybeSingle(); setFav(!!data) }
  const checkInterest = async () => { const {data} = await supabase.from('event_interests').select('id').eq('event_id',event.id).eq('user_id',user.id).maybeSingle(); setInterested(!!data) }

  const toggleFav = async () => {
    if (!user) { onAuthRequired(); return }
    if (!eventIsSynced) { alert("Cet événement sera interactif après la mise à jour groupée de la base."); return }
    if (fav) { setFav(false); const {error}=await supabase.from('favorites').delete().eq('event_id',event.id).eq('user_id',user.id); if(error){setFav(true);alert("⚠️ "+error.message)} }
    else { setFav(true); const {error}=await supabase.from('favorites').insert({event_id:event.id,user_id:user.id}); if(error){setFav(false);alert("⚠️ "+error.message)} }
  }

  const toggleInterest = async () => {
    if (!user) { onAuthRequired(); return }
    if (!eventIsSynced) { alert("Cet événement sera interactif après la mise à jour groupée de la base."); return }
    if (interested) { setInterested(false); setCount(c=>c-1); const {error}=await supabase.from('event_interests').delete().eq('event_id',event.id).eq('user_id',user.id); if(error){setInterested(true);setCount(c=>c+1);alert("⚠️ "+error.message)} }
    else { setInterested(true); setCount(c=>c+1); const {error}=await supabase.from('event_interests').insert({event_id:event.id,user_id:user.id}); if(error){setInterested(false);setCount(c=>c-1);alert("⚠️ "+error.message)} }
  }

  return (
    <>
      <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"flex-start",justifyContent:"center",zIndex:80,overflowY:"auto",padding:"16px"}}>
        <div style={{background:WHITE,borderRadius:24,width:"100%",maxWidth:680,margin:"auto",boxShadow:"0 24px 80px rgba(0,0,0,0.3)",overflow:"hidden"}}>
          {/* Hero image */}
          <div style={{position:"relative",height:isMobile?200:300}}>
            {event.image
              ? <img src={event.image} alt={`Affiche officielle de ${event.title}`} style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"top"}}/>
              : <BrandedCover event={event} big/>}
            <FlagStripe/>
            {event.image && <EventCategoryTint event={event}/>}
            <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,0.6) 0%,transparent 50%)",pointerEvents:"none"}}/>
            <button onClick={onClose} style={{position:"absolute",top:16,right:16,background:"rgba(0,0,0,0.5)",color:WHITE,fontWeight:800,fontSize:20,width:36,height:36,borderRadius:"50%",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            <button onClick={toggleFav} style={{position:"absolute",top:16,left:16,background:"rgba(0,0,0,0.5)",borderRadius:"50%",width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",border:"none",cursor:"pointer",fontSize:18}}>
              {fav?"❤️":"🤍"}
            </button>
            <div style={{position:"absolute",bottom:16,left:20}}>
              <h2 style={{color:WHITE,fontWeight:900,fontSize:isMobile?20:26,margin:0,lineHeight:1.2}}>{event.title}</h2>
            </div>
          </div>

          <div style={{padding:isMobile?"16px":"28px"}}>
            {/* Onglets */}
            <div style={{display:"flex",gap:2,borderBottom:"1px solid #eee",marginBottom:20}}>
              {[["infos","ℹ️ Infos"],["people",`👥 Qui y va${count>0?` · ${count}`:""}`],["rides","🤝 Entraide"]].map(([k,l])=>(
                <button key={k} onClick={()=>setTab(k)} style={{background:"none",border:"none",borderBottom:tab===k?`3px solid ${RED}`:"3px solid transparent",fontWeight:700,fontSize:13,color:tab===k?"#111":"#999",padding:"8px 12px",cursor:"pointer",whiteSpace:"nowrap"}}>{l}</button>
              ))}
            </div>

            {canEdit && event.featured_until && (() => {
              const dLeft = Math.ceil((new Date(event.featured_until) - new Date()) / 86400000)
              return dLeft > 0
                ? <div style={{background:"#faf6ec",border:"1px solid #e6d9a8",borderRadius:10,padding:"8px 12px",marginBottom:16,fontSize:12.5,fontWeight:700,color:"#7a5c00"}}>⭐ Mise en avant active — {dLeft} jour{dLeft>1?"s":""} restant{dLeft>1?"s":""}</div>
                : <div style={{background:"#f7f7f7",border:"1px solid #e5e5e5",borderRadius:10,padding:"8px 12px",marginBottom:16,fontSize:12.5,fontWeight:700,color:"#999"}}>⭐ Mise en avant terminée</div>
            })()}

            {tab==="people" && <EventPeople event={event} user={user} onAuthRequired={onAuthRequired} interested={interested} toggleInterest={toggleInterest} count={count}/>}
            {tab==="rides" && <EntraideSection event={event} user={user} onAuthRequired={onAuthRequired} onProfileClick={onProfileClick}/>}

            {tab==="infos" && (<>
            {/* Info grid */}
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,marginBottom:20}}>
              {[
                {emoji:"📅",label:"Date",val:fmtDate(event.date)},
                {emoji:"📍",label:"Lieu",val:event.location},
                {emoji:"👤",label:"Organisateur",val:event.organizer},
                {emoji:"💰",label:"Prix",val:priceDisplay(event.price)},
              ].map(({emoji,label,val})=>(
                <div key={label} style={{background:"#f8f8f8",borderRadius:14,padding:"12px 14px"}}>
                  <p style={{fontSize:11,fontWeight:700,color:"#999",textTransform:"uppercase",margin:"0 0 2px"}}>{emoji} {label}</p>
                  {label==="Organisateur" && organizerProfile ? (
                    <button
                      type="button"
                      onClick={onOrganizerClick}
                      aria-label={`Voir le profil de ${organizerProfile.name}`}
                      style={{display:"flex",width:"100%",alignItems:"center",justifyContent:"space-between",gap:10,background:"transparent",border:"none",padding:0,textAlign:"left",cursor:"pointer",color:"#333"}}
                    >
                      <span style={{fontSize:14,fontWeight:700,lineHeight:1.35}}>{val}</span>
                      <span style={{flexShrink:0,color:RED,fontSize:12,fontWeight:800}}>Voir le profil →</span>
                    </button>
                  ) : (
                    <p style={{fontSize:14,fontWeight:600,color:"#333",margin:0}}>{val}</p>
                  )}
                </div>
              ))}
            </div>

            {count>0 && <p style={{fontSize:13,color:"#888",marginBottom:16}}>👀 {count} personne{count>1?"s":""} intéressée{count>1?"s":""}</p>}

            {/* Description */}
            {event.description && <p style={{fontSize:14,color:"#555",lineHeight:1.6,marginBottom:20}}>{event.description}</p>}

            {officialPartnerPosters.length>1 && (
              <div style={{marginBottom:20}}>
                <p style={{fontWeight:800,fontSize:14,color:"#333",margin:"0 0 10px"}}>🖼️ Affiches officielles RNS</p>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
                  {officialPartnerPosters.map((url,index)=><img key={url} src={url} alt={`${index===0?"Journée portes ouvertes":"Soirée"} — affiche officielle RNS`} style={{width:"100%",maxHeight:isMobile?460:400,objectFit:"contain",background:"#f6f6f6",borderRadius:14,border:"1px solid #ececec"}}/>)}
                </div>
              </div>
            )}

            {/* Map */}
            <div style={{borderRadius:16,overflow:"hidden",marginBottom:20,height:200}}>
              <iframe title="map" src={`https://maps.google.com/maps?q=${encodeURIComponent(event.lat&&event.lng?`${event.lat},${event.lng}`:(event.address||event.location))}&output=embed`} style={{width:"100%",height:"100%",border:"none"}}/>
            </div>

            {/* Media */}
            {EVENT_MEDIA_ENABLED && event.mediaUrls?.length>0 && (
              <div style={{marginBottom:20}}>
                <p style={{fontWeight:700,fontSize:14,color:"#333",marginBottom:10}}>📸 Photos & vidéos</p>
                <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
                  {event.mediaUrls.map((url,i)=>(
                    <div key={i} style={{flexShrink:0,width:160,height:110,borderRadius:12,overflow:"hidden"}}>
                      {isYoutube(url) ? (
                        <iframe src={url.replace('watch?v=','embed/')} style={{width:"100%",height:"100%",border:"none"}} title={`media-${i}`}/>
                      ) : (
                        <img src={url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            {(eventOfficialSourceUrl(event)||eventUpdatesUrl(event)) && (
              <div style={{background:"#fff8f0",border:"1px solid #f0dcc5",borderRadius:14,padding:"13px 14px",marginBottom:14}}>
                <p style={{fontSize:12,fontWeight:900,color:"#7b4d1e",margin:"0 0 9px"}}>🔎 Informations officielles de l’événement</p>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {eventOfficialSourceUrl(event) && <a href={eventOfficialSourceUrl(event)} target="_blank" rel="noopener noreferrer" style={{background:WHITE,color:"#1565c0",border:"1px solid #d7e3f5",borderRadius:10,padding:"9px 12px",fontSize:12,fontWeight:800,textDecoration:"none"}}>📣 Voir l’annonce officielle · {sourceHost(eventOfficialSourceUrl(event))} ↗</a>}
                  {eventUpdatesUrl(event) && eventUpdatesUrl(event)!==eventOfficialSourceUrl(event) && <a href={eventUpdatesUrl(event)} target="_blank" rel="noopener noreferrer" style={{background:WHITE,color:GREEN,border:"1px solid #cfe6d8",borderRadius:10,padding:"9px 12px",fontSize:12,fontWeight:800,textDecoration:"none"}}>🔔 Suivre les actualités · {sourceHost(eventUpdatesUrl(event))} ↗</a>}
                </div>
              </div>
            )}
            <div style={{background:"#f7faf8",border:"1px solid #d9eadf",borderRadius:12,padding:"11px 13px",marginBottom:14,fontSize:12,color:"#4f6256",lineHeight:1.5}}>
              <b>Plateforme indépendante.</b> Sauf mention contraire, Malagasy Events n’est ni l’organisateur ni le vendeur des billets. Vérifiez les informations auprès de la source officielle.
              <div style={{marginTop:6}}><a href="/mes-droits" style={{color:GREEN,fontWeight:800}}>Signaler une erreur · Revendiquer cette fiche · Demander un retrait</a></div>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:20}}>
              <button onClick={toggleInterest} style={{background:interested?"#e6f4ed":RED,color:interested?GREEN:WHITE,fontWeight:700,fontSize:13,padding:"10px 18px",borderRadius:12,border:"none",cursor:"pointer"}}>
                {interested?"✓ Intéressé(e)":"👀 Je suis intéressé(e)"}
              </button>
              <button onClick={()=>downloadICS(event)} style={{background:"#f5f5f5",color:"#333",fontWeight:700,fontSize:13,padding:"10px 14px",borderRadius:12,border:"none",cursor:"pointer"}}>📅 Calendrier</button>
              {!isPast(event.date) && <button onClick={()=>setReminder(true)} style={{background:"#f5f5f5",color:"#333",fontWeight:700,fontSize:13,padding:"10px 14px",borderRadius:12,border:"none",cursor:"pointer"}}>🔔 Rappel</button>}
              <button onClick={()=>setShowShare(true)} style={{background:"#f5f5f5",color:"#333",fontWeight:700,fontSize:13,padding:"10px 14px",borderRadius:12,border:"none",cursor:"pointer"}}>📤 Partager</button>
              {canEdit && <button onClick={()=>setEditing(true)} style={{background:'#e6f4ed',color:GREEN,fontWeight:800,fontSize:13,padding:'10px 14px',borderRadius:12,border:'none',cursor:'pointer'}}>✏️ Modifier</button>}
              {event.partner && !isPast(event.date) && <button onClick={()=>user?setShowTicket(true):onAuthRequired()} style={{background:"linear-gradient(135deg,#b8860b,#e6b31e)",color:WHITE,fontWeight:800,fontSize:13,padding:"10px 18px",borderRadius:12,border:"none",cursor:"pointer"}}>🎟️ Mon billet QR</button>}
              {BILLETTERIE_ACTIVE && isVerifiedTicketUrl(eventTicketUrl(event))
                ? <a href={eventTicketUrl(event)} target="_blank" rel="noreferrer" style={{background:GREEN,color:WHITE,fontWeight:700,fontSize:13,padding:"10px 18px",borderRadius:12,textDecoration:"none"}}>🎟️ Acheter mes billets</a>
                : <span style={{background:"#f0f0f0",color:"#999",fontWeight:700,fontSize:13,padding:"10px 18px",borderRadius:12,display:"inline-block"}}>🎟️ Billetterie arrive bientôt pour cet événement</span>}
            </div>
            </>)}
          </div>
        </div>
      </div>
      {showShare && <ShareMenu ev={event} onClose={()=>setShowShare(false)}/>}
      {showReminder && <ReminderModal ev={event} onClose={()=>setReminder(false)}/>}
      {showTicket && <TicketModal event={event} user={user} onAuthRequired={onAuthRequired} onClose={()=>setShowTicket(false)}/>} 
      {editing && <EventEditModal event={event} onClose={()=>setEditing(false)} onSaved={updated=>onUpdated?.(updated)}/>} 
    </>
  )
}

/* ── AdminPanel ───────────────────────────────────── */
function AdminPanel({ events, setEvents, videos, setVideos, gastro, setGastro, orgas, setOrgas, lieux, setLieux, onClose }) {
  const GASTRO_EMPTY = {name:"",type:"Restaurant",region:"",city:"",address:"",phone:"",site:"",fb:"",insta:"",tiktok:"",contact:"",note:"",lat:null,lng:null,owner_username:"",plan:"free"}
  const [gEditId,setGEditId] = useState(null)
  const [gForm,setGForm]     = useState(GASTRO_EMPTY)
  const saveGastro = async () => {
    const payload = {...gForm}; delete payload.id
    payload.lat = payload.lat===""||payload.lat===null?null:+payload.lat
    payload.lng = payload.lng===""||payload.lng===null?null:+payload.lng
    payload.plan = payload.plan||'free'
    const gOwner = (payload.owner_username||"").trim(); delete payload.owner_username
    if (gOwner) {
      const {data:prof} = await supabase.from('profiles').select('id').eq('username',gOwner).maybeSingle()
      if (prof) payload.owner_id = prof.id
      else { alert("⚠️ Aucun membre trouvé avec le pseudo « "+gOwner+" » — fiche sauvegardée sans propriétaire."); payload.owner_id = null }
    }
    if (gEditId==="new") {
      const {data,error} = await supabase.from('gastro').insert(payload).select().single()
      if (error) { alert("⚠️ Ajout local seulement ("+error.message+")"); setGastro(g=>[...g,{...payload,id:Date.now()}]) }
      else setGastro(g=>[...g,data])
    } else {
      setGastro(g=>g.map(x=>x.id===gEditId?{...payload,id:gEditId}:x))
      await adminSave(supabase.from('gastro').update(payload).eq('id',gEditId))
    }
    setGEditId(null)
  }
  const delGastro = async id => { setGastro(g=>g.filter(x=>x.id!==id)); await adminSave(supabase.from('gastro').delete().eq('id',id)) }
  const ORGA_EMPTY = {name:"",type:"Association",city:"",region:"",followers:"",note:"",fb:"",insta:"",site:"",contact:"",owner_username:"",plan:"free",plan_until:""}
  const [oEditId,setOEditId] = useState(null)
  const [oForm,setOForm]     = useState(ORGA_EMPTY)
  const saveOrga = async () => {
    const payload = {...oForm}; delete payload.id
    payload.plan = payload.plan||'free'
    payload.plan_until = payload.plan_until||null
    const ownerName = (payload.owner_username||"").trim(); delete payload.owner_username
    if (ownerName) {
      const {data:prof} = await supabase.from('profiles').select('id').eq('username',ownerName).maybeSingle()
      if (prof) payload.owner_id = prof.id
      else { alert("⚠️ Aucun membre trouvé avec le pseudo « "+ownerName+" » — fiche sauvegardée sans propriétaire."); payload.owner_id = null }
    }
    if (oEditId==="new") {
      const {data,error} = await supabase.from('organisateurs').insert(payload).select().single()
      if (error) { alert("⚠️ Ajout local seulement ("+error.message+")"); setOrgas(o=>[...o,{...payload,id:Date.now()}]) }
      else setOrgas(o=>[...o,data])
    } else {
      setOrgas(o=>o.map(x=>x.id===oEditId?{...x,...payload,id:oEditId}:x))
      await adminSave(supabase.from('organisateurs').update(payload).eq('id',oEditId))
    }
    setOEditId(null)
  }
  const delOrga = async id => { setOrgas(o=>o.filter(x=>x.id!==id)); await adminSave(supabase.from('organisateurs').delete().eq('id',id)) }
  const LIEU_EMPTY = {category:"eglise",name:"",denom:"",city:"",address:"",followers:"",note:"",fb:"",insta:"",site:"",contact:""}
  const [lEditId,setLEditId] = useState(null)
  const [lForm,setLForm]     = useState(LIEU_EMPTY)
  const saveLieu = async () => {
    const payload = {...lForm}; delete payload.id
    if (lEditId==="new") {
      const {data,error} = await supabase.from('lieux').insert(payload).select().single()
      if (error) { alert("⚠️ Ajout local seulement ("+error.message+")"); setLieux(l=>[...l,{...payload,id:Date.now()}]) }
      else setLieux(l=>[...l,data])
    } else {
      setLieux(l=>l.map(x=>x.id===lEditId?{...x,...payload,id:lEditId}:x))
      await adminSave(supabase.from('lieux').update(payload).eq('id',lEditId))
    }
    setLEditId(null)
  }
  const delLieu = async id => { setLieux(l=>l.filter(x=>x.id!==id)); await adminSave(supabase.from('lieux').delete().eq('id',id)) }
  const [tab,setTab]           = useState("dashboard")
  const [stats,setStats]       = useState({})
  const [users,setUsers]       = useState([])
  const [userSearch,setUserSearch] = useState("")
  const [allPosts,setAllPosts] = useState([])
  const [allCmts,setAllCmts]   = useState([])
  const [reminders,setReminders] = useState([])
  const [submissions,setSubmissions] = useState([])
  const [reports,setReports]   = useState([])
  const [privacyRequests,setPrivacyRequests] = useState([])
  const [visualLicenses,setVisualLicenses] = useState([])
  const [quarantinedVisuals,setQuarantinedVisuals] = useState([])
  const [auditLog,setAuditLog] = useState([])
  const [messageArchive,setMessageArchive] = useState([])
  const [messageArchiveError,setMessageArchiveError] = useState("")
  const [adminTasks,setAdminTasks] = useState([])
  const [trafficRows,setTrafficRows] = useState([])
  const [trafficLifetime,setTrafficLifetime] = useState(null)
  const [trafficTruncated,setTrafficTruncated] = useState(false)
  const [trafficRange,setTrafficRange] = useState(30)
  const [trafficPageDetail,setTrafficPageDetail] = useState(null)
  const [trafficPageSearch,setTrafficPageSearch] = useState("")
  const [trafficDayDetail,setTrafficDayDetail] = useState(null)
  const [trafficVisitorDetail,setTrafficVisitorDetail] = useState(null)
  const [excludeMyTraffic,setExcludeMyTraffic] = useState(()=>localStorage.getItem('mev_exclude_my_traffic')!=='false')
  const [sportCandidates,setSportCandidates] = useState([])
  const [sportCandidatesError,setSportCandidatesError] = useState("")
  const [sportSearch,setSportSearch] = useState("")
  const [taskTitle,setTaskTitle] = useState("")
  const [bannerText,setBannerText] = useState("")
  const [bannerSaved,setBannerSaved] = useState(false)
  const [editId,setEditId]     = useState(null)
  const [editForm,setEditForm] = useState({})
  const [ticketCode,setTicketCode] = useState("")
  const [ticketResult,setTicketResult] = useState(null)
  const validateTicket = async () => {
    const raw = ticketCode.trim().replace(/^MEV-TICKET:/i,"").trim()
    if (!raw) return
    const {data,error} = await supabase.from('tickets').select('*, profiles(username)').eq('code',raw).maybeSingle()
    if (error) { setTicketResult({type:"err",msg:error.message}); return }
    if (!data) { setTicketResult({type:"err",msg:"Billet introuvable — code invalide."}); return }
    if (data.used) { setTicketResult({type:"used",msg:`Déjà utilisé le ${new Date(data.used_at).toLocaleString('fr-FR')} (@${data.profiles?.username||"?"})`}); return }
    const upd = await supabase.from('tickets').update({used:true,used_at:new Date().toISOString()}).eq('id',data.id)
    if (upd.error) { setTicketResult({type:"err",msg:upd.error.message}); return }
    setTicketResult({type:"ok",msg:`✅ Valide ! Entrée autorisée pour @${data.profiles?.username||"membre"}.`})
    setTicketCode("")
  }
  const evtImgImport = (
    <div style={{background:"#fff8e8",border:"1px solid #eed89c",borderRadius:10,padding:"10px 12px",fontSize:12,color:"#6b5419"}}>🛡️ Affiches désactivées jusqu’à vérification d’une autorisation écrite.</div>
  )
  const [showVForm,setShowVForm] = useState(false)
  const [vForm,setVForm]       = useState({title:"",youtubeUrl:"",thumbnail:"",city:"",date:"",description:"",isTeaser:false,type:"aftermovie",views:0})

  useEffect(()=>{ loadTab(tab) },[tab])
  useEffect(()=>{ if(tab==="traffic") loadTab("traffic") },[trafficRange])

  const loadTab = async t => {
    if (t==="orgas") loadClaims()
    if (t==="perks") loadPerks()
    if (t==="dashboard" || t==="analytics") {
      const [
        {count:members},{count:posts},{count:cmts},{count:interests},
        {count:messages},{count:follows},{count:rems},{count:openReports},
        {count:pendingSubmissions},{count:openRights},{count:pendingClaims},{count:pendingClassifieds}
      ] = await Promise.all([
        supabase.from('profiles').select('*',{count:'exact',head:true}),
        supabase.from('posts').select('*',{count:'exact',head:true}),
        supabase.from('post_comments').select('*',{count:'exact',head:true}),
        supabase.from('event_interests').select('*',{count:'exact',head:true}),
        supabase.from('messages').select('*',{count:'exact',head:true}),
        supabase.from('follows').select('*',{count:'exact',head:true}),
        supabase.from('email_reminders').select('*',{count:'exact',head:true}),
        supabase.from('reports').select('*',{count:'exact',head:true}).eq('status','open'),
        supabase.from('event_submissions').select('*',{count:'exact',head:true}).eq('status','pending'),
        supabase.from('privacy_requests').select('*',{count:'exact',head:true}).in('status',['received','identity_check','in_progress']),
        supabase.from('orga_claims').select('*',{count:'exact',head:true}),
        supabase.from('classifieds').select('*',{count:'exact',head:true}).eq('status','pending'),
      ])
      setStats({members,posts,cmts,interests,messages,follows,rems,evts:events.length,openReports,pendingSubmissions,openRights,pendingClaims,pendingClassifieds})
    } else if (t==="users") {
      const {data} = await supabase.from('profiles').select('*').order('created_at',{ascending:false}).limit(200)
      setUsers(data||[])
    } else if (t==="posts") {
      const {data} = await supabase.from('posts').select('*,profiles(username)').order('created_at',{ascending:false}).limit(100)
      setAllPosts(data||[])
    } else if (t==="comments") {
      const {data} = await supabase.from('post_comments').select('*,profiles(username)').order('created_at',{ascending:false}).limit(200)
      setAllCmts(data||[])
    } else if (t==="orgaclaims") {
      /* chargé avec l'onglet orgas */
    } else if (t==="entraide") {
      let {data,error} = await supabase.from('entraide').select('*,profiles(username)').order('created_at',{ascending:false}).limit(200)
      if (error) { const r2 = await supabase.from('entraide').select('*').order('created_at',{ascending:false}).limit(200); data = r2.data }
      setHelpAds(data||[])
    } else if (t==="actus") {
      let {data,error} = await supabase.from('orga_posts').select('*,profiles(username),organisateurs(name)').order('created_at',{ascending:false}).limit(200)
      if (error) { const r2 = await supabase.from('orga_posts').select('*').order('created_at',{ascending:false}).limit(200); data = r2.data }
      setActus(data||[])
    } else if (t==="reminders") {
      const {data} = await supabase.from('email_reminders').select('*').order('created_at',{ascending:false}).limit(200)
      setReminders(data||[])
    } else if (t==="revenus") {
      const {data,error} = await supabase.from('profiles').select('*').limit(500)
      if (error) console.error("Lecture des profils (forfaits) :", error.message)
      setUsers((data||[]).sort((a,b)=>String(b.created_at||"").localeCompare(String(a.created_at||""))))
    } else if (t==="submissions") {
      const {data} = await supabase.from('event_submissions').select('*').order('created_at',{ascending:false}).limit(200)
      setSubmissions(data||[])
    } else if (t==="reports") {
      const {data} = await supabase.from('reports').select('*, profiles(username)').order('created_at',{ascending:false}).limit(200)
      setReports(data||[])
    } else if (t==="message_archive") {
      const {data,error}=await supabase.rpc('admin_message_archive',{limit_count:200})
      setMessageArchive(data||[]);setMessageArchiveError(error?.message||"")
    } else if (t==="banner") {
      const {data} = await supabase.from('site_settings').select('value').eq('key','banner').maybeSingle()
      setBannerText(data?.value||"")
    } else if (t==="rights") {
      const {data} = await supabase.from('privacy_requests').select('*').order('created_at',{ascending:false}).limit(300)
      setPrivacyRequests(data||[])
    } else if (t==="licenses") {
      const [{data:licenses},{data:quarantine}] = await Promise.all([
        supabase.from('event_visual_licenses').select('*').order('created_at',{ascending:false}).limit(300),
        supabase.from('event_visuals_quarantine').select('*').order('quarantined_at',{ascending:false}).limit(300),
      ])
      setVisualLicenses(licenses||[]); setQuarantinedVisuals(quarantine||[])
    } else if (t==="audit") {
      const {data} = await supabase.from('admin_audit_log').select('*').order('created_at',{ascending:false}).limit(300)
      setAuditLog(data||[])
    } else if (t==="tasks") {
      const {data} = await supabase.from('admin_tasks').select('*').order('created_at',{ascending:false}).limit(300)
      setAdminTasks(data||[])
    } else if (t==="traffic") {
      const since=new Date(Date.now()-trafficRange*86400000).toISOString()
      const [{data,error,truncated},{data:lifetime,error:lifetimeError}]=await Promise.all([
        fetchAnalyticsRows(since),
        supabase.rpc('analytics_lifetime_totals')
      ])
      if(error) console.warn('Tracking non activé :',error.message)
      setTrafficRows(data||[])
      setTrafficTruncated(!!truncated)
      const totals=Array.isArray(lifetime)?lifetime[0]:lifetime
      setTrafficLifetime(lifetimeError?null:(totals||null))
    } else if (t==="sportsdb") {
      const {data,error}=await supabase.from('sport_club_candidates').select('*').order('name')
      setSportCandidates(data||[]);setSportCandidatesError(error?.message||"")
    }
  }

  const audit = async (action,targetType,targetId,details={}) => {
    await supabase.from('admin_audit_log').insert({action,target_type:targetType,target_id:String(targetId||""),details})
  }
  const updatePrivacyStatus = async (item,status) => {
    const patch = {status,updated_at:new Date().toISOString(),completed_at:status==="completed"?new Date().toISOString():null}
    const {error} = await supabase.from('privacy_requests').update(patch).eq('id',item.id)
    if (error) return alert("⚠️ "+error.message)
    setPrivacyRequests(list=>list.map(x=>x.id===item.id?{...x,...patch}:x))
    audit("privacy_request_status","privacy_request",item.id,{status})
  }
  const addAdminTask = async () => {
    if (!taskTitle.trim()) return
    const {data,error} = await supabase.from('admin_tasks').insert({title:taskTitle.trim(),status:'todo',priority:'normal'}).select().single()
    if (error) return alert("⚠️ "+error.message)
    setAdminTasks(list=>[data,...list]); setTaskTitle("")
  }
  const updateAdminTask = async (item,status) => {
    const patch={status,completed_at:status==='done'?new Date().toISOString():null}
    const {error}=await supabase.from('admin_tasks').update(patch).eq('id',item.id)
    if(error) return alert("⚠️ "+error.message)
    setAdminTasks(list=>list.map(x=>x.id===item.id?{...x,...patch}:x))
  }

  const setUserPlan = async (id,plan) => {
    setUsers(list=>list.map(u=>u.id===id?{...u,plan}:u))
    const {error} = await supabase.from('profiles').update({plan}).eq('id',id)
    if (error) alert("⚠️ "+error.message)
  }
  const setUserFanBadge = async (id,val) => {
    const fan_badge = val==="auto" ? null : val
    setUsers(list=>list.map(u=>u.id===id?{...u,fan_badge}:u))
    const {error} = await supabase.from('profiles').update({fan_badge}).eq('id',id)
    if (error) alert("⚠️ "+error.message)
  }
  const saveBanner = async () => {
    await supabase.from('site_settings').upsert({key:'banner',value:bannerText,updated_at:new Date().toISOString()})
    setBannerSaved(true); setTimeout(()=>setBannerSaved(false),2000)
  }
  const approveSubmission = async s => {
    const payload = {title:s.title,date:s.date,city:s.city,location:s.location,address:s.address||s.location,lat:s.lat,lng:s.lng,category:s.category,price:s.price,organizer:s.organizer,ticketUrl:s.ticket_url,official_source_url:s.official_source_url||'',updates_url:s.updates_url||'',image:"",description:s.description,mediaUrls:[],createdAt:new Date().toISOString()}
    const {data,error} = await supabase.from('events').insert(payload).select().single()
    if (error) { alert("⚠️ "+error.message); return }
    const sync=await ensureRepeatOrganizerProfile({event:data,events,orgas,contacts:s})
    if (sync?.organizer) {
      setOrgas(list=>list.some(o=>String(o.id)===String(sync.organizer.id))?list.map(o=>String(o.id)===String(sync.organizer.id)?sync.organizer:o):[...list,sync.organizer])
      setEvents(list=>linkEventsToOrganizer([...list,data],data.organizer,sync.organizer.id))
    } else setEvents(list=>[...list,data])
    if (sync?.error) alert("Événement publié, mais la fiche organisateur n’a pas pu être créée : "+sync.error.message)
    await supabase.from('event_submissions').update({status:'approved'}).eq('id',s.id)
    setSubmissions(list=>list.map(x=>x.id===s.id?{...x,status:'approved'}:x))
  }
  const rejectSubmission = async id => { await supabase.from('event_submissions').update({status:'rejected'}).eq('id',id); setSubmissions(l=>l.map(x=>x.id===id?{...x,status:'rejected'}:x)) }
  const delSubmission = async id => { await supabase.from('event_submissions').delete().eq('id',id); setSubmissions(l=>l.filter(x=>x.id!==id)) }
  const resolveReport = async id => { await supabase.from('reports').update({status:'resolved'}).eq('id',id); setReports(l=>l.map(x=>x.id===id?{...x,status:'resolved'}:x)) }
  const delReportedContent = async r => {
    const table = r.target_type==='post'?'posts':r.target_type==='post_comment'?'post_comments':'comments'
    await supabase.from(table).delete().eq('id',r.target_id)
    await supabase.from('reports').update({status:'resolved'}).eq('id',r.id)
    setReports(l=>l.map(x=>x.id===r.id?{...x,status:'resolved'}:x))
    alert("Contenu supprimé et signalement classé.")
  }
  const duplicateEvent = ev => {
    const d = new Date(ev.date+"T00:00:00"); d.setFullYear(d.getFullYear()+1)
    setEditId("new"); setEditForm({...ev,id:undefined,date:d.toISOString().slice(0,10),featured:false})
    setTab("events")
  }
  const toggleFeatured = async (ev) => {
    const val = !ev.featured
    const featured_until = val ? new Date(Date.now()+7*86400000).toISOString() : null
    setEvents(list=>list.map(x=>x.id===ev.id?{...x,featured:val,featured_until}:x))
    await adminSave(supabase.from('events').update({featured:val,featured_until}).eq('id',ev.id))
  }
  // Épinglage générique (gastro, organisateurs, vidéos)
  const togglePin = async (table, item, setList) => {
    const val = !item.featured
    setList(list=>list.map(x=>x.id===item.id?{...x,featured:val}:x))
    await adminSave(supabase.from(table).update({featured:val}).eq('id',item.id))
  }
  const pinBtn = on => (
    <button onClick={on.onClick} title="Épingler / à la une" style={{background:on.active?"#faf6ec":"#f0f0f0",color:on.active?"#b8860b":"#aaa",fontWeight:700,fontSize:11,padding:"5px 10px",borderRadius:99,border:"none",cursor:"pointer",flexShrink:0}}>⭐</button>
  )
  const exportMembersCsv = () => {
    supabase.from('profiles').select('*').limit(1000).then(({data})=>{
      const rows = [["pseudo","email","code_postal","pack","membre","inscrit_le"], ...(data||[]).map(u=>[u.username||"",u.email||"",u.code_postal||"",u.plan||"free",u.is_member?"oui":"non",(u.created_at||"").slice(0,10)])]
      const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n")
      const url = URL.createObjectURL(new Blob(["﻿"+csv],{type:"text/csv"}))
      const a=document.createElement("a"); a.href=url; a.download="membres-malagasy-events.csv"; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000)
    })
  }

  const banUser   = async (id,banned) => { const {error}=await supabase.from('profiles').update({is_banned:!banned}).eq('id',id); if(error){alert("⚠️ "+error.message);return} setUsers(u=>u.map(p=>p.id===id?{...p,is_banned:!banned}:p)) }
  const delPost   = async id => { const {error}=await supabase.from('posts').delete().eq('id',id); if(error){alert("⚠️ "+error.message);return} setAllPosts(p=>p.filter(x=>x.id!==id)) }
  const delCmt    = async id => { const {error}=await supabase.from('post_comments').delete().eq('id',id); if(error){alert("⚠️ "+error.message);return} setAllCmts(c=>c.filter(x=>x.id!==id)) }
  const delEvent  = async id => { setEvents(e=>e.filter(x=>x.id!==id)); await adminSave(supabase.from('events').delete().eq('id',id)) }
  const delVideo  = async id => { setVideos(v=>v.filter(x=>x.id!==id)); await adminSave(supabase.from('videos').delete().eq('id',id)) }
  const saveEvent = async () => {
    const payload = {...editForm,image:"",mediaUrls:[]}; delete payload.id
    if (editId==="new") {
      const {data,error} = await supabase.from('events').insert({...payload,createdAt:new Date().toISOString()}).select().single()
      if (error) { alert("⚠️ Ajout local seulement ("+error.message+")"); setEvents(e=>[...e,{...payload,id:Date.now()}]) }
      else {
        const sync=await ensureRepeatOrganizerProfile({event:data,events,orgas})
        if (sync?.organizer) {
          setOrgas(list=>list.some(o=>String(o.id)===String(sync.organizer.id))?list.map(o=>String(o.id)===String(sync.organizer.id)?sync.organizer:o):[...list,sync.organizer])
          setEvents(list=>linkEventsToOrganizer([...list,data],data.organizer,sync.organizer.id))
        } else setEvents(list=>[...list,data])
        if (sync?.error) alert("Événement créé, mais la fiche organisateur n’a pas pu être créée : "+sync.error.message)
      }
    } else {
      setEvents(e=>e.map(x=>x.id===editId?{...editForm,id:editId}:x))
      await adminSave(supabase.from('events').update(payload).eq('id',editId))
    }
    setEditId(null)
  }
  const addVideo  = async () => {
    const {data,error} = await supabase.from('videos').insert(vForm).select().single()
    if (error) { alert("⚠️ Ajout local seulement ("+error.message+")"); setVideos(v=>[...v,{...vForm,id:Date.now()}]) }
    else setVideos(v=>[...v,data])
    setVForm({title:"",youtubeUrl:"",thumbnail:"",city:"",date:"",description:"",isTeaser:false,type:"aftermovie",views:0}); setShowVForm(false)
  }

  const filtered  = users.filter(u=>!userSearch||(u.username||"").toLowerCase().includes(userSearch.toLowerCase())||(u.email||"").toLowerCase().includes(userSearch.toLowerCase()))
  const [helpAds,setHelpAds] = useState([])
  const [claims,setClaims]   = useState([])
  const PERK_EMPTY = {partner:"",offer:"",description:"",code:"",category:"Restaurant",city:"",active:false}
  const [perksAdm,setPerksAdm] = useState([])
  const [pkEditId,setPkEditId] = useState(null)
  const [pkForm,setPkForm]     = useState(PERK_EMPTY)
  const loadPerks = async () => { const {data} = await supabase.from('perks').select('*').order('id'); setPerksAdm(data||[]) }
  const savePerk = async () => {
    const payload = {...pkForm}; delete payload.id
    if (pkEditId==="new") {
      const {data,error} = await supabase.from('perks').insert(payload).select().single()
      if (error) alert("⚠️ "+error.message); else setPerksAdm(l=>[...l,data])
    } else {
      setPerksAdm(l=>l.map(x=>x.id===pkEditId?{...x,...payload,id:pkEditId}:x))
      await adminSave(supabase.from('perks').update(payload).eq('id',pkEditId))
    }
    setPkEditId(null)
  }
  const delPerk = async id => { setPerksAdm(l=>l.filter(x=>x.id!==id)); await adminSave(supabase.from('perks').delete().eq('id',id)) }
  const togglePerk = async pk => { setPerksAdm(l=>l.map(x=>x.id===pk.id?{...x,active:!pk.active}:x)); await adminSave(supabase.from('perks').update({active:!pk.active}).eq('id',pk.id)) }
  const loadClaims = async () => {
    const {data} = await supabase.from('orga_claims').select('*,profiles(username,email),organisateurs(name)').order('created_at',{ascending:false})
    setClaims(data||[])
  }
  const approveClaim = async c => {
    const ok = await adminSave(supabase.from('organisateurs').update({owner_id:c.user_id}).eq('id',c.orga_id))
    if (ok!==null) {
      await supabase.from('orga_claims').delete().eq('id',c.id)
      setOrgas(o=>o.map(x=>x.id===c.orga_id?{...x,owner_id:c.user_id}:x))
      setClaims(list=>list.filter(x=>x.id!==c.id))
    }
  }
  const rejectClaim = async c => { await adminSave(supabase.from('orga_claims').delete().eq('id',c.id)); setClaims(list=>list.filter(x=>x.id!==c.id)) }
  const [actus,setActus]     = useState([])
  const delHelp = async id => { setHelpAds(h=>h.filter(x=>x.id!==id)); await adminSave(supabase.from('entraide').delete().eq('id',id)) }
  const delActu = async id => { setActus(a=>a.filter(x=>x.id!==id)); await adminSave(supabase.from('orga_posts').delete().eq('id',id)) }

  const TAB_GROUPS = [
    {name:"Pilotage",tabs:[{id:"dashboard",l:"📊 Vue générale"},{id:"analytics",l:"📈 Communauté"},{id:"traffic",l:"🌐 Trafic & réseaux"},{id:"tasks",l:"✅ Tâches"},{id:"audit",l:"🧾 Journal"}]},
    {name:"Communauté",tabs:[{id:"users",l:"👥 Membres"},{id:"posts",l:"📝 Posts"},{id:"comments",l:"💬 Commentaires"},{id:"classifieds",l:"📌 Petites annonces"},{id:"entraide",l:"🤝 Entraide"},{id:"actus",l:"📣 Actus orgas"}]},
    {name:"Événements",tabs:[{id:"events",l:"📅 Événements"},{id:"submissions",l:"📥 Soumissions"},{id:"billets",l:"🎟️ Billets"},{id:"reminders",l:"🔔 Rappels"}]},
    {name:"Annuaire",tabs:[{id:"orgas",l:"🎪 Organisateurs"},{id:"sportsdb",l:"🏀 Base sport"},{id:"gastro",l:"🍽️ Gastronomie"},{id:"lieux",l:"📍 Lieux"},{id:"videos",l:"🎬 Vidéos"}]},
    {name:"Sécurité & droits",tabs:[{id:"reports",l:"🚩 Signalements"},{id:"message_archive",l:"🔒 Archives messages"},{id:"rights",l:"🛡️ Demandes RGPD"},{id:"licenses",l:"©️ Autorisations"}]},
    {name:"Activité",tabs:[{id:"revenus",l:"💰 Forfaits"},{id:"perks",l:"💜 Avantages"},{id:"banner",l:"📢 Communication"}]},
  ]
  const TABS = TAB_GROUPS.flatMap(g=>g.tabs)

  const inp = {border:"1.5px solid #e5e5e5",borderRadius:10,padding:"8px 12px",fontSize:13,outline:"none",width:"100%",boxSizing:"border-box"}
  const row = {display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid #f5f5f5"}
  const delBtn = onClick => <button onClick={onClick} style={{background:"#fde8ec",color:RED,fontWeight:700,fontSize:11,padding:"4px 10px",borderRadius:99,border:"none",cursor:"pointer",flexShrink:0}}>🗑️ Sup</button>

  const StatCard = ({n,l,emoji}) => (
    <div style={{background:WHITE,borderRadius:16,padding:"20px 16px",textAlign:"center",boxShadow:"0 2px 12px rgba(0,0,0,0.07)"}}>
      <p style={{fontSize:28,margin:"0 0 4px"}}>{emoji}</p>
      <p style={{fontWeight:900,fontSize:28,color:"#111",margin:"0 0 2px"}}>{n??"-"}</p>
      <p style={{fontSize:12,color:"#999",margin:0}}>{l}</p>
    </div>
  )

  return (
    <div style={{position:"fixed",inset:0,background:"#f6f6f6",zIndex:200,display:"flex",flexDirection:"column",fontFamily:"system-ui,sans-serif"}}>
      {/* Header */}
      <div style={{background:"linear-gradient(100deg,#9d0628,#bf0a30)",padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div><h2 style={{color:WHITE,fontWeight:900,fontSize:18,margin:0}}>👑 Super Admin — Malagasy Events</h2><p style={{color:"rgba(255,255,255,.75)",fontSize:11,margin:"2px 0 0"}}>Pilotage, communauté, conformité et activité</p></div>
        <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",color:WHITE,fontWeight:800,fontSize:20,padding:"2px 12px",borderRadius:99,border:"none",cursor:"pointer"}}>×</button>
      </div>
      {/* Tabs */}
      <div style={{display:"flex",background:WHITE,borderBottom:"2px solid #f0f0f0",overflowX:"auto",flexShrink:0,padding:"8px 12px",gap:10}}>
        {TAB_GROUPS.map(g=><div key={g.name} style={{borderRight:"1px solid #eee",paddingRight:10,flexShrink:0}}>
          <p style={{fontSize:9,textTransform:"uppercase",letterSpacing:1,color:"#aaa",fontWeight:900,margin:"0 6px 3px"}}>{g.name}</p>
          <div style={{display:"flex",gap:3}}>{g.tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"7px 10px",border:"none",borderRadius:9,cursor:"pointer",fontWeight:800,fontSize:11,background:tab===t.id?"#fde8ec":"transparent",color:tab===t.id?RED:"#777",whiteSpace:"nowrap"}}>{t.l}</button>
          ))}</div>
        </div>)}
      </div>
      {/* Content */}
      <div style={{flex:1,overflowY:"auto",padding:24}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>

          {/* DASHBOARD */}
          {tab==="dashboard" && (
            <div>
              <div style={{background:"linear-gradient(120deg,#111,#343434)",color:WHITE,borderRadius:20,padding:20,marginBottom:18}}>
                <p style={{fontSize:11,fontWeight:900,letterSpacing:1.5,textTransform:"uppercase",color:"#ffd24a",margin:"0 0 5px"}}>Centre de contrôle</p>
                <h3 style={{fontSize:22,margin:"0 0 4px"}}>Bonjour Super Admin 👋</h3>
                <p style={{fontSize:12,color:"#ccc",margin:0}}>Voici ce qui demande votre attention aujourd’hui.</p>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:14}}>
                  {[
                    ["reports",`🚩 ${stats.openReports||0} signalement(s)`],
                    ["submissions",`📥 ${stats.pendingSubmissions||0} soumission(s)`],
                    ["classifieds",`📌 ${stats.pendingClassifieds||0} petite(s) annonce(s)`],
                    ["rights",`🛡️ ${stats.openRights||0} demande(s) RGPD`],
                    ["orgas",`🎪 ${stats.pendingClaims||0} revendication(s)`],
                  ].map(([id,label])=><button key={id} onClick={()=>setTab(id)} style={{background:"rgba(255,255,255,.12)",color:WHITE,border:"1px solid rgba(255,255,255,.18)",borderRadius:99,padding:"8px 12px",fontSize:11,fontWeight:800,cursor:"pointer"}}>{label}</button>)}
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:16}}>
                <StatCard n={stats.members} l="Membres" emoji="👥"/><StatCard n={stats.evts} l="Événements" emoji="📅"/>
                <StatCard n={stats.posts} l="Posts" emoji="📝"/><StatCard n={stats.cmts} l="Commentaires" emoji="💬"/>
                <StatCard n={stats.interests} l="Intérêts" emoji="👀"/><StatCard n={stats.messages} l="Messages" emoji="✉️"/>
                <StatCard n={stats.follows} l="Abonnements" emoji="🔗"/><StatCard n={stats.rems} l="Rappels" emoji="🔔"/>
              </div>
            </div>
          )}

          {tab==="analytics" && (
            <div>
              <h3 style={{margin:"0 0 6px"}}>Statistiques globales</h3>
              <p style={{fontSize:12,color:"#888",margin:"0 0 18px"}}>Vue consolidée de l’audience, du contenu et de l’annuaire.</p>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:16}}>
                <StatCard n={stats.members} l="Membres" emoji="👥"/><StatCard n={stats.evts} l="Événements" emoji="📅"/>
                <StatCard n={stats.posts} l="Publications" emoji="📝"/><StatCard n={stats.cmts} l="Commentaires" emoji="💬"/>
                <StatCard n={stats.interests} l="Intérêts événements" emoji="❤️"/><StatCard n={stats.follows} l="Abonnements" emoji="🔗"/>
                <StatCard n={gastro.length} l="Adresses gastro" emoji="🍽️"/><StatCard n={orgas.length} l="Organisateurs" emoji="🎪"/>
                <StatCard n={lieux.length} l="Lieux" emoji="📍"/><StatCard n={videos.length} l="Vidéos" emoji="🎬"/>
              </div>
              <div style={{background:WHITE,borderRadius:16,padding:16,marginTop:18}}>
                <p style={{fontWeight:900,margin:"0 0 8px"}}>Indicateurs de vigilance</p>
                <p style={{fontSize:13,margin:"5px 0"}}>Signalements ouverts : <b>{stats.openReports||0}</b></p>
                <p style={{fontSize:13,margin:"5px 0"}}>Demandes de droits à traiter : <b>{stats.openRights||0}</b></p>
                <p style={{fontSize:13,margin:"5px 0"}}>Événements proposés en attente : <b>{stats.pendingSubmissions||0}</b></p>
              </div>
            </div>
          )}

          {tab==="traffic" && (()=>{
            const scopedTraffic=excludeMyTraffic&&trackingVisitor?trafficRows.filter(x=>!x.visitor_id||x.visitor_id!==trackingVisitor):trafficRows
            const excludedOwn=trafficRows.filter(x=>x.visitor_id&&x.visitor_id===trackingVisitor).length
            const rawViews=scopedTraffic.filter(x=>x.event_name==='page_view')
            const seenViews=new Set()
            const views=rawViews.filter(x=>{const key=`${x.session_id||'?' }|${x.page_path}|${Math.floor(new Date(x.created_at).getTime()/5000)}`;if(seenViews.has(key))return false;seenViews.add(key);return true})
            const sessions=new Set(views.map(x=>x.session_id).filter(Boolean)).size
            const socialVisits=views.filter(x=>['facebook','instagram','fb','ig'].includes(String(x.source||'').toLowerCase()))
            const socialClicks=scopedTraffic.filter(x=>x.event_name==='outbound_social_click')
            const countBy=(rows,key)=>Object.entries(rows.reduce((a,x)=>{const k=x[key]||'Non renseigné';a[k]=(a[k]||0)+1;return a},{})).sort((a,b)=>b[1]-a[1]).slice(0,8)
            const topPages=countBy(views,'page_path'),sources=countBy(views,'source'),campaigns=countBy(views.filter(x=>x.campaign),'campaign'),devices=countBy(views,'device'),browsers=countBy(views,'browser')
            const dayKey=d=>new Intl.DateTimeFormat('fr-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(d))
            const daily=views.reduce((a,x)=>{const k=dayKey(x.created_at);a[k]=(a[k]||0)+1;return a},{})
            const days=Array.from({length:trafficRange},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(trafficRange-1-i));return dayKey(d)})
            const dailyDetails=days.map(day=>{const rows=views.filter(x=>dayKey(x.created_at)===day);const pageCounts=countBy(rows,'page_path');return {day,rows,pageCounts,pages:rows.length,sessions:new Set(rows.map(x=>x.session_id).filter(Boolean)).size,visitors:new Set(rows.map(x=>x.visitor_id).filter(Boolean)).size,top:pageCounts[0]||null}}).reverse()
            const bestDay=days.reduce((best,d)=>(daily[d]||0)>(daily[best]||0)?d:best,days[0])
            const friendlyPage=p=>p==='/'?'Accueil':p==='/sportifs'?'Sportifs':p==='/tournois'?'Tournois':p==='/gastronomie'?'Gastronomie':p==='/organisateurs'?'Professionnels & associations':p==='/boutiques'?'Boutiques':p.replace(/^\/evenement\//,'Événement : ').replace(/^\//,'')||'Accueil'
            const friendlySource=s=>s==='direct'?'Lien direct ou favori':s==='ig'||s==='instagram'?'Instagram':s==='fb'||s==='facebook'?'Facebook':s==='google.com'?'Google':s
            const avgPages=sessions?Math.round((views.length/sessions)*10)/10:0
            const mainSource=sources[0],mainPage=topPages[0]
            const pageStats=Object.values(views.reduce((all,x)=>{const path=x.page_path||'/';const p=all[path]||(all[path]={path,views:0,sessions:new Set(),visitors:new Set(),sources:{},days:{},last:null});p.views++;if(x.session_id)p.sessions.add(x.session_id);if(x.visitor_id)p.visitors.add(x.visitor_id);const src=friendlySource(x.source||'direct');p.sources[src]=(p.sources[src]||0)+1;const dk=dayKey(x.created_at);p.days[dk]=(p.days[dk]||0)+1;if(!p.last||new Date(x.created_at)>new Date(p.last))p.last=x.created_at;return all},{})).sort((a,b)=>b.views-a.views)
            const visiblePageStats=pageStats.filter(p=>!trafficPageSearch.trim()||friendlyPage(p.path).toLowerCase().includes(trafficPageSearch.trim().toLowerCase()))
            const selectedPage=pageStats.find(p=>p.path===trafficPageDetail)||null
            const selectedDay=dailyDetails.find(d=>d.day===trafficDayDetail)||null
            const visitorAlias=id=>`Visiteur ${String(id||'').replace(/-/g,'').slice(0,6).toUpperCase()||'—'}`
            const visitorStats=Object.values(views.reduce((all,x)=>{if(!x.visitor_id)return all;const v=all[x.visitor_id]||(all[x.visitor_id]={id:x.visitor_id,views:0,sessions:new Set(),days:new Set(),pages:{},sources:{},first:x.created_at,last:x.created_at});v.views++;if(x.session_id)v.sessions.add(x.session_id);v.days.add(dayKey(x.created_at));v.pages[x.page_path||'/']=(v.pages[x.page_path||'/']||0)+1;const src=friendlySource(x.source||'direct');v.sources[src]=(v.sources[src]||0)+1;if(new Date(x.created_at)<new Date(v.first))v.first=x.created_at;if(new Date(x.created_at)>new Date(v.last))v.last=x.created_at;return all},{})).sort((a,b)=>b.views-a.views)
            const selectedVisitor=visitorStats.find(v=>v.id===trafficVisitorDetail)||null
            const returningVisitors=visitorStats.filter(v=>v.days.size>1||v.sessions.size>1).length
            const setOwnTrafficExcluded=value=>{setExcludeMyTraffic(value);localStorage.setItem('mev_exclude_my_traffic',String(value))}
            const copyLink=link=>{navigator.clipboard.writeText(link);alert('Lien copié !')}
            const insta=`${SITE_URL}/?utm_source=instagram&utm_medium=social&utm_campaign=bio`
            const facebook=`${SITE_URL}/?utm_source=facebook&utm_medium=social&utm_campaign=page`
            return <div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,flexWrap:'wrap'}}><div><h3 style={{margin:'0 0 5px'}}>Trafic des {trafficRange} derniers jours</h3><p style={{fontSize:12,color:'#888',margin:'0 0 10px'}}>Jours et heures en heure de Paris. Aucune adresse IP n’est enregistrée.</p><button onClick={()=>setOwnTrafficExcluded(!excludeMyTraffic)} style={{border:`1px solid ${excludeMyTraffic?GREEN:'#ddd'}`,borderRadius:99,padding:'7px 11px',fontWeight:900,cursor:'pointer',background:excludeMyTraffic?'#e8f5ee':WHITE,color:excludeMyTraffic?GREEN:'#666',fontSize:11}}>{excludeMyTraffic?'🙈 Mon appareil est exclu':'👁 Inclure mon appareil'}{excludedOwn?` · ${excludedOwn} action${excludedOwn>1?'s':''}`:''}</button></div><div style={{display:'flex',gap:6}}>{[7,30,90].map(n=><button key={n} onClick={()=>setTrafficRange(n)} style={{border:0,borderRadius:99,padding:'8px 12px',fontWeight:900,cursor:'pointer',background:trafficRange===n?RED:WHITE,color:trafficRange===n?WHITE:'#666'}}>{n} j</button>)}</div></div>
              {trafficLifetime ? <section style={{background:'linear-gradient(135deg,#eaf7f0,#f7fffb)',border:`1px solid #bfe3d0`,borderRadius:18,padding:16,marginBottom:16}}><p style={{fontSize:11,fontWeight:900,color:GREEN,textTransform:'uppercase',letterSpacing:1,margin:'0 0 10px'}}>Compteurs cumulés — ils ne redescendent jamais</p><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:10}}><StatCard n={trafficLifetime.page_views_total??0} l="Pages vues depuis le début" emoji="👀"/><StatCard n={trafficLifetime.visits_total??0} l="Visites depuis le début" emoji="🌐"/><StatCard n={trafficLifetime.visitors_total??0} l="Visiteurs depuis le début" emoji="👤"/></div></section>:<div style={{background:'#fff8e8',border:'1px solid #eed89c',borderRadius:14,padding:13,fontSize:12,color:'#6b5419',marginBottom:16}}>Les compteurs cumulés sont prêts dans le lot Supabase en attente. Jusqu’à son installation, seuls les chiffres de la période ci-dessous sont disponibles.</div>}
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))',gap:14,marginBottom:18}}><StatCard n={views.length} l={`Pages consultées sur ${trafficRange} j`} emoji="👀"/><StatCard n={sessions} l={`Visites sur ${trafficRange} j`} emoji="🌐"/><StatCard n={socialVisits.length} l={`Visites réseaux sur ${trafficRange} j`} emoji="📲"/><StatCard n={socialClicks.length} l={`Clics réseaux sur ${trafficRange} j`} emoji="↗️"/></div>
              {trafficTruncated&&<div role="alert" style={{background:'#fde8ec',border:'1px solid #f5bdc8',borderRadius:12,padding:12,color:RED,fontSize:12,fontWeight:700,marginBottom:16}}>La période dépasse 50 000 actions. Le détail a été plafonné pour protéger l’administration ; les compteurs cumulés restent exacts.</div>}
              <div style={{background:'linear-gradient(120deg,#111,#333)',color:WHITE,borderRadius:18,padding:18,marginBottom:18}}><p style={{color:'#ffd24a',fontWeight:900,fontSize:11,textTransform:'uppercase',letterSpacing:1,margin:'0 0 8px'}}>Ce qu’il faut retenir</p><p style={{fontSize:15,lineHeight:1.7,margin:0}}>Le site a reçu <b>{sessions} visite{sessions>1?'s':''}</b> sur cette période. Chaque visite consulte en moyenne <b>{avgPages} page{avgPages>1?'s':''}</b>. La page la plus regardée est <b>{mainPage?friendlyPage(mainPage[0]):'—'}</b>{mainPage?` (${mainPage[1]} vues)`:''}. La principale provenance est <b>{mainSource?friendlySource(mainSource[0]):'—'}</b>. Le meilleur jour est le <b>{new Date(bestDay+'T12:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'long'})}</b> avec <b>{daily[bestDay]||0} vue{(daily[bestDay]||0)>1?'s':''}</b>.</p></div>
              {trafficRows.length===0&&<div style={{background:'#fff8e8',border:'1px solid #eed89c',borderRadius:14,padding:14,fontSize:12,color:'#6b5419',marginBottom:16}}>Le tableau commencera à afficher les visites après l’installation du SQL de tracking. Les nouvelles visites seront ensuite comptées automatiquement.</div>}
              <div style={{background:WHITE,borderRadius:16,padding:18,marginBottom:18}}><p style={{fontWeight:900,fontSize:17,margin:'0 0 3px'}}>📅 Pages consultées, jour par jour</p><p style={{fontSize:11,color:'#888',margin:'0 0 14px'}}>Appuie sur une journée pour voir toutes les pages, les sources et les visiteurs pseudonymes.</p><div style={{display:'grid',gap:7}}>{dailyDetails.map(d=><button key={d.day} disabled={!d.pages} onClick={()=>setTrafficDayDetail(trafficDayDetail===d.day?null:d.day)} style={{display:'grid',gridTemplateColumns:'minmax(125px,.8fr) minmax(110px,.7fr) minmax(100px,.7fr) minmax(90px,.7fr) minmax(180px,1.8fr) auto',gap:10,alignItems:'center',textAlign:'left',color:'#222',background:trafficDayDetail===d.day?'linear-gradient(90deg,#fff1f3,#f2fbf6)':d.pages?'#fafafa':'#f7f7f7',border:trafficDayDetail===d.day?`2px solid ${RED}`:d.pages?'1px solid #e8e8e8':'1px solid #f0f0f0',borderRadius:12,padding:'11px 13px',opacity:d.pages?1:.65,cursor:d.pages?'pointer':'default'}}><b style={{fontSize:12,textTransform:'capitalize'}}>{new Date(d.day+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</b><div><b style={{fontSize:17,color:d.pages?RED:'#999'}}>{d.pages}</b><span style={{fontSize:10,color:'#888'}}> pages vues</span></div><div><b style={{fontSize:14,color:GREEN}}>{d.sessions}</b><span style={{fontSize:10,color:'#888'}}> visites</span></div><div><b style={{fontSize:14}}>{d.visitors||'—'}</b><span style={{fontSize:10,color:'#888'}}> visiteurs</span></div><div style={{fontSize:10,color:'#777',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.top?<>Page principale : <b>{friendlyPage(d.top[0])}</b> ({d.top[1]})</>:'Aucune visite'}</div><span>{d.pages?(trafficDayDetail===d.day?'⌃':'›'):''}</span></button>)}</div></div>
              {selectedDay&&(()=>{const daySources=countBy(selectedDay.rows,'source');const dayDevices=countBy(selectedDay.rows,'device');const dayVisitors=visitorStats.filter(v=>v.days.has(selectedDay.day));return <section style={{background:'linear-gradient(145deg,#241f26,#111)',color:WHITE,borderRadius:20,padding:20,marginBottom:18}}><div style={{display:'flex',justifyContent:'space-between',gap:12}}><div><p style={{color:'#ffd24a',fontSize:10,fontWeight:900,textTransform:'uppercase',margin:'0 0 5px'}}>Détail de la journée</p><h3 style={{margin:0,textTransform:'capitalize'}}>{new Date(selectedDay.day+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</h3></div><button onClick={()=>setTrafficDayDetail(null)} style={{border:0,borderRadius:99,width:32,height:32,background:'rgba(255,255,255,.12)',color:WHITE,fontSize:18,cursor:'pointer'}}>×</button></div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:10,margin:'18px 0'}}>{[[selectedDay.pages,'Pages vues'],[selectedDay.sessions,'Visites'],[selectedDay.visitors||'—','Visiteurs distincts'],[selectedDay.pageCounts.length,'Pages différentes']].map(([n,l])=><div key={l} style={{background:'rgba(255,255,255,.09)',borderRadius:13,padding:12}}><b style={{fontSize:22,color:'#ffd24a'}}>{n}</b><p style={{fontSize:10,color:'#bbb',margin:'3px 0 0'}}>{l}</p></div>)}</div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:18}}><div><b style={{fontSize:12}}>Pages regardées</b>{selectedDay.pageCounts.map(([p,n])=><div key={p} style={{display:'flex',justifyContent:'space-between',borderBottom:'1px solid rgba(255,255,255,.1)',padding:'7px 0',fontSize:11}}><span>{friendlyPage(p)}</span><b>{n}</b></div>)}</div><div><b style={{fontSize:12}}>Provenance</b>{daySources.map(([s,n])=><div key={s} style={{display:'flex',justifyContent:'space-between',borderBottom:'1px solid rgba(255,255,255,.1)',padding:'7px 0',fontSize:11}}><span>{friendlySource(s)}</span><b>{n}</b></div>)}</div><div><b style={{fontSize:12}}>Appareils</b>{dayDevices.map(([s,n])=><div key={s} style={{display:'flex',justifyContent:'space-between',borderBottom:'1px solid rgba(255,255,255,.1)',padding:'7px 0',fontSize:11}}><span>{s}</span><b>{n}</b></div>)}</div></div>{dayVisitors.length>0&&<div style={{marginTop:18}}><b style={{fontSize:12}}>Visiteurs pseudonymes ce jour-là</b><div style={{display:'flex',flexWrap:'wrap',gap:7,marginTop:8}}>{dayVisitors.map(v=><button key={v.id} onClick={()=>setTrafficVisitorDetail(v.id)} style={{border:'1px solid rgba(255,255,255,.2)',background:'rgba(255,255,255,.09)',color:WHITE,borderRadius:99,padding:'7px 10px',cursor:'pointer',fontSize:10,fontWeight:800}}>{visitorAlias(v.id)} · {v.pages?Object.values(v.pages).reduce((a,n)=>a+n,0):v.views} vues</button>)}</div></div>}</section>})()}
              <section style={{background:WHITE,borderRadius:18,padding:18,marginBottom:18}}><p style={{fontWeight:900,fontSize:17,margin:'0 0 3px'}}>👤 Visiteurs distincts et retours</p><p style={{fontSize:11,color:'#888',margin:'0 0 14px'}}>Un code pseudonyme reconnaît le même navigateur. Il ne contient ni nom, ni e-mail, ni adresse IP.</p><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10,marginBottom:14}}><div style={{background:'#f7f7f7',borderRadius:14,padding:13}}><b style={{fontSize:24,color:RED}}>{visitorStats.length||'—'}</b><p style={{fontSize:10,color:'#777',margin:'3px 0'}}>navigateurs distincts</p></div><div style={{background:'#eaf7f0',borderRadius:14,padding:13}}><b style={{fontSize:24,color:GREEN}}>{visitorStats.length?returningVisitors:'—'}</b><p style={{fontSize:10,color:'#777',margin:'3px 0'}}>sont revenus</p></div></div>{visitorStats.length?<div style={{display:'grid',gap:7}}>{visitorStats.slice(0,50).map(v=><button key={v.id} onClick={()=>setTrafficVisitorDetail(trafficVisitorDetail===v.id?null:v.id)} style={{display:'grid',gridTemplateColumns:'minmax(120px,1.1fr) repeat(3,minmax(70px,.6fr)) auto',gap:9,alignItems:'center',textAlign:'left',border:trafficVisitorDetail===v.id?`2px solid ${GREEN}`:'1px solid #ececec',background:trafficVisitorDetail===v.id?'#f0faf5':'#fafafa',borderRadius:12,padding:'10px 12px',cursor:'pointer',color:'#222'}}><b style={{fontSize:12}}>{visitorAlias(v.id)}</b><span style={{fontSize:10}}><b>{v.views}</b> vues</span><span style={{fontSize:10}}><b>{v.sessions.size}</b> visites</span><span style={{fontSize:10}}><b>{v.days.size}</b> jours</span><span>{v.days.size>1||v.sessions.size>1?'↩️':'›'}</span></button>)}</div>:<div style={{background:'#fff8e8',borderRadius:12,padding:12,fontSize:11,color:'#705a1b'}}>La reconnaissance des retours commencera après l’ajout des colonnes de suivi dans Supabase. Les anciennes visites ne peuvent pas être reconstituées.</div>}</section>
              {selectedVisitor&&(()=>{const vp=Object.entries(selectedVisitor.pages).sort((a,b)=>b[1]-a[1]);const vs=Object.entries(selectedVisitor.sources).sort((a,b)=>b[1]-a[1]);return <section style={{background:'linear-gradient(135deg,#eaf7f0,#fff5f6)',border:`2px solid ${GREEN}`,borderRadius:20,padding:20,marginBottom:18}}><div style={{display:'flex',justifyContent:'space-between',gap:12}}><div><p style={{color:GREEN,fontSize:10,fontWeight:900,textTransform:'uppercase',margin:'0 0 5px'}}>Parcours pseudonyme</p><h3 style={{margin:0}}>{visitorAlias(selectedVisitor.id)}</h3><p style={{fontSize:10,color:'#777',margin:'4px 0'}}>Vu pour la première fois le {new Date(selectedVisitor.first).toLocaleString('fr-FR')} · dernière visite le {new Date(selectedVisitor.last).toLocaleString('fr-FR')}</p></div><button onClick={()=>setTrafficVisitorDetail(null)} style={{border:0,borderRadius:99,width:32,height:32,background:'#fff',fontSize:18,cursor:'pointer'}}>×</button></div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:9,margin:'15px 0'}}>{[[selectedVisitor.views,'Pages vues'],[selectedVisitor.sessions.size,'Visites'],[selectedVisitor.days.size,'Jours actifs'],[vp.length,'Pages différentes']].map(([n,l])=><div key={l} style={{background:'rgba(255,255,255,.85)',borderRadius:12,padding:11}}><b style={{fontSize:21,color:RED}}>{n}</b><p style={{fontSize:9,color:'#777',margin:'2px 0'}}>{l}</p></div>)}</div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:18}}><div><b style={{fontSize:12}}>Ce qu’il regarde</b>{vp.map(([p,n])=><div key={p} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid rgba(0,0,0,.08)',fontSize:11}}><span>{friendlyPage(p)}</span><b>{n}</b></div>)}</div><div><b style={{fontSize:12}}>Comment il arrive</b>{vs.map(([s,n])=><div key={s} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid rgba(0,0,0,.08)',fontSize:11}}><span>{s}</span><b>{n}</b></div>)}</div></div></section>})()}
              <section style={{background:WHITE,borderRadius:18,padding:18,marginBottom:18}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',gap:12,flexWrap:'wrap',marginBottom:14}}><div><p style={{fontWeight:900,fontSize:17,margin:'0 0 3px'}}>🔎 Détail des pages consultées</p><p style={{fontSize:11,color:'#888',margin:0}}>Clique sur une page pour comprendre précisément son trafic.</p></div><input value={trafficPageSearch} onChange={e=>setTrafficPageSearch(e.target.value)} placeholder="Rechercher une page…" style={{...inp,maxWidth:280}}/></div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12}}>{visiblePageStats.map(p=>{const share=views.length?Math.round(p.views/views.length*100):0;const social=Object.entries(p.sources).filter(([s])=>['Instagram','Facebook'].includes(s)).reduce((n,[,v])=>n+v,0);return <button key={p.path} onClick={()=>setTrafficPageDetail(p.path)} style={{textAlign:'left',background:trafficPageDetail===p.path?'linear-gradient(135deg,#fff1f3,#f2fbf6)':'#fafafa',border:trafficPageDetail===p.path?`2px solid ${RED}`:'1px solid #ececec',borderRadius:16,padding:15,cursor:'pointer',color:'#222'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'start',gap:8}}><b style={{fontSize:14}}>{friendlyPage(p.path)}</b><span style={{background:'#eee',borderRadius:99,padding:'3px 7px',fontSize:10,fontWeight:900}}>{share}%</span></div><p style={{fontSize:25,fontWeight:950,color:RED,margin:'12px 0 2px'}}>{p.views}</p><p style={{fontSize:11,color:'#777',margin:0}}>pages vues · {p.sessions.size} visite{p.sessions.size>1?'s':''}</p><div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:10}}><span style={{background:'#e8f5ee',color:GREEN,borderRadius:99,padding:'4px 7px',fontSize:9,fontWeight:800}}>📲 {social} via réseaux</span><span style={{background:'#f1f1f1',color:'#666',borderRadius:99,padding:'4px 7px',fontSize:9,fontWeight:800}}>🕒 {p.last?new Date(p.last).toLocaleDateString('fr-FR'):'—'}</span></div></button>})}</div>{!visiblePageStats.length&&<p style={{fontSize:12,color:'#999'}}>Aucune page trouvée.</p>}</section>
              {selectedPage&&(()=>{const pageSources=Object.entries(selectedPage.sources).sort((a,b)=>b[1]-a[1]);const pageDays=days.filter(d=>selectedPage.days[d]).reverse();const recent=views.filter(x=>(x.page_path||'/')===selectedPage.path).slice(0,12);return <section style={{background:'linear-gradient(145deg,#241f26,#111)',color:WHITE,borderRadius:20,padding:20,marginBottom:18,boxShadow:'0 12px 30px rgba(0,0,0,.18)'}}><div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'start'}}><div><p style={{color:'#ffd24a',fontSize:10,fontWeight:900,textTransform:'uppercase',letterSpacing:1.2,margin:'0 0 5px'}}>Analyse de la page</p><h3 style={{fontSize:22,margin:0}}>{friendlyPage(selectedPage.path)}</h3><code style={{fontSize:10,color:'#aaa'}}>{selectedPage.path}</code></div><button onClick={()=>setTrafficPageDetail(null)} style={{border:0,borderRadius:99,width:32,height:32,background:'rgba(255,255,255,.12)',color:WHITE,fontSize:18,cursor:'pointer'}}>×</button></div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:10,margin:'18px 0'}}>{[[selectedPage.views,'Pages vues'],[selectedPage.sessions.size,'Visites'],[views.length?Math.round(selectedPage.views/views.length*100)+'%':'0%','Part du trafic'],[selectedPage.visitors.size||'—','Personnes uniques']].map(([n,l])=><div key={l} style={{background:'rgba(255,255,255,.09)',borderRadius:13,padding:12}}><b style={{fontSize:22,color:'#ffd24a'}}>{n}</b><p style={{fontSize:10,color:'#bbb',margin:'3px 0 0'}}>{l}</p></div>)}</div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:18}}><div><p style={{fontWeight:900,fontSize:12}}>Consultations par date</p>{pageDays.length?pageDays.map(d=><div key={d} style={{display:'flex',justifyContent:'space-between',borderBottom:'1px solid rgba(255,255,255,.1)',padding:'6px 0',fontSize:11}}><span style={{textTransform:'capitalize'}}>{new Date(d+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'})}</span><b style={{color:'#ffd24a'}}>{selectedPage.days[d]} vue{selectedPage.days[d]>1?'s':''}</b></div>):<p style={{fontSize:11,color:'#aaa'}}>Aucune consultation.</p>}</div><div><p style={{fontWeight:900,fontSize:12}}>Provenance des visiteurs</p>{pageSources.map(([s,n])=><div key={s} style={{display:'flex',justifyContent:'space-between',borderBottom:'1px solid rgba(255,255,255,.1)',padding:'6px 0',fontSize:11}}><span>{s}</span><b>{n}</b></div>)}</div></div><details style={{marginTop:16,background:'rgba(255,255,255,.07)',borderRadius:12,padding:12}}><summary style={{cursor:'pointer',fontWeight:800,fontSize:11}}>Voir les dernières consultations de cette page</summary>{recent.map(x=><div key={x.id} style={{display:'flex',justifyContent:'space-between',gap:10,borderTop:'1px solid rgba(255,255,255,.08)',padding:'7px 0',fontSize:10,color:'#ccc'}}><span>{new Date(x.created_at).toLocaleString('fr-FR')}</span><span>{friendlySource(x.source||'direct')}</span></div>)}</details></section>})()}
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:14,marginBottom:18}}>
                {[['Pages les plus regardées',topPages,friendlyPage],['Comment les visiteurs arrivent',sources,friendlySource],['Campagnes marketing',campaigns,x=>x],['Téléphones ou ordinateurs',devices,x=>x],['Navigateurs utilisés',browsers,x=>x]].map(([title,data,label])=><div key={title} style={{background:WHITE,borderRadius:16,padding:16}}><p style={{fontWeight:900,margin:'0 0 10px'}}>{title}</p>{data.length?data.map(([k,n])=><div key={k} style={{display:'flex',justifyContent:'space-between',gap:10,fontSize:12,padding:'6px 0',borderBottom:'1px solid #f2f2f2'}}><span style={{overflow:'hidden',textOverflow:'ellipsis'}}>{label(k)}</span><b>{n}</b></div>):<p style={{fontSize:12,color:'#aaa'}}>{title==='Campagnes marketing'?'Aucun lien de campagne utilisé pour le moment.':'Les nouvelles visites rempliront cette zone.'}</p>}</div>)}
              </div>
              <details style={{background:WHITE,borderRadius:16,padding:16,marginBottom:18}}><summary style={{fontWeight:900,cursor:'pointer'}}>Afficher le détail technique des dernières visites</summary><p style={{fontSize:11,color:'#888'}}>Cette partie sert surtout au diagnostic. Une même personne peut consulter plusieurs pages pendant une seule visite.</p><div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}><thead><tr style={{textAlign:'left',color:'#888'}}><th style={{padding:7}}>Jour et heure</th><th>Page</th><th>Arrivée</th><th>Appareil</th></tr></thead><tbody>{views.slice(0,100).map(x=><tr key={x.id} style={{borderTop:'1px solid #f2f2f2'}}><td style={{padding:7,whiteSpace:'nowrap'}}>{new Date(x.created_at).toLocaleString('fr-FR')}</td><td>{friendlyPage(x.page_path)}</td><td>{friendlySource(x.source||'direct')}</td><td>{x.device?`${x.device} · ${x.browser||'—'}`:'Ancienne donnée'}</td></tr>)}</tbody></table></div></details>
              <div style={{background:WHITE,borderRadius:16,padding:16,maxWidth:780}}><p style={{fontWeight:900,margin:'0 0 4px'}}>Liens officiels à utiliser</p><p style={{fontSize:12,color:'#888'}}>Placez ces liens dans vos biographies et publications pour distinguer précisément Facebook et Instagram.</p>
                {[['Instagram — lien de bio',insta],['Facebook — lien de page',facebook]].map(([label,link])=><div key={label} style={{display:'flex',alignItems:'center',gap:8,marginTop:9}}><div style={{flex:1,minWidth:0}}><p style={{fontSize:11,fontWeight:800,margin:'0 0 2px'}}>{label}</p><code style={{display:'block',fontSize:10,color:'#666',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{link}</code></div><button onClick={()=>copyLink(link)} style={{background:GREEN,color:WHITE,border:0,borderRadius:9,padding:'8px 12px',fontWeight:800,cursor:'pointer'}}>Copier</button></div>)}
              </div>
            </div>
          })()}

          {tab==="sportsdb" && (()=>{
            const needle=sportSearch.trim().toLowerCase()
            const list=sportCandidates.filter(c=>!needle||[c.name,c.city,(c.disciplines||[]).join(' '),c.instagram].some(v=>String(v||'').toLowerCase().includes(needle)))
            const status=s=>({verifie:['✓ Vérifié','#e5f5ec',GREEN],a_contacter:['À contacter','#fff4d6','#8a6300'],a_verifier:['À vérifier','#f1f1f1','#777']}[s]||['À vérifier','#f1f1f1','#777'])
            return <div><h3 style={{margin:'0 0 5px'}}>🏀 Base sport</h3><p style={{fontSize:12,color:'#888',margin:'0 0 16px'}}>Base de prospection privée. Les clubs ne passent dans l’annuaire public qu’après vérification du compte officiel, de la ville et de la discipline.</p>{sportCandidatesError&&<div style={{background:'#fff0f1',border:`1px solid ${RED}`,color:RED,borderRadius:12,padding:12,fontSize:12,marginBottom:12}}>La table n’est pas encore accessible : {sportCandidatesError}</div>}<input value={sportSearch} onChange={e=>setSportSearch(e.target.value)} placeholder="Rechercher un club, une ville ou un sport…" style={{...inp,maxWidth:480,marginBottom:12}}/><p style={{fontSize:11,color:'#aaa'}}>{list.length} structure(s)</p><div style={{background:WHITE,borderRadius:16,padding:'4px 16px'}}>{list.map(c=>{const [label,bg,color]=status(c.verification_status);return <div key={c.id} style={{...row,alignItems:'flex-start'}}><div style={{flex:1,minWidth:0}}><p style={{fontWeight:900,fontSize:13,margin:'0 0 3px'}}>{c.name}</p><p style={{fontSize:11,color:'#777',margin:0}}>{(c.disciplines||[]).join(' · ')||'Discipline à qualifier'}{c.city?` · 📍 ${c.city}`:''}</p><p style={{fontSize:10,color:'#aaa',margin:'3px 0 0'}}>Source : {c.source_name||'—'}{c.instagram?` · @${c.instagram.replace(/^@/,'')}`:''}</p></div><span style={{background:bg,color,borderRadius:99,padding:'4px 8px',fontSize:10,fontWeight:900,whiteSpace:'nowrap'}}>{label}</span></div>})}{!list.length&&!sportCandidatesError&&<p style={{fontSize:12,color:'#999'}}>Aucun résultat.</p>}</div></div>
          })()}

          {tab==="tasks" && (
            <div style={{maxWidth:760}}>
              <div style={{display:"flex",gap:8,marginBottom:16}}><input value={taskTitle} onChange={e=>setTaskTitle(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addAdminTask()} placeholder="Ajouter une tâche interne…" style={inp}/><button onClick={addAdminTask} style={{background:RED,color:WHITE,border:0,borderRadius:10,padding:"0 18px",fontWeight:800,cursor:"pointer"}}>Ajouter</button></div>
              {adminTasks.length===0&&<p style={{fontSize:13,color:"#999"}}>Aucune tâche interne.</p>}
              {adminTasks.map(x=><div key={x.id} style={{...row,background:WHITE,padding:"12px 14px",borderRadius:12,marginBottom:8,border:"none"}}>
                <span>{x.status==="done"?"✅":x.status==="doing"?"⏳":"⬜"}</span><div style={{flex:1}}><p style={{fontWeight:800,fontSize:13,margin:0,textDecoration:x.status==="done"?"line-through":"none"}}>{x.title}</p><p style={{fontSize:10,color:"#aaa",margin:0}}>{x.priority||"normal"} · {x.created_at?ago(x.created_at):""}</p></div>
                <select value={x.status} onChange={e=>updateAdminTask(x,e.target.value)} style={{...inp,width:"auto"}}><option value="todo">À faire</option><option value="doing">En cours</option><option value="done">Terminée</option></select>
              </div>)}
            </div>
          )}

          {tab==="audit" && (
            <div><p style={{fontSize:12,color:"#888"}}>Historique protégé des actions sensibles. Il ne peut pas être modifié depuis cette interface.</p>
              {auditLog.length===0&&<p style={{fontSize:13,color:"#999"}}>Le journal commencera à se remplir après l’installation du SQL Super Admin.</p>}
              {auditLog.map(x=><div key={x.id} style={row}><span style={{fontSize:18}}>🧾</span><div style={{flex:1}}><p style={{fontWeight:800,fontSize:13,margin:0}}>{x.action}</p><p style={{fontSize:11,color:"#999",margin:0}}>{x.target_type} {x.target_id||""} · {x.created_at?new Date(x.created_at).toLocaleString("fr-FR"):""}</p></div></div>)}
            </div>
          )}

          {/* FORFAITS & REVENUS */}
          {tab==="revenus" && (() => {
            const PLANS = [
              {id:"free",l:"Gratuit",emoji:"○",bg:"#f0f0f0",color:"#888"},
              {id:"organisateur",l:"Organisateur",emoji:"🎪",bg:"#fde8ec",color:RED},
              {id:"pro",l:"Pro",emoji:"⭐",bg:"#faf6ec",color:"#b8860b"},
            ]
            const cnt = p => users.filter(u=>(u.plan||'free')===p).length
            const list = users.filter(u=>!userSearch||(u.username||"").toLowerCase().includes(userSearch.toLowerCase())||(u.email||"").toLowerCase().includes(userSearch.toLowerCase()))
            return (
              <div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:16,marginBottom:20}}>
                  <StatCard n={cnt('pro')} l="Membres Pro" emoji="⭐"/>
                  <StatCard n={cnt('organisateur')} l="Organisateurs" emoji="🎪"/>
                  <StatCard n={cnt('free')} l="Comptes gratuits" emoji="○"/>
                </div>
                <p style={{fontSize:12,color:"#999",margin:"0 0 10px"}}>Attribue à chaque membre son <b>pack</b> (gauche) et son <b>badge fan</b> (droite). « Auto » = badge calculé selon l'activité. Changement immédiat et sécurisé.</p>
                <input value={userSearch} onChange={e=>setUserSearch(e.target.value)} placeholder="Chercher un membre (pseudo ou email)..." style={{...inp,marginBottom:14,maxWidth:400}}/>
                <p style={{fontSize:12,color:"#bbb",marginBottom:8}}>{list.length} membre(s)</p>
                {list.map(u=>(
                  <div key={u.id} style={{...row,flexWrap:"wrap",gap:10}}>
                    <div style={{width:34,height:34,borderRadius:"50%",background:RED,display:"flex",alignItems:"center",justifyContent:"center",color:WHITE,fontWeight:800,fontSize:13,flexShrink:0}}>{(u.username||"?")[0].toUpperCase()}</div>
                    <div style={{flex:1,minWidth:120}}>
                      <p style={{fontWeight:700,fontSize:13,margin:0}}>{u.username||"—"}</p>
                      <p style={{fontSize:11,color:"#bbb",margin:0}}>{u.email} · {u.fan_points||0} pts</p>
                    </div>
                    <div style={{display:"flex",gap:4,flexShrink:0,background:"#f6f6f6",borderRadius:99,padding:3}}>
                      {PLANS.map(p=>{
                        const active=(u.plan||'free')===p.id
                        return <button key={p.id} onClick={()=>setUserPlan(u.id,p.id)} style={{background:active?p.color:"transparent",color:active?WHITE:"#888",fontWeight:700,fontSize:11.5,padding:"6px 12px",borderRadius:99,border:"none",cursor:"pointer",whiteSpace:"nowrap"}}>{p.emoji} {p.l}</button>
                      })}
                    </div>
                    <select value={u.fan_badge||"auto"} onChange={e=>setUserFanBadge(u.id,e.target.value)} title="Badge fan" style={{fontSize:11.5,border:"1.5px solid #e5e5e5",borderRadius:10,padding:"6px 8px",flexShrink:0,cursor:"pointer",fontWeight:700,color:"#555"}}>
                      <option value="auto">🎖️ Auto</option>
                      <option value="vahiny">🌱 Vahiny</option>
                      <option value="mpankafy">🎶 Mpankafy</option>
                      <option value="mafana">🔥 Mafana</option>
                      <option value="ray">👑 Ray aman-dReny</option>
                    </select>
                  </div>
                ))}
                <p style={{fontSize:11,color:"#ccc",marginTop:16}}>💡 Les forfaits PRO liés aux <b>fiches organisateurs</b> (avec date d'expiration) se gèrent séparément dans l'onglet 🎪 Orgas. Ici, c'est le pack rattaché au <b>compte membre</b>.</p>
              </div>
            )
          })()}

          {/* SOUMISSIONS */}
          {tab==="submissions" && (
            <div>
              <p style={{fontSize:12,color:"#999",marginBottom:12}}>{submissions.filter(s=>s.status==='pending').length} en attente · {submissions.length} au total</p>
              {submissions.length===0 && <p style={{fontSize:13,color:"#999"}}>Aucune proposition pour l'instant. Le formulaire public alimente cette file.</p>}
              {submissions.map(s=>(
                <div key={s.id} style={{background:WHITE,borderRadius:14,padding:14,marginBottom:10,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",borderLeft:`4px solid ${s.status==='pending'?'#b8860b':s.status==='approved'?GREEN:'#ccc'}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",gap:10,marginBottom:6}}>
                    <p style={{fontWeight:800,fontSize:14,margin:0}}>{s.title}</p>
                    <span style={{fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:99,flexShrink:0,background:s.status==='pending'?'#faf6ec':s.status==='approved'?'#e6f4ed':'#f0f0f0',color:s.status==='pending'?'#b8860b':s.status==='approved'?GREEN:'#999'}}>{s.status==='pending'?'⏳ en attente':s.status==='approved'?'✓ publié':'✗ refusé'}</span>
                  </div>
                  <p style={{fontSize:12,color:"#666",margin:"0 0 4px"}}>📅 {fmtShort(s.date)} · {s.city||"?"} · {s.category} · {s.price||"gratuit"}</p>
                  {s.organizer && <p style={{fontSize:12,color:"#888",margin:"0 0 4px"}}>👤 {s.organizer}</p>}
                  {s.description && <p style={{fontSize:12,color:"#777",margin:"4px 0"}}>{s.description}</p>}
                  <p style={{fontSize:11,color:"#bbb",margin:"4px 0 8px"}}>Proposé par {s.submitter_email||"anonyme"} · {ago(s.created_at)}</p>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {s.status==='pending' && <button onClick={()=>approveSubmission(s)} style={{background:GREEN,color:WHITE,fontWeight:700,fontSize:12,padding:"7px 16px",borderRadius:10,border:"none",cursor:"pointer"}}>✓ Publier</button>}
                    {s.status==='pending' && <button onClick={()=>rejectSubmission(s.id)} style={{background:"#f0f0f0",color:"#555",fontWeight:700,fontSize:12,padding:"7px 14px",borderRadius:10,border:"none",cursor:"pointer"}}>✗ Refuser</button>}
                    {delBtn(()=>delSubmission(s.id))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SIGNALEMENTS */}
          {tab==="reports" && (
            <div>
              <p style={{fontSize:12,color:"#999",marginBottom:12}}>{reports.filter(r=>r.status==='open').length} ouvert(s) · {reports.length} au total</p>
              {reports.length===0 && <p style={{fontSize:13,color:"#999"}}>Aucun signalement. 🎉</p>}
              {reports.map(r=>(
                <div key={r.id} style={{background:WHITE,borderRadius:14,padding:14,marginBottom:10,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",borderLeft:`4px solid ${r.status==='open'?RED:'#ccc'}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",gap:10,marginBottom:6}}>
                    <span style={{fontSize:11,fontWeight:700,color:"#888"}}>{r.target_type==='post'?'📝 Post':r.target_type==='post_comment'?'💬 Commentaire':'💬 Comm. événement'}</span>
                    <span style={{fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:99,flexShrink:0,background:r.status==='open'?'#fde8ec':'#f0f0f0',color:r.status==='open'?RED:'#999'}}>{r.status==='open'?'⚠️ ouvert':'✓ classé'}</span>
                  </div>
                  {r.target_excerpt && <p style={{fontSize:13,color:"#222",margin:"0 0 4px",fontStyle:"italic"}}>« {r.target_excerpt} »</p>}
                  {r.reason && <p style={{fontSize:12,color:RED,margin:"0 0 4px"}}>Motif : {r.reason}</p>}
                  <p style={{fontSize:11,color:"#bbb",margin:"4px 0 8px"}}>Signalé par @{r.profiles?.username||"?"} · {ago(r.created_at)}</p>
                  {r.status==='open' && (
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      <button onClick={()=>delReportedContent(r)} style={{background:RED,color:WHITE,fontWeight:700,fontSize:12,padding:"7px 16px",borderRadius:10,border:"none",cursor:"pointer"}}>🗑️ Supprimer le contenu</button>
                      <button onClick={()=>resolveReport(r.id)} style={{background:"#f0f0f0",color:"#555",fontWeight:700,fontSize:12,padding:"7px 14px",borderRadius:10,border:"none",cursor:"pointer"}}>Ignorer</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab==="message_archive" && (
            <div>
              <div style={{background:"#fff8e8",border:"1px solid #eed89c",borderRadius:14,padding:14,marginBottom:14,fontSize:12,color:"#6b5419",lineHeight:1.55}}><b>Accès très restreint.</b> Seul le super-administrateur peut consulter cette archive. Chaque ouverture est enregistrée. Les versions expirées sont purgées après six mois, sauf conservation légale activée pour une enquête ou un signalement grave.</div>
              {messageArchiveError&&<div role="alert" style={{background:"#fde8ec",border:`1px solid ${RED}`,color:RED,borderRadius:12,padding:12,fontSize:12,marginBottom:12}}>Archive indisponible : {messageArchiveError}. Exécutez d’abord le lot Supabase unique.</div>}
              {!messageArchiveError&&messageArchive.length===0&&<p style={{fontSize:13,color:"#999"}}>Aucun message archivé pour le moment.</p>}
              {messageArchive.map(item=><div key={item.archive_id} style={{background:WHITE,borderRadius:14,padding:14,marginBottom:10,borderLeft:`4px solid ${item.action==='deleted'?RED:item.action==='edited'?'#b8860b':'#bbb'}`}}><div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}><b style={{fontSize:12}}>{item.action==='deleted'?'Message supprimé':item.action==='edited'?'Version avant modification':'Message envoyé'}</b><span style={{fontSize:10,color:"#999"}}>{new Date(item.captured_at).toLocaleString('fr-FR')}</span></div><p style={{fontSize:13,color:"#333",whiteSpace:"pre-wrap",wordBreak:"break-word",margin:"8px 0"}}>{item.content||'—'}</p><p style={{fontSize:10,color:"#aaa",margin:0}}>Message {item.message_id} · conservation sans suppression automatique{item.legal_hold?' · 🔒 conservation légale':''}</p></div>)}
            </div>
          )}

          {tab==="rights" && (
            <div>
              <div style={{background:"#fff8e8",border:"1px solid #eed89c",borderRadius:14,padding:14,marginBottom:14,fontSize:12,color:"#6b5419"}}><b>Délai à surveiller :</b> les demandes d’accès, rectification, opposition et effacement doivent être suivies, documentées et traitées dans les délais applicables.</div>
              {privacyRequests.length===0&&<p style={{fontSize:13,color:"#999"}}>Aucune demande reçue.</p>}
              {privacyRequests.map(x=><div key={x.id} style={{background:WHITE,borderRadius:14,padding:15,marginBottom:10,borderLeft:`4px solid ${x.status==="completed"?GREEN:RED}`}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:12}}><div><p style={{fontWeight:900,fontSize:14,margin:"0 0 3px"}}>{x.request_type||x.type||"Demande de droits"}</p><p style={{fontSize:12,color:"#777",margin:0}}>{x.subject||"—"} · {x.requester_email||"—"}</p></div><span style={{fontSize:10,fontWeight:900,color:x.status==="completed"?GREEN:RED}}>{x.status||"received"}</span></div>
                {x.details&&<p style={{fontSize:12,color:"#555",whiteSpace:"pre-wrap"}}>{x.details}</p>}
                <p style={{fontSize:10,color:"#aaa"}}>Reçue le {x.created_at?new Date(x.created_at).toLocaleDateString("fr-FR"):"—"}</p>
                <div style={{display:"flex",gap:7,flexWrap:"wrap"}}><button onClick={()=>updatePrivacyStatus(x,"in_progress")} style={{background:"#fff3df",color:"#9b6200",border:0,borderRadius:9,padding:"7px 11px",fontWeight:800,cursor:"pointer"}}>En cours</button><button onClick={()=>updatePrivacyStatus(x,"completed")} style={{background:"#e6f4ed",color:GREEN,border:0,borderRadius:9,padding:"7px 11px",fontWeight:800,cursor:"pointer"}}>✓ Terminée</button><button onClick={()=>updatePrivacyStatus(x,"rejected")} style={{background:"#f1f1f1",color:"#666",border:0,borderRadius:9,padding:"7px 11px",fontWeight:800,cursor:"pointer"}}>Refus motivé</button></div>
              </div>)}
            </div>
          )}

          {tab==="licenses" && (
            <div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14,marginBottom:18}}><StatCard n={visualLicenses.filter(x=>x.status==="verified").length} l="Autorisations vérifiées" emoji="✅"/><StatCard n={visualLicenses.filter(x=>x.status!=="verified").length} l="À vérifier / expirées" emoji="⏳"/><StatCard n={quarantinedVisuals.length} l="Visuels en quarantaine" emoji="🔒"/></div>
              <p style={{fontSize:12,color:"#777"}}>Une affiche reste masquée tant qu’une autorisation écrite, sa portée et sa durée n’ont pas été vérifiées.</p>
              {visualLicenses.map(x=><div key={x.id} style={row}><span style={{fontSize:20}}>{x.status==="verified"?"✅":"⏳"}</span><div style={{flex:1}}><p style={{fontWeight:800,fontSize:13,margin:0}}>{x.event_title||x.source_table||"Visuel événementiel"}</p><p style={{fontSize:11,color:"#999",margin:0}}>{x.rights_holder||"Titulaire non renseigné"} · {x.status||"pending"}</p></div></div>)}
              {visualLicenses.length===0&&<p style={{fontSize:13,color:"#999"}}>Aucune autorisation enregistrée. Les affiches restent donc désactivées.</p>}
            </div>
          )}

          {/* À LA UNE / BANDEAU */}
          {tab==="banner" && (
            <div style={{maxWidth:640}}>
              <h3 style={{fontSize:15,fontWeight:800,margin:"0 0 6px"}}>📢 Bandeau d'annonce</h3>
              <p style={{fontSize:12,color:"#999",margin:"0 0 10px"}}>Affiché en haut de tout le site. Laisse vide pour le masquer.</p>
              <textarea value={bannerText} onChange={e=>setBannerText(e.target.value)} placeholder="Ex : 🎉 RNS ce week-end à Vichy — réservez vos billets !" rows={2} style={{...inp,resize:"vertical",fontFamily:"system-ui,sans-serif"}}/>
              <div style={{display:"flex",alignItems:"center",gap:12,marginTop:10}}>
                <button onClick={saveBanner} style={{background:RED,color:WHITE,fontWeight:700,fontSize:13,padding:"10px 22px",borderRadius:12,border:"none",cursor:"pointer"}}>Enregistrer</button>
                {bannerSaved && <span style={{color:GREEN,fontWeight:700,fontSize:13}}>✓ Enregistré</span>}
              </div>
              {bannerText && <div style={{marginTop:16}}><p style={{fontSize:11,color:"#999",margin:"0 0 6px"}}>Aperçu :</p><div style={{background:RED,color:WHITE,padding:"10px 16px",borderRadius:10,fontSize:13,fontWeight:700,textAlign:"center"}}>{bannerText}</div></div>}

              <h3 style={{fontSize:15,fontWeight:800,margin:"28px 0 6px"}}>⭐ Événements à la une</h3>
              <p style={{fontSize:12,color:"#999",margin:"0 0 12px"}}>Épingle un événement en tête de l'accueil.</p>
              {events.filter(e=>!isPast(e.date)).map(e=>(
                <div key={e.id} style={row}>
                  <div style={{flex:1,minWidth:0}}><p style={{fontWeight:700,fontSize:13,margin:0}}>{e.title}</p><p style={{fontSize:11,color:"#bbb",margin:0}}>{fmtShort(e.date)} · {e.city}{e.featured&&featuredRemaining(e.featured_until)?` · ⏳ encore ${featuredRemaining(e.featured_until)}`:''}</p></div>
                  {e.featured&&featuredRemaining(e.featured_until)&&<button onClick={()=>extendEventFeatured(e)} style={{background:'#fff7df',color:'#9b7200',fontWeight:800,fontSize:11,padding:'6px 9px',borderRadius:99,border:'1px solid #e6d9a8',cursor:'pointer',flexShrink:0}}>+7j</button>}
                  <button onClick={()=>toggleFeatured(e)} style={{background:e.featured?"#faf6ec":"#f0f0f0",color:e.featured?"#b8860b":"#888",fontWeight:700,fontSize:12,padding:"6px 14px",borderRadius:99,border:e.featured?"1.5px solid #e6d9a8":"1.5px solid transparent",cursor:"pointer",flexShrink:0}}>{e.featured?"⭐ À la une":"Épingler"}</button>
                </div>
              ))}

              <h3 style={{fontSize:15,fontWeight:800,margin:"28px 0 6px"}}>📤 Export</h3>
              <button onClick={exportMembersCsv} style={{background:GREEN,color:WHITE,fontWeight:700,fontSize:13,padding:"10px 20px",borderRadius:12,border:"none",cursor:"pointer"}}>⬇️ Exporter les membres (CSV)</button>
            </div>
          )}

          {/* MEMBRES */}
          {tab==="users" && (
            <div>
              <input value={userSearch} onChange={e=>setUserSearch(e.target.value)} placeholder="Chercher par pseudo ou email..." style={{...inp,marginBottom:16,maxWidth:400}}/>
              <p style={{fontSize:12,color:"#999",marginBottom:8}}>{filtered.length} membre(s)</p>
              {filtered.map(u=>(
                <div key={u.id} style={row}>
                  <div style={{width:36,height:36,borderRadius:"50%",background:u.is_banned?"#ccc":RED,display:"flex",alignItems:"center",justifyContent:"center",color:WHITE,fontWeight:800,fontSize:14,flexShrink:0}}>{(u.username||"?")[0].toUpperCase()}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontWeight:700,fontSize:13,color:u.is_banned?"#ccc":"#111",margin:0}}>{u.username||"—"} {u.is_banned&&<span style={{color:RED,fontSize:11}}>(banni)</span>}</p>
                    <p style={{fontSize:11,color:"#bbb",margin:0}}>{u.email||u.id}</p>
                  </div>
                  <p style={{fontSize:11,color:"#bbb",flexShrink:0}}>{u.code_postal||""}</p>
                  <span style={{fontSize:11,color:"#bbb",flexShrink:0}} title="Points d'activité">{u.fan_points||0} pts</span>
                  <select value={u.fan_badge||"auto"} onChange={e=>setUserFanBadge(u.id,e.target.value)} title="Badge fan" style={{fontSize:11,border:"1px solid #e5e5e5",borderRadius:8,padding:"4px 6px",flexShrink:0,cursor:"pointer"}}>
                    <option value="auto">Auto</option>
                    <option value="vahiny">🌱 Vahiny</option>
                    <option value="mpankafy">🎶 Mpankafy</option>
                    <option value="mafana">🔥 Mafana</option>
                    <option value="ray">👑 Ray aman-dReny</option>
                  </select>
                  <button onClick={()=>banUser(u.id,u.is_banned)} style={{background:u.is_banned?"#e6f4ed":"#fde8ec",color:u.is_banned?GREEN:RED,fontWeight:700,fontSize:11,padding:"4px 10px",borderRadius:99,border:"none",cursor:"pointer",flexShrink:0}}>
                    {u.is_banned?"✓ Débannir":"🚫 Bannir"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ÉVÉNEMENTS */}
          {tab==="events" && (
            <div>
              <button onClick={()=>{setEditId("new");setEditForm({...EMPTY_FORM})}} style={{background:RED,color:WHITE,fontWeight:700,padding:"10px 20px",borderRadius:12,border:"none",cursor:"pointer",marginBottom:16}}>+ Ajouter un événement</button>
              {editId==="new" && (
                <div style={{background:WHITE,borderRadius:16,padding:16,marginBottom:12,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",display:"flex",flexDirection:"column",gap:10}}>
                  <input value={editForm.title||""} onChange={e=>setEditForm({...editForm,title:e.target.value})} placeholder="Titre *" style={inp}/>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    <input type="date" value={editForm.date||""} onChange={e=>setEditForm({...editForm,date:e.target.value})} style={inp}/>
                    <select value={editForm.category||"Soirée"} onChange={e=>setEditForm({...editForm,category:e.target.value})} style={inp}>
                      {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                    <input value={editForm.location||""} onChange={e=>setEditForm({...editForm,location:e.target.value})} placeholder="Lieu" style={inp}/>
                    <input value={editForm.city||""} onChange={e=>setEditForm({...editForm,city:e.target.value})} placeholder="Ville" style={inp}/>
                    <input value={editForm.price||""} onChange={e=>setEditForm({...editForm,price:e.target.value})} placeholder="Prix" style={inp}/>
                    <input value={editForm.organizer||""} onChange={e=>setEditForm({...editForm,organizer:e.target.value})} placeholder="Organisateur" style={inp}/>
                  </div>
                  <input value={editForm.ticketUrl||""} onChange={e=>setEditForm({...editForm,ticketUrl:e.target.value})} placeholder="URL billetterie" style={inp}/>
                  <input value={editForm.official_source_url||""} onChange={e=>setEditForm({...editForm,official_source_url:e.target.value})} placeholder="Annonce officielle (Facebook, Instagram, site…)" style={inp}/>
                  <input value={editForm.updates_url||""} onChange={e=>setEditForm({...editForm,updates_url:e.target.value})} placeholder="Page officielle à suivre" style={inp}/>
                  {evtImgImport}
                  <textarea value={editForm.description||""} onChange={e=>setEditForm({...editForm,description:e.target.value})} placeholder="Description" rows={3} style={{...inp,resize:"vertical",fontFamily:"system-ui,sans-serif"}}/>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={saveEvent} style={{background:GREEN,color:WHITE,fontWeight:700,padding:"8px 20px",borderRadius:10,border:"none",cursor:"pointer"}}>✓ Créer l'événement</button>
                    <button onClick={()=>setEditId(null)} style={{background:"#f0f0f0",color:"#555",fontWeight:700,padding:"8px 16px",borderRadius:10,border:"none",cursor:"pointer"}}>Annuler</button>
                  </div>
                </div>
              )}
              {events.map(ev=>(
                <div key={ev.id} style={{background:WHITE,borderRadius:16,padding:16,marginBottom:12,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
                  {editId===ev.id ? (
                    <div style={{display:"flex",flexDirection:"column",gap:10}}>
                      <input value={editForm.title||""} onChange={e=>setEditForm({...editForm,title:e.target.value})} placeholder="Titre" style={inp}/>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                        <input type="date" value={editForm.date||""} onChange={e=>setEditForm({...editForm,date:e.target.value})} style={inp}/>
                        <input value={editForm.price||""} onChange={e=>setEditForm({...editForm,price:e.target.value})} placeholder="Prix" style={inp}/>
                        <input value={editForm.location||""} onChange={e=>setEditForm({...editForm,location:e.target.value})} placeholder="Lieu" style={inp}/>
                        <input value={editForm.organizer||""} onChange={e=>setEditForm({...editForm,organizer:e.target.value})} placeholder="Organisateur" style={inp}/>
                        <input value={editForm.city||""} onChange={e=>setEditForm({...editForm,city:e.target.value})} placeholder="Ville" style={inp}/>
                        <input value={editForm.ticketUrl||""} onChange={e=>setEditForm({...editForm,ticketUrl:e.target.value})} placeholder="URL billets" style={inp}/>
                      </div>
                      <input value={editForm.official_source_url||""} onChange={e=>setEditForm({...editForm,official_source_url:e.target.value})} placeholder="Annonce officielle (Facebook, Instagram, site…)" style={inp}/>
                      <input value={editForm.updates_url||""} onChange={e=>setEditForm({...editForm,updates_url:e.target.value})} placeholder="Page officielle à suivre" style={inp}/>
                      {evtImgImport}
                      <textarea value={editForm.description||""} onChange={e=>setEditForm({...editForm,description:e.target.value})} placeholder="Description" rows={3} style={{...inp,resize:"vertical",fontFamily:"system-ui,sans-serif"}}/>
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={saveEvent} style={{background:GREEN,color:WHITE,fontWeight:700,padding:"8px 20px",borderRadius:10,border:"none",cursor:"pointer"}}>✓ Sauvegarder</button>
                        <button onClick={()=>setEditId(null)} style={{background:"#f0f0f0",color:"#555",fontWeight:700,padding:"8px 16px",borderRadius:10,border:"none",cursor:"pointer"}}>Annuler</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      {ev.image && <img src={ev.image} alt="" style={{width:56,height:56,borderRadius:10,objectFit:"cover",flexShrink:0}}/>}
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontWeight:700,fontSize:14,color:"#111",margin:"0 0 2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.title}</p>
                        <p style={{fontSize:12,color:"#888",margin:0}}>{fmtShort(ev.date)} · {ev.location} · {ev.price||"—"}</p>
                        <p style={{fontSize:11,color:"#bbb",margin:0}}>par {ev.organizer||"—"}</p>
                      </div>
                      <div style={{display:"flex",gap:6,flexShrink:0}}>
                        <button onClick={()=>toggleFeatured(ev)} title="À la une" style={{background:ev.featured?"#faf6ec":"#f0f0f0",color:ev.featured?"#b8860b":"#aaa",fontWeight:700,fontSize:11,padding:"5px 10px",borderRadius:99,border:"none",cursor:"pointer"}}>⭐</button>
                        <button onClick={()=>duplicateEvent(ev)} title="Dupliquer (année suivante)" style={{background:"#f0f0f0",color:"#333",fontWeight:700,fontSize:11,padding:"5px 10px",borderRadius:99,border:"none",cursor:"pointer"}}>⧉</button>
                        <button onClick={()=>{setEditId(ev.id);setEditForm({...ev})}} style={{background:"#f0f0f0",color:"#333",fontWeight:700,fontSize:11,padding:"5px 12px",borderRadius:99,border:"none",cursor:"pointer"}}>✏️ Éditer</button>
                        {delBtn(()=>delEvent(ev.id))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* BILLETS — validation QR partenaires */}
          {tab==="billets" && (
            <div style={{maxWidth:520}}>
              <h3 style={{fontSize:15,fontWeight:800,margin:"0 0 6px"}}>🎟️ Valider un billet partenaire</h3>
              <p style={{fontSize:12,color:"#999",margin:"0 0 14px"}}>Scanne le QR du membre avec l'appareil photo du téléphone, ou tape/colle son code ci-dessous, puis valide. Un billet ne peut être validé qu'<b>une seule fois</b>.</p>
              <div style={{display:"flex",gap:8}}>
                <input value={ticketCode} onChange={e=>{setTicketCode(e.target.value);setTicketResult(null)}} placeholder="Code du billet (ex: MEV-9001-A1B2C3D4)" style={{...inp,flex:1}}/>
                <button onClick={validateTicket} style={{background:RED,color:WHITE,fontWeight:700,fontSize:13,padding:"10px 20px",borderRadius:12,border:"none",cursor:"pointer",whiteSpace:"nowrap"}}>Valider</button>
              </div>
              {ticketResult && (
                <div style={{marginTop:14,padding:"14px 16px",borderRadius:12,fontWeight:700,fontSize:14,
                  background:ticketResult.type==="ok"?"#e6f4ed":ticketResult.type==="used"?"#fff3e0":"#fde8ec",
                  color:ticketResult.type==="ok"?GREEN:ticketResult.type==="used"?"#b35c00":RED}}>
                  {ticketResult.type==="used"?"⚠️ ":ticketResult.type==="err"?"❌ ":""}{ticketResult.msg}
                </div>
              )}
              <p style={{fontSize:11,color:"#ccc",marginTop:16}}>💡 Pour tester : ouvre l'événement « 🎟️ Soirée Partenaire — DÉMO QR », clique « Mon billet QR », puis recopie le code ici et valide. Revalide-le une 2e fois → il sera refusé (usage unique).</p>
            </div>
          )}

          {/* GASTRO */}
          {tab==="gastro" && (
            <div>
              <button onClick={()=>{setGEditId("new");setGForm({...GASTRO_EMPTY})}} style={{background:RED,color:WHITE,fontWeight:700,padding:"10px 20px",borderRadius:12,border:"none",cursor:"pointer",marginBottom:16}}>+ Ajouter une adresse</button>
              {(gEditId==="new"?[{id:"new"}]:[]).concat(gastro).map(g=>(
                <div key={g.id} style={{background:WHITE,borderRadius:16,padding:16,marginBottom:12,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
                  {gEditId===g.id ? (
                    <div style={{display:"flex",flexDirection:"column",gap:10}}>
                      <input value={gForm.name||""} onChange={e=>setGForm({...gForm,name:e.target.value})} placeholder="Nom *" style={inp}/>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                        <select value={gForm.type||"Restaurant"} onChange={e=>setGForm({...gForm,type:e.target.value})} style={inp}>
                          {["Restaurant","Traiteur","Food truck"].map(t=><option key={t} value={t}>{t}</option>)}
                        </select>
                        <input value={gForm.region||""} onChange={e=>setGForm({...gForm,region:e.target.value})} placeholder="Région (ex: Île-de-France)" style={inp}/>
                        <input value={gForm.city||""} onChange={e=>setGForm({...gForm,city:e.target.value})} placeholder="Ville" style={inp}/>
                        <input value={gForm.phone||""} onChange={e=>setGForm({...gForm,phone:e.target.value})} placeholder="Téléphone" style={inp}/>
                        <input value={gForm.lat??""} onChange={e=>setGForm({...gForm,lat:e.target.value})} placeholder="Latitude (carte)" style={inp}/>
                        <input value={gForm.lng??""} onChange={e=>setGForm({...gForm,lng:e.target.value})} placeholder="Longitude (carte)" style={inp}/>
                      </div>
                      <input value={gForm.address||""} onChange={e=>setGForm({...gForm,address:e.target.value})} placeholder="Adresse complète" style={inp}/>
                      <input value={gForm.site||""} onChange={e=>setGForm({...gForm,site:e.target.value})} placeholder="Site officiel" style={inp}/>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                        <input value={gForm.fb||""} onChange={e=>setGForm({...gForm,fb:e.target.value})} placeholder="Lien Facebook" style={inp}/>
                        <input value={gForm.insta||""} onChange={e=>setGForm({...gForm,insta:e.target.value})} placeholder="Lien Instagram" style={inp}/>
                        <input value={gForm.tiktok||""} onChange={e=>setGForm({...gForm,tiktok:e.target.value})} placeholder="Lien TikTok" style={inp}/>
                        <input value={gForm.contact||""} onChange={e=>setGForm({...gForm,contact:e.target.value})} placeholder="Contact (ex: Zo Rav.)" style={inp}/>
                      </div>
                      <textarea value={gForm.note||""} onChange={e=>setGForm({...gForm,note:e.target.value})} placeholder="Description" rows={2} style={{...inp,resize:"vertical",fontFamily:"system-ui,sans-serif"}}/>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,background:"#faf6ec",border:"1.5px solid #e6d9a8",borderRadius:12,padding:10}}>
                        <input value={gForm.owner_username||""} onChange={e=>setGForm({...gForm,owner_username:e.target.value})} placeholder="👤 Pseudo du membre propriétaire" style={inp}/>
                        <select value={gForm.plan||"free"} onChange={e=>setGForm({...gForm,plan:e.target.value})} style={inp}>
                          <option value="free">Gratuit — fiche simple</option>
                          <option value="pro">⭐ PRO</option>
                        </select>
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={saveGastro} style={{background:GREEN,color:WHITE,fontWeight:700,padding:"8px 20px",borderRadius:10,border:"none",cursor:"pointer"}}>✓ Sauvegarder</button>
                        <button onClick={()=>setGEditId(null)} style={{background:"#f0f0f0",color:"#555",fontWeight:700,padding:"8px 16px",borderRadius:10,border:"none",cursor:"pointer"}}>Annuler</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontWeight:700,fontSize:14,color:"#111",margin:"0 0 2px"}}>{g.name}</p>
                        <p style={{fontSize:12,color:"#888",margin:0}}>{g.type} · {g.city||"ville ?"} · {g.region||"région ?"}{g.lat?" · 📍 sur la carte":""}</p>
                      </div>
                      <div style={{display:"flex",gap:6,flexShrink:0}}>
                        {pinBtn({active:g.featured,onClick:()=>togglePin('gastro',g,setGastro)})}
                        <button onClick={()=>{setGEditId(g.id);setGForm({...g,owner_username:"",plan:g.plan||"free"})}} style={{background:"#f0f0f0",color:"#333",fontWeight:700,fontSize:11,padding:"5px 12px",borderRadius:99,border:"none",cursor:"pointer"}}>✏️ Éditer</button>
                        {delBtn(()=>delGastro(g.id))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ORGAS */}
          {tab==="orgas" && (
            <div>
              {claims.length>0 && (
                <div style={{background:"#fff8e6",border:"1.5px solid #f0dfa8",borderRadius:16,padding:"14px 18px",marginBottom:16}}>
                  <p style={{fontWeight:800,fontSize:14,color:"#8a6d00",margin:"0 0 10px"}}>📨 {claims.length} demande{claims.length>1?"s":""} de contrôle de fiche en attente</p>
                  {claims.map(c=>(
                    <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderTop:"1px solid #f0e6c8",flexWrap:"wrap"}}>
                      <div style={{flex:1,minWidth:160}}>
                        <p style={{fontWeight:700,fontSize:13,margin:0}}>@{c.profiles?.username||"?"} <span style={{color:"#999",fontWeight:400}}>demande</span> 🎪 {c.organisateurs?.name||"fiche #"+c.orga_id}</p>
                        <p style={{fontSize:11,color:"#aaa",margin:0}}>{c.profiles?.email||""} · {ago(c.created_at)}</p>
                      </div>
                      <button onClick={()=>approveClaim(c)} style={{background:GREEN,color:WHITE,fontWeight:700,fontSize:11.5,padding:"6px 14px",borderRadius:99,border:"none",cursor:"pointer"}}>✓ Attribuer</button>
                      <button onClick={()=>rejectClaim(c)} style={{background:"#fde8ec",color:RED,fontWeight:700,fontSize:11.5,padding:"6px 14px",borderRadius:99,border:"none",cursor:"pointer"}}>✗ Refuser</button>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={()=>{setOEditId("new");setOForm({...ORGA_EMPTY})}} style={{background:RED,color:WHITE,fontWeight:700,padding:"10px 20px",borderRadius:12,border:"none",cursor:"pointer",marginBottom:16}}>+ Ajouter une structure</button>
              {(oEditId==="new"?[{id:"new"}]:[]).concat(orgas).map(o=>(
                <div key={o.id} style={{background:WHITE,borderRadius:16,padding:16,marginBottom:12,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
                  {oEditId===o.id ? (
                    <div style={{display:"flex",flexDirection:"column",gap:10}}>
                      <input value={oForm.name||""} onChange={e=>setOForm({...oForm,name:e.target.value})} placeholder="Nom *" style={inp}/>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                        <select value={oForm.type||"Association"} onChange={e=>setOForm({...oForm,type:e.target.value})} style={inp}>
                          {["Association sportive","Association","Organisateur","DJ & artistes","Média","Groupe"].map(t=><option key={t} value={t}>{t}</option>)}
                        </select>
                        <input value={oForm.city||""} onChange={e=>setOForm({...oForm,city:e.target.value})} placeholder="Ville" style={inp}/>
                        <input value={oForm.region||""} onChange={e=>setOForm({...oForm,region:e.target.value})} placeholder="Région" style={inp}/>
                        <input value={oForm.followers||""} onChange={e=>setOForm({...oForm,followers:e.target.value})} placeholder="Abonnés (ex: 5 000)" style={inp}/>
                      </div>
                      <textarea value={oForm.note||""} onChange={e=>setOForm({...oForm,note:e.target.value})} placeholder="Présentation" rows={2} style={{...inp,resize:"vertical",fontFamily:"system-ui,sans-serif"}}/>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                        <input value={oForm.fb||""} onChange={e=>setOForm({...oForm,fb:e.target.value})} placeholder="Lien Facebook" style={inp}/>
                        <input value={oForm.insta||""} onChange={e=>setOForm({...oForm,insta:e.target.value})} placeholder="Lien Instagram" style={inp}/>
                        <input value={oForm.site||""} onChange={e=>setOForm({...oForm,site:e.target.value})} placeholder="Site web" style={inp}/>
                        <input value={oForm.contact||""} onChange={e=>setOForm({...oForm,contact:e.target.value})} placeholder="Contact public" style={inp}/>
                      </div>
                      <input value={oForm.owner_username||""} onChange={e=>setOForm({...oForm,owner_username:e.target.value})} placeholder="👤 Pseudo du membre propriétaire (pourra modifier sa fiche)" style={inp}/>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,background:"#faf6ec",border:"1.5px solid #e6d9a8",borderRadius:12,padding:10}}>
                        <div>
                          <label style={{fontSize:11,fontWeight:700,color:"#7a5c00",display:"block",marginBottom:4}}>⭐ Forfait</label>
                          <select value={oForm.plan||"free"} onChange={e=>setOForm({...oForm,plan:e.target.value})} style={inp}>
                            <option value="free">Gratuit — fiche simple</option>
                            <option value="pro">PRO — peut publier des actus</option>
                          </select>
                        </div>
                        <div>
                          <label style={{fontSize:11,fontWeight:700,color:"#7a5c00",display:"block",marginBottom:4}}>Payé jusqu'au</label>
                          <input type="date" value={oForm.plan_until||""} onChange={e=>setOForm({...oForm,plan_until:e.target.value})} style={inp}/>
                        </div>
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={saveOrga} style={{background:GREEN,color:WHITE,fontWeight:700,padding:"8px 20px",borderRadius:10,border:"none",cursor:"pointer"}}>✓ Sauvegarder</button>
                        <button onClick={()=>setOEditId(null)} style={{background:"#f0f0f0",color:"#555",fontWeight:700,padding:"8px 16px",borderRadius:10,border:"none",cursor:"pointer"}}>Annuler</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontWeight:700,fontSize:14,color:"#111",margin:"0 0 2px"}}>{o.name} {o.plan==='pro' && <span style={{fontSize:10,fontWeight:800,background:"linear-gradient(135deg,#b8860b,#e6b31e)",color:WHITE,padding:"2px 8px",borderRadius:99}}>⭐ PRO{o.plan_until?` → ${fmtShort(o.plan_until)}`:""}</span>}</p>
                        <p style={{fontSize:12,color:"#888",margin:0}}>{o.type} · {o.city||"?"}{o.owner_id?" · ✓ propriétaire relié":""}</p>
                      </div>
                      <div style={{display:"flex",gap:6,flexShrink:0}}>
                        {pinBtn({active:o.featured,onClick:()=>togglePin('organisateurs',o,setOrgas)})}
                        <button onClick={()=>{setOEditId(o.id);setOForm({...o,owner_username:"",plan:o.plan||"free",plan_until:o.plan_until||""})}} style={{background:"#f0f0f0",color:"#333",fontWeight:700,fontSize:11,padding:"5px 12px",borderRadius:99,border:"none",cursor:"pointer"}}>✏️ Éditer</button>
                        {delBtn(()=>delOrga(o.id))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* LIEUX (Églises · Boutiques · Artisanat) */}
          {tab==="lieux" && (
            <div>
              <button onClick={()=>{setLEditId("new");setLForm({...LIEU_EMPTY})}} style={{background:RED,color:WHITE,fontWeight:700,padding:"10px 20px",borderRadius:12,border:"none",cursor:"pointer",marginBottom:16}}>+ Ajouter un lieu</button>
              {(lEditId==="new"?[{id:"new"}]:[]).concat(lieux).map(l=>(
                <div key={l.id} style={{background:WHITE,borderRadius:16,padding:16,marginBottom:12,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
                  {lEditId===l.id ? (
                    <div style={{display:"flex",flexDirection:"column",gap:10}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                        <select value={lForm.category||"eglise"} onChange={e=>setLForm({...lForm,category:e.target.value})} style={inp}>
                          <option value="eglise">⛪ Église</option>
                          <option value="boutique">🛍️ Boutique</option>
                          <option value="artisanat">🧵 Artisanat</option>
                        </select>
                        <input value={lForm.denom||""} onChange={e=>setLForm({...lForm,denom:e.target.value})} placeholder="Sous-type (FJKM, épicerie…)" style={inp}/>
                      </div>
                      <input value={lForm.name||""} onChange={e=>setLForm({...lForm,name:e.target.value})} placeholder="Nom *" style={inp}/>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                        <input value={lForm.city||""} onChange={e=>setLForm({...lForm,city:e.target.value})} placeholder="Ville / zone" style={inp}/>
                        <input value={lForm.followers||""} onChange={e=>setLForm({...lForm,followers:e.target.value})} placeholder="Abonnés" style={inp}/>
                      </div>
                      <input value={lForm.address||""} onChange={e=>setLForm({...lForm,address:e.target.value})} placeholder="Adresse" style={inp}/>
                      <textarea value={lForm.note||""} onChange={e=>setLForm({...lForm,note:e.target.value})} placeholder="Description" rows={2} style={{...inp,resize:"vertical",fontFamily:"system-ui,sans-serif"}}/>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                        <input value={lForm.fb||""} onChange={e=>setLForm({...lForm,fb:e.target.value})} placeholder="Facebook" style={inp}/>
                        <input value={lForm.insta||""} onChange={e=>setLForm({...lForm,insta:e.target.value})} placeholder="Instagram" style={inp}/>
                        <input value={lForm.site||""} onChange={e=>setLForm({...lForm,site:e.target.value})} placeholder="Site web" style={inp}/>
                        <input value={lForm.contact||""} onChange={e=>setLForm({...lForm,contact:e.target.value})} placeholder="Contact public" style={inp}/>
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={saveLieu} style={{background:GREEN,color:WHITE,fontWeight:700,padding:"8px 20px",borderRadius:10,border:"none",cursor:"pointer"}}>✓ Sauvegarder</button>
                        <button onClick={()=>setLEditId(null)} style={{background:"#f0f0f0",color:"#555",fontWeight:700,padding:"8px 16px",borderRadius:10,border:"none",cursor:"pointer"}}>Annuler</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontWeight:700,fontSize:14,color:"#111",margin:"0 0 2px"}}>{l.category==="eglise"?"⛪":l.category==="boutique"?"🛍️":"🧵"} {l.name}</p>
                        <p style={{fontSize:12,color:"#888",margin:0}}>{l.denom||"—"} · {l.city||"?"}</p>
                      </div>
                      <div style={{display:"flex",gap:6,flexShrink:0}}>
                        {pinBtn({active:l.featured,onClick:()=>togglePin('lieux',l,setLieux)})}
                        <button onClick={()=>{setLEditId(l.id);setLForm({...l})}} style={{background:"#f0f0f0",color:"#333",fontWeight:700,fontSize:11,padding:"5px 12px",borderRadius:99,border:"none",cursor:"pointer"}}>✏️ Éditer</button>
                        {delBtn(()=>delLieu(l.id))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* POSTS */}
          {tab==="posts" && (
            <div>
              <p style={{fontSize:12,color:"#999",marginBottom:12}}>{allPosts.length} post(s)</p>
              {allPosts.map(p=>(
                <div key={p.id} style={row}>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontWeight:700,fontSize:12,color:"#555",margin:"0 0 2px"}}>@{p.profiles?.username||"?"}</p>
                    <p style={{fontSize:13,color:"#222",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.content}</p>
                    <p style={{fontSize:11,color:"#bbb",margin:0}}>{ago(p.created_at)}</p>
                  </div>
                  {delBtn(()=>delPost(p.id))}
                </div>
              ))}
            </div>
          )}

          {/* VIDÉOS */}
          {tab==="videos" && (
            <div>
              <button onClick={()=>setShowVForm(s=>!s)} style={{background:RED,color:WHITE,fontWeight:700,padding:"10px 20px",borderRadius:12,border:"none",cursor:"pointer",marginBottom:16}}>+ Ajouter une vidéo</button>
              {showVForm && (
                <div style={{background:WHITE,borderRadius:16,padding:16,marginBottom:16,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                    <input value={vForm.title} onChange={e=>setVForm({...vForm,title:e.target.value})} placeholder="Titre" style={inp}/>
                    <input value={vForm.youtubeUrl} onChange={e=>setVForm({...vForm,youtubeUrl:e.target.value})} placeholder="URL YouTube embed" style={inp}/>
                    <input value={vForm.thumbnail} onChange={e=>setVForm({...vForm,thumbnail:e.target.value})} placeholder="URL thumbnail" style={inp}/>
                    <input value={vForm.city} onChange={e=>setVForm({...vForm,city:e.target.value})} placeholder="Ville" style={inp}/>
                    <input type="date" value={vForm.date} onChange={e=>setVForm({...vForm,date:e.target.value})} style={inp}/>
                    <select value={vForm.type} onChange={e=>setVForm({...vForm,type:e.target.value})} style={inp}>
                      <option value="aftermovie">After-movie</option>
                      <option value="communaute">Communauté</option>
                    </select>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                    <label style={{fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                      <input type="checkbox" checked={vForm.isTeaser} onChange={e=>setVForm({...vForm,isTeaser:e.target.checked})}/>
                      Teaser
                    </label>
                  </div>
                  <textarea value={vForm.description} onChange={e=>setVForm({...vForm,description:e.target.value})} placeholder="Description" rows={2} style={{...inp,resize:"vertical",fontFamily:"system-ui,sans-serif",marginBottom:10}}/>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={addVideo} style={{background:GREEN,color:WHITE,fontWeight:700,padding:"8px 20px",borderRadius:10,border:"none",cursor:"pointer"}}>✓ Ajouter</button>
                    <button onClick={()=>setShowVForm(false)} style={{background:"#f0f0f0",color:"#555",fontWeight:700,padding:"8px 16px",borderRadius:10,border:"none",cursor:"pointer"}}>Annuler</button>
                  </div>
                </div>
              )}
              {videos.map(v=>(
                <div key={v.id} style={{...row,alignItems:"flex-start"}}>
                  {v.thumbnail && <img src={v.thumbnail} alt="" style={{width:64,height:48,borderRadius:8,objectFit:"cover",flexShrink:0}}/>}
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontWeight:700,fontSize:13,color:"#111",margin:"0 0 2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.title}</p>
                    <p style={{fontSize:11,color:"#bbb",margin:0}}>{v.city||"—"} · {v.date} · 👁️ {(v.views||0).toLocaleString('fr-FR')}</p>
                  </div>
                  {pinBtn({active:v.featured,onClick:()=>togglePin('videos',v,setVideos)})}
                  {delBtn(()=>delVideo(v.id))}
                </div>
              ))}
            </div>
          )}

          {/* COMMENTAIRES */}
          {tab==="comments" && (
            <div>
              <p style={{fontSize:12,color:"#999",marginBottom:12}}>{allCmts.length} commentaire(s)</p>
              {allCmts.map(c=>(
                <div key={c.id} style={row}>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontWeight:700,fontSize:12,color:"#555",margin:"0 0 2px"}}>@{c.profiles?.username||"?"}</p>
                    <p style={{fontSize:13,color:"#222",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.content}</p>
                    <p style={{fontSize:11,color:"#bbb",margin:0}}>{ago(c.created_at)}</p>
                  </div>
                  {delBtn(()=>delCmt(c.id))}
                </div>
              ))}
            </div>
          )}

          {/* RAPPELS */}
          {tab==="perks" && (
            <div>
              <p style={{fontSize:12,color:"#999",marginBottom:12}}>Les avantages <b>actifs</b> apparaissent sur la page 💜 Premium. Active un avantage quand le partenariat est confirmé.</p>
              <button onClick={()=>{setPkEditId("new");setPkForm({...PERK_EMPTY})}} style={{background:RED,color:WHITE,fontWeight:700,padding:"10px 20px",borderRadius:12,border:"none",cursor:"pointer",marginBottom:16}}>+ Ajouter un avantage</button>
              {(pkEditId==="new"?[{id:"new"}]:[]).concat(perksAdm).map(pk=>(
                <div key={pk.id} style={{background:WHITE,borderRadius:16,padding:16,marginBottom:12,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
                  {pkEditId===pk.id ? (
                    <div style={{display:"flex",flexDirection:"column",gap:10}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                        <input value={pkForm.partner||""} onChange={e=>setPkForm({...pkForm,partner:e.target.value})} placeholder="Partenaire (ex: Le Tana) *" style={inp}/>
                        <input value={pkForm.offer||""} onChange={e=>setPkForm({...pkForm,offer:e.target.value})} placeholder="Offre (ex: -10%) *" style={inp}/>
                        <input value={pkForm.code||""} onChange={e=>setPkForm({...pkForm,code:e.target.value})} placeholder="Code (ex: PREMIUM10)" style={inp}/>
                        <input value={pkForm.city||""} onChange={e=>setPkForm({...pkForm,city:e.target.value})} placeholder="Ville" style={inp}/>
                      </div>
                      <textarea value={pkForm.description||""} onChange={e=>setPkForm({...pkForm,description:e.target.value})} placeholder="Conditions / description" rows={2} style={{...inp,resize:"vertical",fontFamily:"system-ui,sans-serif"}}/>
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={savePerk} style={{background:GREEN,color:WHITE,fontWeight:700,padding:"8px 20px",borderRadius:10,border:"none",cursor:"pointer"}}>✓ Sauvegarder</button>
                        <button onClick={()=>setPkEditId(null)} style={{background:"#f0f0f0",color:"#555",fontWeight:700,padding:"8px 16px",borderRadius:10,border:"none",cursor:"pointer"}}>Annuler</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontWeight:700,fontSize:14,color:"#111",margin:"0 0 2px"}}>{pk.offer} <span style={{color:"#888",fontWeight:400}}>· {pk.partner}</span></p>
                        <p style={{fontSize:12,color:"#888",margin:0}}>{pk.code?"Code "+pk.code+" · ":""}{pk.city||""}</p>
                      </div>
                      <button onClick={()=>togglePerk(pk)} style={{background:pk.active?"#e6f4ed":"#f0f0f0",color:pk.active?GREEN:"#999",fontWeight:700,fontSize:11,padding:"5px 12px",borderRadius:99,border:"none",cursor:"pointer",flexShrink:0}}>{pk.active?"✓ Actif":"Inactif"}</button>
                      <button onClick={()=>{setPkEditId(pk.id);setPkForm({...pk})}} style={{background:"#f0f0f0",color:"#333",fontWeight:700,fontSize:11,padding:"5px 12px",borderRadius:99,border:"none",cursor:"pointer",flexShrink:0}}>✏️</button>
                      {delBtn(()=>delPerk(pk.id))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab==="classifieds" && (
            <ClassifiedsAdmin/>
          )}

          {tab==="entraide" && (
            <div>
              <p style={{fontSize:12,color:"#999",marginBottom:12}}>{helpAds.length} annonce(s) covoiturage / hébergement — supprime les annonces douteuses ou périmées.</p>
              {helpAds.map(r=>{
                const ev = events.find(e=>e.id===r.event_id)
                return (
                  <div key={r.id} style={row}>
                    <span style={{fontSize:18,flexShrink:0}}>{r.category==="hebergement"?"🛏️":"🚗"}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontWeight:700,fontSize:13,color:"#222",margin:"0 0 2px"}}>
                        {r.profiles?.username||"?"} {r.type==="propose"?"propose":"cherche"} · {r.places} place{r.places>1?"s":""} · {r.category==="hebergement"?"hébergement":"trajet"}
                      </p>
                      <p style={{fontSize:12,color:"#888",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.category==="trajet"?"Depuis":"À"} {r.city}{r.note?` · ${r.note}`:""}</p>
                      <p style={{fontSize:11,color:"#bbb",margin:0}}>🎪 {ev?ev.title:"événement #"+r.event_id} · {ago(r.created_at)}</p>
                    </div>
                    {delBtn(()=>delHelp(r.id))}
                  </div>
                )
              })}
              {helpAds.length===0 && <p style={{fontSize:13,color:"#bbb",textAlign:"center",padding:24}}>Aucune annonce d'entraide.</p>}
            </div>
          )}

          {tab==="actus" && (
            <div>
              <p style={{fontSize:12,color:"#999",marginBottom:12}}>{actus.length} actu(s) publiées par les organisateurs (forfait Pro).</p>
              {actus.map(a=>(
                <div key={a.id} style={row}>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontWeight:700,fontSize:12,color:"#555",margin:"0 0 2px"}}>🎪 {a.organisateurs?.name||"orga #"+a.orga_id} <span style={{color:"#bbb",fontWeight:400}}>par @{a.profiles?.username||"?"}</span></p>
                    <p style={{fontSize:13,color:"#222",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.content}</p>
                    <p style={{fontSize:11,color:"#bbb",margin:0}}>{ago(a.created_at)}</p>
                  </div>
                  {delBtn(()=>delActu(a.id))}
                </div>
              ))}
              {actus.length===0 && <p style={{fontSize:13,color:"#bbb",textAlign:"center",padding:24}}>Aucune actu d'organisateur.</p>}
            </div>
          )}

          {tab==="reminders" && (
            <div>
              <p style={{fontSize:12,color:"#999",marginBottom:12}}>{reminders.length} rappel(s)</p>
              {reminders.map(r=>(
                <div key={r.id} style={row}>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontWeight:700,fontSize:13,color:"#111",margin:"0 0 2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.event_title||"—"}</p>
                    <p style={{fontSize:12,color:"#666",margin:"0 0 2px"}}>{r.email}</p>
                    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                      {(r.types||[]).map(t=><span key={t} style={{background:"#f5f5f5",color:"#555",fontSize:10,padding:"2px 7px",borderRadius:99}}>{t}</span>)}
                    </div>
                  </div>
                  <p style={{fontSize:11,color:"#bbb",flexShrink:0}}>{fmtShort(r.event_date||r.created_at)}</p>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

/* ── App ──────────────────────────────────────────── */
const publicPageShell = {maxWidth:960,margin:"0 auto",padding:"38px 18px 56px"}
const publicCard = {background:WHITE,border:"1px solid #ececec",borderRadius:20,padding:24,boxShadow:"0 8px 28px rgba(35,25,35,.06)"}

function DiasporaPage({isMobile,onGoto}) {
  const [publicOpen,setPublicOpen]=useState(false)
  const [proOpen,setProOpen]=useState(false)
  const [previewNotice,setPreviewNotice]=useState("")
  const communityLinks = [
    ["Facebook","Diaspora Malagasy","Groupe communautaire pour échanger avec la diaspora malagasy.","https://www.facebook.com/groups/2461198107341793","#1877F2"],
    ["Web","MadaDiaspora","Réseau en ligne consacré à la diaspora malagasy à travers le monde.","https://madadiaspora.com/","#007A3D"],
    ["Web","Club 1808 France","Réseau d’acteurs locaux et de membres de la diaspora engagés dans des projets concrets.","https://club1808.com/","#C8102E"],
    ["Web","Arivo Ampielezana","Annuaire permettant de retrouver des associations de la diaspora malgache.","https://arivoampielezana.org/?page_id=373","#6B4EFF"],
    ["Instagram","Communautés malagasy","Découvrir les comptes et publications de la diaspora présents sur Instagram.","https://www.instagram.com/explore/search/keyword/?q=diaspora%20malagasy","#C13584"],
    ["Web","Communautés catholiques malagasy","Annuaire national des communautés catholiques malagasy en France.","https://www.ancmf.com/nos-communautes/","#B8860B"],
  ]
  const joinPreview=label=>setPreviewNotice(`${label} : le lien WhatsApp sera activé après validation de la communauté.`)
  return <main style={{...publicPageShell,maxWidth:1040}}>
    <header style={{background:"linear-gradient(135deg,#fff 0%,#f0faf4 58%,#fff1f3 100%)",border:"1px solid #e7eee9",borderRadius:28,padding:isMobile?"30px 20px":"46px 42px",textAlign:"center",marginBottom:22,boxShadow:"0 12px 38px rgba(35,25,35,.07)"}}>
      <p style={{color:GREEN,fontWeight:900,fontSize:12,letterSpacing:1.5,textTransform:"uppercase",margin:"0 0 10px"}}>La communauté continue sur WhatsApp</p>
      <h2 style={{color:"#26215C",fontSize:isMobile?30:46,lineHeight:1.08,margin:"0 auto 14px",maxWidth:720}}>Rejoins l’espace qui te correspond</h2>
      <p style={{color:"#55565d",fontSize:isMobile?15:17,lineHeight:1.65,maxWidth:730,margin:"0 auto 20px"}}>Les informations utiles sans bruit, un salon pour échanger et un réseau professionnel séparé, accessible après vérification.</p>
      <div style={{display:"flex",justifyContent:"center",gap:8,flexWrap:"wrap"}}>
        {["✓ Groupes modérés","✓ Accès public libre","✓ Espace pro vérifié"].map(item=><span key={item} style={{background:WHITE,border:"1px solid #dfe8e2",borderRadius:99,padding:"7px 11px",fontSize:12,fontWeight:800,color:"#3f4b43"}}>{item}</span>)}
      </div>
    </header>

    <section aria-label="Choisir son espace" style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(2,minmax(0,1fr))",gap:18,marginBottom:22}}>
      <article style={{...publicCard,borderTop:`5px solid ${GREEN}`}}>
        <span style={{background:"#eaf7ef",color:GREEN,borderRadius:99,padding:"5px 9px",fontWeight:900,fontSize:11,textTransform:"uppercase"}}>Accès public</span>
        <h3 style={{color:"#26215C",fontSize:23,margin:"14px 0 7px"}}>Communauté Malagasy Events</h3>
        <p style={{color:"#666",fontSize:14,lineHeight:1.6,margin:"0 0 17px"}}>Deux groupes seulement, pour rester simple et vivant.</p>
        {[
          ["📢","L’Essentiel Malagasy Events","Événements vérifiés, changements de date et ouvertures de billetterie. Seuls les administrateurs publient."],
          ["💬","Le Salon Malagasy","Sorties, entraide, recommandations et accueil des nouveaux membres."],
        ].map(([icon,title,text])=><div key={title} style={{display:"flex",gap:12,padding:"13px 0",borderTop:"1px solid #eee"}}><span style={{fontSize:22}}>{icon}</span><div><strong style={{display:"block",color:"#26215C",fontSize:15,marginBottom:3}}>{title}</strong><span style={{color:"#666",fontSize:13,lineHeight:1.5}}>{text}</span></div></div>)}
        <button onClick={()=>setPublicOpen(v=>!v)} style={{width:"100%",marginTop:13,background:GREEN,color:WHITE,border:"none",borderRadius:13,padding:"12px 15px",fontWeight:900,cursor:"pointer"}}>{publicOpen?"Masquer les accès":"Découvrir les groupes publics"}</button>
        {publicOpen&&<div style={{marginTop:12,padding:14,background:"#f4faf6",borderRadius:14}}>
          <p style={{margin:"0 0 10px",fontSize:12,color:"#536057",lineHeight:1.5}}>Aucun compte Malagasy Events requis. Tu rejoindras toi-même le groupe choisi depuis WhatsApp.</p>
          {["📢 Ouvrir L’Essentiel","💬 Ouvrir Le Salon"].map(label=><button key={label} onClick={()=>joinPreview(label)} style={{width:"100%",marginTop:7,background:WHITE,color:GREEN,border:"1px solid #b9d8c4",borderRadius:11,padding:"10px",fontWeight:800,cursor:"pointer"}}>{label}</button>)}
        </div>}
      </article>

      <article style={{...publicCard,borderTop:`5px solid ${RED}`}}>
        <span style={{background:"#fff0f2",color:RED,borderRadius:99,padding:"5px 9px",fontWeight:900,fontSize:11,textTransform:"uppercase"}}>Accès après validation</span>
        <h3 style={{color:"#26215C",fontSize:23,margin:"14px 0 7px"}}>Réseau Malagasy Events Pro</h3>
        <p style={{color:"#666",fontSize:14,lineHeight:1.6,margin:"0 0 15px"}}>Un espace séparé pour les organisateurs, associations, artistes, restaurateurs et prestataires.</p>
        <div style={{background:"#faf8fb",borderRadius:14,padding:"13px 14px",marginBottom:14}}>
          {["Échanger des contacts et opportunités","Trouver des prestataires fiables","Partager les besoins d’un événement"].map(item=><p key={item} style={{margin:"6px 0",fontSize:13,color:"#4f4d55"}}>✓ {item}</p>)}
        </div>
        <button onClick={()=>setProOpen(v=>!v)} style={{width:"100%",background:RED,color:WHITE,border:"none",borderRadius:13,padding:"12px 15px",fontWeight:900,cursor:"pointer"}}>{proOpen?"Fermer la demande":"Demander l’accès professionnel"}</button>
        {proOpen&&<form onSubmit={e=>{e.preventDefault();setPreviewNotice("Aperçu uniquement : aucune demande n’a été envoyée.")}} style={{display:"grid",gap:9,marginTop:13,padding:14,background:"#fff7f8",borderRadius:14}}>
          <input required placeholder="Nom et prénom" style={communityInputStyle}/>
          <input required placeholder="Structure ou activité" style={communityInputStyle}/>
          <select required defaultValue="" style={communityInputStyle}><option value="" disabled>Votre profil</option><option>Organisateur / association</option><option>Artiste</option><option>Restaurant / commerce</option><option>Prestataire</option><option>Autre professionnel</option></select>
          <input required placeholder="Ville" style={communityInputStyle}/>
          <input required type="url" placeholder="Site ou réseau social professionnel" style={communityInputStyle}/>
          <input required type="tel" placeholder="Numéro WhatsApp" style={communityInputStyle}/>
          <textarea required placeholder="Pourquoi souhaitez-vous rejoindre le réseau ?" rows={3} style={{...communityInputStyle,resize:"vertical"}}/>
          <button type="submit" style={{background:"#26215C",color:WHITE,border:"none",borderRadius:11,padding:11,fontWeight:900,cursor:"pointer"}}>Envoyer ma demande</button>
          <small style={{color:"#806d72",lineHeight:1.4}}>Prévisualisation locale : ce formulaire n’est pas encore connecté.</small>
        </form>}
      </article>
    </section>

    {previewNotice&&<div role="status" style={{background:"#26215C",color:WHITE,borderRadius:14,padding:"12px 16px",fontSize:13,fontWeight:700,marginBottom:22,textAlign:"center"}}>{previewNotice}</div>}

    <section style={{...publicCard,marginBottom:22}}>
      <h3 style={{color:"#26215C",fontSize:21,margin:"0 0 16px",textAlign:"center"}}>Comment ça fonctionne ?</h3>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:16}}>{[
        ["1","Choisis ton espace","Public pour suivre et échanger, professionnel pour collaborer."],
        ["2","Rejoins ou fais ta demande","Accès direct aux groupes publics ; validation pour le réseau pro."],
        ["3","Reçois l’information utile","Actualités vérifiées, échanges modérés et rendez-vous réguliers."],
      ].map(([n,title,text])=><div key={n} style={{textAlign:"center",padding:10}}><span style={{display:"inline-grid",placeItems:"center",width:34,height:34,borderRadius:"50%",background:n==="1"?RED:GREEN,color:WHITE,fontWeight:900}}>{n}</span><strong style={{display:"block",color:"#26215C",margin:"10px 0 5px"}}>{title}</strong><span style={{color:"#666",fontSize:13,lineHeight:1.5}}>{text}</span></div>)}</div>
    </section>

    <section style={{...publicCard,marginBottom:22,background:"linear-gradient(135deg,#26215C,#3b3477)",color:WHITE}}>
      <h3 style={{fontSize:21,margin:"0 0 6px"}}>Un rythme simple pour faire vivre la communauté</h3>
      <p style={{opacity:.78,fontSize:14,lineHeight:1.55,margin:"0 0 15px"}}>Pas de messages toute la journée : des rendez-vous clairs et utiles.</p>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(4,1fr)",gap:10}}>{[
        ["Lundi","L’agenda de la semaine"],["Mercredi","Question & bon plan"],["Vendredi","Que fait-on ce week-end ?"],["Dimanche","Retours & propositions"],
      ].map(([day,text])=><div key={day} style={{background:"rgba(255,255,255,.1)",borderRadius:13,padding:12}}><strong style={{display:"block",fontSize:12,color:"#aee6c1",marginBottom:4}}>{day}</strong><span style={{fontSize:13,lineHeight:1.4}}>{text}</span></div>)}</div>
    </section>

    <section style={{...publicCard,marginBottom:22,background:"#fbfbfc"}}>
      <h3 style={{color:"#26215C",fontSize:19,margin:"0 0 10px"}}>Un cadre professionnel et sûr</h3>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:10}}>{[
        ["🔒","Le numéro n’est pas affiché sur le site"],["🛡️","Les échanges sont modérés"],["✅","Les profils pro sont vérifiés avant accès"],
      ].map(([icon,text])=><div key={text} style={{display:"flex",gap:9,alignItems:"center",fontSize:13,color:"#555",lineHeight:1.45}}><span style={{fontSize:20}}>{icon}</span><span>{text}</span></div>)}</div>
    </section>

    <header style={{textAlign:"center",margin:"34px 0 20px"}}>
      <p style={{color:RED,fontWeight:900,fontSize:11,letterSpacing:1.4,textTransform:"uppercase",margin:"0 0 7px"}}>Pour aller plus loin</p>
      <h3 style={{color:"#26215C",fontSize:isMobile?24:30,margin:"0 0 8px"}}>Autres réseaux utiles de la diaspora</h3>
      <p style={{color:"#666",fontSize:14,lineHeight:1.6,maxWidth:680,margin:"0 auto"}}>Une sélection indépendante de groupes et annuaires externes.</p>
    </header>
    <section aria-label="Groupes et réseaux de la diaspora malagasy" style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:14,marginBottom:20}}>
      {communityLinks.map(([platform,title,text,url,color])=><article key={title} style={publicCard}>
        <span style={{display:"inline-block",background:`${color}18`,color,fontSize:10,fontWeight:900,textTransform:"uppercase",letterSpacing:1,borderRadius:99,padding:"5px 9px"}}>{platform}</span>
        <h3 style={{color:"#26215C",fontSize:18,margin:"12px 0 7px"}}>{title}</h3>
        <p style={{color:"#666",fontSize:13,lineHeight:1.55,minHeight:isMobile?0:62,margin:"0 0 14px"}}>{text}</p>
        <a href={url} target="_blank" rel="noopener noreferrer" style={{display:"inline-block",background:color,color:WHITE,textDecoration:"none",borderRadius:12,padding:"10px 14px",fontWeight:800,fontSize:13}}>Voir le groupe ou le site ↗</a>
      </article>)}
    </section>
    <section style={{...publicCard,background:"linear-gradient(135deg,#fff6f7,#f1faf5)",textAlign:"center"}}>
      <h3 style={{color:"#26215C",fontSize:19,margin:"0 0 8px"}}>Vous connaissez un groupe utile ?</h3>
      <p style={{color:"#555",fontSize:14,lineHeight:1.7,margin:"0 0 14px"}}>Signalez-nous les communautés régionales, étudiantes, professionnelles ou culturelles qui devraient apparaître ici.</p>
      <button onClick={()=>onGoto("community")} style={{background:GREEN,color:WHITE,border:"none",borderRadius:99,padding:"11px 18px",fontWeight:800,cursor:"pointer"}}>Partager avec la communauté</button>
    </section>
  </main>
}

const communityInputStyle={width:"100%",boxSizing:"border-box",border:"1px solid #e1d8db",background:WHITE,borderRadius:10,padding:"10px 11px",fontSize:13,fontFamily:"inherit",color:"#29262d"}

function AboutPage({isMobile,onGoto}) {
  return <main style={publicPageShell}>
    <header style={{textAlign:"center",marginBottom:26}}>
      <p style={{color:RED,fontWeight:900,fontSize:12,letterSpacing:1.5,textTransform:"uppercase",margin:"0 0 8px"}}>Notre mission</p>
      <h2 style={{color:"#26215C",fontSize:isMobile?28:38,lineHeight:1.12,margin:"0 0 12px"}}>À propos de Malagasy Events</h2>
      <p style={{color:"#666",fontSize:16,lineHeight:1.65,maxWidth:720,margin:"0 auto"}}>La plateforme qui rassemble les événements, les acteurs et les bonnes adresses de la communauté malagasy en France.</p>
    </header>
    <section style={{...publicCard,marginBottom:18}}>
      <h3 style={{color:"#26215C",fontSize:21,margin:"0 0 10px"}}>Rendre la diaspora plus visible et plus proche</h3>
      <p style={{color:"#555",lineHeight:1.75,margin:0}}>Malagasy Events est né pour faciliter la découverte des soirées gasy, concerts, festivals, rencontres sportives et initiatives culturelles organisés partout en France. Le projet valorise également les associations, artistes, restaurants, traiteurs, boutiques, artisans et églises qui font vivre la communauté.</p>
    </section>
    <section style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:16,marginBottom:22}}>
      {[
        ["📅","Un agenda utile","Retrouver les prochaines sorties malagasy par ville, date et catégorie."],
        ["🤝","Une communauté","Créer des passerelles entre le public, les associations et les organisateurs."],
        ["🇲🇬","Une vitrine","Mettre en valeur la culture malgache et les initiatives de la diaspora en France."],
      ].map(([icon,title,text])=><article key={title} style={publicCard}><div style={{fontSize:26}}>{icon}</div><h3 style={{color:"#26215C",fontSize:17,margin:"8px 0"}}>{title}</h3><p style={{color:"#666",fontSize:14,lineHeight:1.6,margin:0}}>{text}</p></article>)}
    </section>
    <div style={{textAlign:"center"}}><button onClick={()=>onGoto("home")} style={{background:RED,color:WHITE,border:"none",borderRadius:99,padding:"13px 22px",fontWeight:800,cursor:"pointer"}}>Découvrir les événements →</button></div>
  </main>
}

function GuidePage({isMobile}) {
  const [query,setQuery]=useState("")
  const [category,setCategory]=useState(null)
  const [article,setArticle]=useState(null)
  const [checked,setChecked]=useState({})
  const categories=[
    {id:"etudes",icon:"🎓",title:"Étudier en France",desc:"Campus France, visa étudiant, CVEC, inscription, alternance et bourses.",count:7,color:"#eaf7ef",topics:["Le parcours étudiant depuis Madagascar","Les premières démarches à l’arrivée","Renouveler son titre étudiant","Trouver une alternance","Bourses et aides étudiantes"]},
    {id:"sejour",icon:"🪪",title:"Visa & séjour",desc:"VLS-TS, renouvellement, changement de statut et naturalisation.",count:7,color:"#fff0f1",topics:["Valider son visa VLS-TS","Renouveler son titre de séjour","Passer du statut étudiant au statut salarié","Demander la nationalité française"]},
    {id:"logement",icon:"🏠",title:"Se loger",desc:"Crous, Visale, CAF, Action Logement et dossier locatif.",count:8,color:"#fff7e8",topics:["Préparer un dossier locatif solide","Demander la garantie Visale","Trouver un logement étudiant","Demander une aide au logement"]},
    {id:"sante",icon:"🩺",title:"Santé",desc:"Assurance Maladie, carte Vitale, mutuelle, médecin et urgences.",count:6,color:"#eef7ff",topics:["S’inscrire à l’Assurance Maladie","Obtenir sa carte Vitale","Choisir une mutuelle","Trouver un médecin"]},
    {id:"travail",icon:"💼",title:"Travailler",desc:"Emploi étudiant, autorisation de travail et recherche d’emploi.",count:6,color:"#f3efff",topics:["Travailler pendant ses études","Chercher son premier emploi","Vérifier une autorisation de travail","Faire reconnaître son diplôme"]},
    {id:"argent",icon:"💶",title:"Argent & aides",desc:"Compte bancaire, CAF, impôts, budget et aides disponibles.",count:8,color:"#edf8f4",topics:["Ouvrir un compte bancaire","Comprendre les aides CAF","Déclarer ses revenus","Construire son budget d’arrivée"]},
    {id:"transport",icon:"🚗",title:"Transport & conduite",desc:"Permis malgache, échange de permis et abonnements de transport.",count:4,color:"#eef4ff",topics:["Conduire avec un permis malgache","Demander un échange de permis","Choisir son abonnement de transport"]},
    {id:"voyage",icon:"✈️",title:"Voyager à Madagascar",desc:"Billets d’avion, bagages, documents et agences vérifiées.",count:4,color:"#fff2e8",topics:["Préparer un voyage France–Madagascar","Comparer les billets d’avion","Voyager avec des bagages supplémentaires","Vérifier une agence de voyages"]},
    {id:"entreprendre",icon:"🏢",title:"Entreprendre",desc:"Microentreprise, association, obligations et aides à la création.",count:4,color:"#f2f2f8",topics:["Créer une microentreprise","Créer une association","Choisir son statut","Trouver les aides à la création"]},
    {id:"famille",icon:"👨‍👩‍👧",title:"Famille",desc:"Regroupement familial, naissance, mariage et scolarité.",count:4,color:"#fff0f5",topics:["Faire venir sa famille","Déclarer une naissance","Inscrire un enfant à l’école","Faire reconnaître un mariage"]},
    {id:"droits",icon:"⚖️",title:"Droits & recours",desc:"Préfecture, Point-justice, Défenseur des droits et aide juridique.",count:5,color:"#f6f1ea",topics:["Quand la préfecture bloque","Trouver un Point-justice","Demander l’aide juridictionnelle","Éviter les faux intermédiaires"]},
    {id:"bons-plans",icon:"🧭",title:"Guide de la plateforme",desc:"Le mode d’emploi complet de Malagasy Events, avec ou sans compte.",count:7,color:"#edf8f1",topics:["Comprendre tous les onglets","Trouver et suivre un événement","Explorer les annuaires","Utiliser les petites annonces","Publier dans la communauté","Utiliser les messages et notifications","Gérer son compte et proposer un événement"]},
  ]
  const guideDetails={
    etudes:{
      audience:"Étudiants admis ou en préparation",timing:"Avant le départ puis à l’arrivée",cost:"CVEC et titres selon situation",
      intro:"De l’admission à la carte étudiante : les démarches à faire depuis Madagascar, puis celles à terminer en France.",
      steps:[["Confirmer l’admission","Vérifie l’attestation d’admission, le calendrier de l’établissement et les consignes Campus France."],["Préparer le séjour","Réunis le passeport, le visa, les justificatifs financiers et une solution de logement pour l’arrivée."],["Finaliser l’inscription","Règle la CVEC si tu y es assujetti, puis termine l’inscription administrative auprès de l’établissement."],["Activer tes droits","Valide le VLS-TS lorsque c’est requis et inscris-toi à l’Assurance Maladie étudiante."]],
      docs:["Passeport en cours de validité","Visa ou titre de séjour correspondant","Attestation d’admission ou de scolarité","Justificatif de domicile en France","RIB français — pour les remboursements santé"],
      links:[["Campus France Madagascar","https://www.madagascar.campusfrance.org/"],["Valider un VLS-TS — ANEF","https://administration-etrangers-en-france.interieur.gouv.fr/particuliers/#/"],["CVEC — site officiel","https://cvec.etudiant.gouv.fr/"],["Assurance Maladie étudiante","https://etudiant-etranger.ameli.fr/"]],
      note:"Le RIB est demandé pour recevoir les remboursements de santé ; les pièces exactes du visa dépendent du dossier Campus France et du consulat."
    },
    sejour:{
      audience:"Étrangers non européens en France",timing:"2 à 4 mois avant l’échéance",cost:"Taxe variable selon le titre",
      intro:"Valider, renouveler ou faire évoluer son droit au séjour sans rater l’échéance ni utiliser un faux intermédiaire.",
      steps:[["Identifier le bon titre","Pars de la mention inscrite sur ton visa ou ta carte actuelle et de ton motif de séjour."],["Contrôler la date limite","Pour un titre étudiant, la demande se fait généralement entre 4 et 2 mois avant la fin de validité."],["Préparer les preuves","Réunis les justificatifs de domicile, de ressources et ceux liés au motif de séjour demandé."],["Déposer et conserver","Utilise l’ANEF ou la procédure indiquée par la préfecture et garde l’attestation de dépôt."]],
      docs:["Passeport et pages utiles","Visa, VLS-TS ou titre actuel","Justificatif de domicile récent","Justificatifs de ressources","Justificatif lié au motif — études, travail ou famille"],
      links:[["ANEF — démarches en ligne","https://administration-etrangers-en-france.interieur.gouv.fr/particuliers/#/"],["Fiche officielle étudiant étranger","https://www.service-public.fr/particuliers/vosdroits/F2231"],["Annuaire des préfectures","https://lannuaire.service-public.fr/navigation/prefecture"]],
      note:"Le portail et les pièces varient selon le titre demandé. Vérifie toujours la fiche Service-Public correspondant exactement à ta situation."
    },
    logement:{
      audience:"Locataires et étudiants",timing:"Avant les visites",cost:"Démarches gratuites",
      intro:"Construire un dossier crédible, trouver une garantie et demander les aides sans transmettre ses papiers n’importe où.",
      steps:[["Définir le budget réel","Additionne loyer, charges, assurance, dépôt de garantie, énergie et transport."],["Créer un dossier sécurisé","Prépare les justificatifs sur DossierFacile afin d’éviter de diffuser des copies non protégées."],["Vérifier la garantie","Teste ton éligibilité à Visale avant de signer et lis attentivement le bail."],["Demander l’aide adaptée","Une fois le logement occupé, simule puis demande l’aide au logement auprès de la CAF."]],
      docs:["Pièce d’identité ou titre de séjour","Justificatif étudiant ou professionnel","Justificatifs de ressources adaptés","Avis d’imposition — si disponible ou demandé","Bail signé — uniquement pour la demande d’aide"],
      links:[["DossierFacile","https://www.dossierfacile.logement.gouv.fr/"],["Garantie Visale","https://www.visale.fr/"],["Logement étudiant — Crous","https://www.messervices.etudiant.gouv.fr/"],["Aides au logement — CAF","https://www.caf.fr/allocataires/aides-et-demarches/droits-et-prestations/logement"]],
      note:"Ne verse jamais d’argent avant une visite réelle ou une vérification sérieuse du logement et du bailleur."
    },
    sante:{
      audience:"Nouveaux arrivants et assurés",timing:"Dès l’installation",cost:"Affiliation gratuite",
      intro:"Obtenir une couverture, suivre son dossier, recevoir la carte Vitale et choisir les bons professionnels de santé.",
      steps:[["Ouvrir les droits","Utilise le parcours correspondant à ton statut : étudiant étranger, salarié ou autre situation."],["Déposer les pièces","Envoie des documents lisibles et complets, puis télécharge l’attestation provisoire si elle est disponible."],["Finaliser l’immatriculation","Réponds aux demandes de pièce d’état civil pour obtenir le numéro définitif."],["Organiser les soins","Crée le compte ameli, demande la carte Vitale et déclare un médecin traitant."]],
      docs:["Passeport ou pièce d’identité","Titre de séjour — selon situation","Acte de naissance complet et lisible — si demandé","Attestation de scolarité ou contrat de travail","RIB pour les remboursements"],
      links:[["Étudiant étranger — inscription","https://etudiant-etranger.ameli.fr/"],["Droits des étudiants étrangers — ameli","https://www.ameli.fr/assure/droits-demarches/europe-international/protection-sociale-france/vous-venez-etudier-en-france"],["Annuaire Santé","https://annuairesante.ameli.fr/"],["Compte ameli","https://assure.ameli.fr/"]],
      note:"La carte Vitale vient après l’ouverture et la certification des droits : on ne peut pas toujours la commander dès le premier jour."
    },
    travail:{
      audience:"Étudiants, salariés et candidats",timing:"Avant d’accepter un emploi",cost:"Services publics gratuits",
      intro:"Vérifier le droit de travailler, préparer une candidature française et faire reconnaître un diplôme lorsque c’est utile.",
      steps:[["Vérifier le droit au travail","Contrôle ce que permet ton titre. Un titre étudiant autorise normalement un travail limité à 964 heures par an."],["Adapter la candidature","Prépare un CV clair, les preuves d’expérience et une version française des documents utiles."],["Cibler les offres fiables","Passe par France Travail, l’APEC ou les services carrière de l’établissement."],["Sécuriser l’embauche","Lis le contrat, le salaire, les horaires et vérifie qui doit demander une autorisation de travail."]],
      docs:["Titre de séjour ou visa autorisant le travail","CV adapté au poste","Diplômes et attestations d’expérience","Traductions par traducteur agréé — si exigées","Contrat ou promesse d’embauche — pour certaines démarches"],
      links:[["Règles de travail des étrangers","https://www.service-public.fr/particuliers/vosdroits/F2728"],["France Travail","https://www.francetravail.fr/"],["APEC — cadres et jeunes diplômés","https://www.apec.fr/"],["Reconnaissance des diplômes — ENIC-NARIC","https://www.france-education-international.fr/expertises/enic-naric"]],
      note:"Une attestation de comparabilité n’est pas obligatoire pour tous les métiers ; demande-la seulement si l’employeur ou la profession l’exige."
    },
    argent:{
      audience:"Personnes installées en France",timing:"Dès que l’adresse est stable",cost:"Simulations gratuites",
      intro:"Ouvrir un compte, connaître ses droits et organiser un budget d’arrivée sans confondre aide possible et aide garantie.",
      steps:[["Lister les dépenses fixes","Loyer, transport, alimentation, téléphone, assurance et frais de séjour doivent être visibles dans un seul budget."],["Ouvrir un compte adapté","Compare les frais et demande un refus écrit si tu dois utiliser la procédure du droit au compte."],["Simuler les droits","Utilise les simulateurs officiels avec ta situation réelle ; le résultat reste indicatif."],["Garder les justificatifs","Classe revenus, loyers et changements de situation pour la CAF et la déclaration fiscale."]],
      docs:["Pièce d’identité","Justificatif de domicile","Titre de séjour — selon l’établissement","Justificatifs de revenus et de loyer","RIB une fois le compte ouvert"],
      links:[["Simulateur des droits sociaux","https://www.mesdroitssociaux.gouv.fr/"],["CAF — aides et démarches","https://www.caf.fr/allocataires/aides-et-demarches"],["Impôts — espace particulier","https://www.impots.gouv.fr/accueil"],["Droit au compte — Banque de France","https://www.banque-france.fr/fr/a-votre-service/particuliers/faire-valoir-droit-au-compte-bancaire"]],
      note:"Un simulateur ne vaut pas décision d’attribution. Déclare rapidement tout changement à l’organisme concerné."
    },
    transport:{
      audience:"Conducteurs et usagers des transports",timing:"Avant de conduire ou de s’abonner",cost:"Variable selon la démarche",
      intro:"Savoir si le permis malgache est utilisable, quand demander un échange et choisir un abonnement correspondant à sa région.",
      steps:[["Vérifier la durée de validité","Les règles diffèrent selon la durée du séjour, le statut et la date d’installation en France."],["Contrôler l’échangeabilité","Consulte la liste officielle et les conditions avant d’engager une traduction ou une demande."],["Préparer la preuve de résidence","La date de début de résidence normale peut déterminer le délai disponible pour l’échange."],["Comparer les abonnements","Regarde les tarifs jeunes, étudiants, employeurs et solidaires de ton réseau local."]],
      docs:["Permis malgache original valide","Traduction officielle — lorsque requise","Passeport et titre de séjour","Justificatif de domicile","Preuve de la date d’installation — selon la demande"],
      links:[["Conduire en France avec un permis étranger","https://www.service-public.fr/particuliers/vosdroits/F1459"],["Permis de conduire — ANTS","https://permisdeconduire.ants.gouv.fr/"],["Transports en Île-de-France","https://www.iledefrance-mobilites.fr/titres-et-tarifs"]],
      note:"Ne lance pas une demande d’échange uniquement sur la base d’un conseil privé : vérifie d’abord les conditions officielles liées à ton titre."
    },
    voyage:{
      audience:"Voyageurs France–Madagascar",timing:"Avant l’achat du billet",cost:"Selon transporteur et documents",
      intro:"Vérifier les documents, l’agence et les conditions du billet avant de payer un voyage vers Madagascar.",
      steps:[["Contrôler les documents","Vérifie passeport, droit au retour en France et éventuelles formalités de transit."],["Comparer le trajet complet","Regarde bagages, correspondances, aéroports, modification et remboursement — pas seulement le prix affiché."],["Vérifier le vendeur","Pour une agence française, consulte son immatriculation officielle avant le paiement."],["Conserver les preuves","Archive billet, facture, conditions tarifaires et confirmation de paiement."]],
      docs:["Passeport valide","Titre de séjour français valide pour le retour","Billet et confirmations de correspondance","Assurance voyage — si choisie ou exigée","Justificatifs spécifiques pour mineur — si concerné"],
      links:[["Conseils aux voyageurs — Madagascar","https://www.diplomatie.gouv.fr/fr/conseils-aux-voyageurs/conseils-par-pays-destination/madagascar/"],["Registre officiel des opérateurs de voyage","https://registre-operateurs-de-voyages.atout-france.fr/"],["Droits des passagers aériens","https://www.service-public.fr/particuliers/vosdroits/F10977"]],
      note:"Il n’existe pas de comparateur public unique garantissant le meilleur prix. Les liens commerciaux devront être clairement identifiés comme tels."
    },
    entreprendre:{
      audience:"Créateurs d’activité ou d’association",timing:"Avant de facturer ou collecter",cost:"Variable selon la structure",
      intro:"Choisir une forme adaptée, déclarer l’activité au bon endroit et distinguer clairement entreprise et association.",
      steps:[["Définir l’activité","Écris ce que tu vends, à qui, avec quels risques et quel revenu prévisible."],["Choisir la structure","Compare microentreprise, société et association selon le but lucratif, les associés et la responsabilité."],["Déclarer officiellement","Les formalités d’entreprise passent par le guichet unique ; une association suit sa propre procédure."],["Organiser les obligations","Prévois factures, compte dédié si nécessaire, assurances, déclarations et protection des données."]],
      docs:["Pièce d’identité","Justificatif de domicile","Description précise de l’activité","Adresse du siège","Statuts — pour société ou association"],
      links:[["Guichet unique des entreprises — INPI","https://procedures.inpi.fr/"],["Créer une association — Service-Public","https://www.service-public.fr/particuliers/vosdroits/F1119"],["Autoentrepreneur — Urssaf","https://www.autoentrepreneur.urssaf.fr/portail/accueil.html"],["Aides à la création — Bpifrance","https://bpifrance-creation.fr/encyclopedie/aides-a-creation-reprise-dentreprise"]],
      note:"Une association n’est pas une microentreprise. Le choix dépend du projet ; en cas de doute, fais valider le montage par un professionnel."
    },
    famille:{
      audience:"Familles vivant entre France et Madagascar",timing:"Avant toute démarche internationale",cost:"Variable selon les actes",
      intro:"Identifier la bonne procédure pour la venue d’un proche, l’état civil ou la scolarité sans mélanger des démarches différentes.",
      steps:[["Qualifier la situation","Nationalité, lien familial, pays du mariage ou de la naissance et statut en France changent la procédure."],["Identifier l’autorité","Selon le cas : mairie, préfecture, Ofii, consulat ou service central d’état civil."],["Réunir les actes recevables","Vérifie si une copie intégrale, une traduction ou une légalisation est demandée."],["Suivre les deux pays","Une démarche française ne met pas automatiquement à jour l’état civil malgache, et inversement."]],
      docs:["Actes d’état civil correspondant à la demande","Passeports des personnes concernées","Justificatifs de domicile et de ressources — selon procédure","Preuve du lien familial","Traduction ou légalisation — seulement si exigée"],
      links:[["Regroupement familial — Service-Public","https://www.service-public.fr/particuliers/vosdroits/F11166"],["État civil français à l’étranger","https://www.diplomatie.gouv.fr/fr/services-aux-francais/etat-civil-et-nationalite-francaise/etat-civil/"],["Inscription à l’école primaire","https://www.service-public.fr/particuliers/vosdroits/F1864"]],
      note:"Le regroupement familial, la réunification familiale et le visa de conjoint sont des procédures différentes."
    },
    droits:{
      audience:"Toute personne confrontée à un litige",timing:"Dès le premier blocage",cost:"Première orientation gratuite",
      intro:"Conserver les preuves, demander une réponse écrite et trouver le bon recours ou accompagnement juridique.",
      steps:[["Constituer une chronologie","Note les dates, références de dossier, décisions et personnes contactées."],["Demander une trace écrite","Évite de dépendre uniquement d’un échange téléphonique ; garde accusés et captures."],["Choisir le bon recours","Médiation, recours administratif, Défenseur des droits ou tribunal ne répondent pas aux mêmes problèmes."],["Se faire accompagner","Un Point-justice peut orienter gratuitement avant une démarche plus lourde."]],
      docs:["Décision ou message contesté","Chronologie datée","Copies des demandes déjà envoyées","Accusés de réception","Justificatifs liés au préjudice"],
      links:[["Trouver un Point-justice","https://www.justice.fr/annuaire/point-justice"],["Défenseur des droits","https://www.defenseurdesdroits.fr/"],["Aide juridictionnelle","https://www.service-public.fr/particuliers/vosdroits/F18074"],["Signaler un problème de consommation","https://signal.conso.gouv.fr/"]],
      note:"Les délais de recours peuvent être courts. Une fiche d’information ne remplace pas l’avis d’un avocat sur un dossier individuel."
    },
    "bons-plans":{
      audience:"Visiteurs et membres",timing:"À tout moment",cost:"Compte gratuit",
      intro:"Tout ce qu’il faut savoir pour utiliser Malagasy Events : consulter, rechercher, publier, échanger et gérer son compte.",
      steps:[["Lire toute l’annonce","Vérifie le besoin, la ville, le prix, les conditions et la date de publication."],["Contrôler l’identité utile","Cherche un profil cohérent, des coordonnées vérifiables et des preuves adaptées au service."],["Échanger sur la plateforme","Ne transmets pas immédiatement pièce d’identité, coordonnées bancaires ou codes reçus par SMS."],["Signaler un problème","Utilise le signalement interne et, si nécessaire, la plateforme publique adaptée."]],
      docs:["Description précise de ton besoin","Budget ou tarif annoncé","Ville et disponibilité","Preuves du service — sans document sensible","Échanges et reçu en cas de paiement"],
      links:[["Petites annonces Malagasy Events","/petites-annonces"],["Conseils contre les arnaques en ligne","https://www.cybermalveillance.gouv.fr/tous-nos-contenus/bonnes-pratiques/arnaques-en-ligne"],["SignalConso","https://signal.conso.gouv.fr/"],["Service-Public — escroquerie","https://www.service-public.fr/particuliers/vosdroits/F1520"]],
      note:"Les offres de la communauté ne sont pas automatiquement des partenariats. Le statut “vérifié” devra être affiché seulement après contrôle."
    }
  }
  const topicSummaries={
    "Le parcours étudiant depuis Madagascar":"Le fil conducteur complet, depuis l’admission jusqu’aux premières démarches en France.",
    "Les premières démarches à l’arrivée":"Les actions prioritaires des premières semaines, sans tout faire dans le désordre.",
    "Renouveler son titre étudiant":"Le calendrier à respecter et les preuves d’études, de ressources et de domicile à préparer.",
    "Trouver une alternance":"Candidature, rythme de formation, employeur et vérification du droit au travail.",
    "Bourses et aides étudiantes":"Où simuler ses droits et quelles pièces préparer sans considérer une aide comme acquise.",
    "Valider son visa VLS-TS":"La validation en ligne à effectuer lorsque la mention du visa l’impose.",
    "Renouveler son titre de séjour":"Anticiper l’échéance et déposer la demande sur le portail correspondant.",
    "Passer du statut étudiant au statut salarié":"Relier diplôme, emploi proposé, autorisation de travail et nouveau titre demandé.",
    "Demander la nationalité française":"Identifier la procédure correspondant à son parcours et réunir les preuves exigées.",
    "Préparer un dossier locatif solide":"Présenter des justificatifs lisibles et protégés pour rassurer un bailleur.",
    "Demander la garantie Visale":"Tester son éligibilité et obtenir le visa avant la signature du bail.",
    "Trouver un logement étudiant":"Crous, résidences et recherche privée avec un budget complet.",
    "Demander une aide au logement":"Faire une simulation puis déclarer le logement réellement occupé à la CAF.",
    "S’inscrire à l’Assurance Maladie":"Choisir le parcours correspondant à son statut et obtenir une première attestation.",
    "Obtenir sa carte Vitale":"Finaliser le numéro de sécurité sociale avant de commander la carte.",
    "Choisir une mutuelle":"Comparer garanties, exclusions, délais et reste à charge selon ses besoins.",
    "Trouver un médecin":"Utiliser l’annuaire officiel et déclarer un médecin traitant quand c’est possible.",
    "Travailler pendant ses études":"Vérifier le nombre d’heures autorisé avant de signer le contrat.",
    "Chercher son premier emploi":"Préparer un CV ciblé et suivre chaque candidature jusqu’à la réponse.",
    "Vérifier une autorisation de travail":"Contrôler son titre et savoir si l’employeur doit faire une demande.",
    "Faire reconnaître son diplôme":"Vérifier si une attestation est nécessaire pour le métier recherché.",
    "Ouvrir un compte bancaire":"Comparer les frais et connaître la procédure du droit au compte en cas de refus.",
    "Comprendre les aides CAF":"Simuler, demander puis déclarer rapidement chaque changement de situation.",
    "Déclarer ses revenus":"Créer son espace fiscal et conserver les justificatifs de l’année concernée.",
    "Construire son budget d’arrivée":"Prévoir les dépenses uniques et mensuelles avant de s’engager.",
    "Conduire avec un permis malgache":"Vérifier les conditions liées au séjour avant de prendre le volant.",
    "Demander un échange de permis":"Contrôler l’échangeabilité et le délai avant de constituer le dossier.",
    "Choisir son abonnement de transport":"Comparer les tarifs du réseau local selon son âge, son statut et ses trajets réels.",
    "Préparer un voyage France–Madagascar":"Vérifier les papiers, le retour en France et les pays de transit.",
    "Comparer les billets d’avion":"Comparer le prix final, les bagages et les conditions de modification.",
    "Voyager avec des bagages supplémentaires":"Vérifier le poids autorisé sur chaque vol avant de payer un supplément.",
    "Vérifier une agence de voyages":"Contrôler l’agence dans le registre officiel avant tout paiement.",
    "Créer une microentreprise":"Déclarer l’activité au guichet unique et organiser les obligations dès la première facture.",
    "Créer une association":"Définir l’objet, les responsables, les statuts et la déclaration officielle.",
    "Choisir son statut":"Comparer les risques, les charges et la façon de travailler avant de choisir.",
    "Trouver les aides à la création":"Chercher les aides adaptées avant d’engager les premières dépenses.",
    "Faire venir sa famille":"Identifier la bonne procédure selon son titre et le lien familial.",
    "Déclarer une naissance":"Déclarer d’abord la naissance, puis mettre à jour les organismes concernés.",
    "Inscrire un enfant à l’école":"Contacter le bon service et préparer les documents demandés.",
    "Faire reconnaître un mariage":"Vérifier si une transcription ou une légalisation est nécessaire.",
    "Quand la préfecture bloque":"Transformer le blocage en dossier daté avec preuves et recours adapté.",
    "Trouver un Point-justice":"Préparer le problème et prendre rendez-vous avec la permanence adaptée.",
    "Demander l’aide juridictionnelle":"Vérifier les conditions puis déposer le dossier auprès du bon bureau.",
    "Éviter les faux intermédiaires":"Reconnaître les promesses suspectes et utiliser uniquement les portails officiels.",
    "Trouver les annonces de la communauté":"Filtrer, vérifier le profil et commencer l’échange sur la plateforme.",
    "Profiter des offres partenaires":"Vérifier le partenaire, le prix et les conditions avant d’acheter.",
    "Éviter les arnaques":"Contrôler l’offre, protéger ses données et garder les preuves avant tout paiement.",
    "Demander de l’entraide":"Décrire clairement le besoin sans publier d’information personnelle."
    ,"Comprendre tous les onglets":"Savoir où aller selon ce que tu cherches sur Malagasy Events."
    ,"Trouver et suivre un événement":"Trouver une sortie, vérifier les informations et ne pas oublier la date."
    ,"Explorer les annuaires":"Trouver rapidement une adresse, une structure ou un professionnel malagasy."
    ,"Utiliser les petites annonces":"Consulter une annonce ou publier gratuitement avec un compte."
    ,"Publier dans la communauté":"Partager une information et échanger avec les autres membres."
    ,"Utiliser les messages et notifications":"Retrouver ses échanges et les nouvelles activités qui nous concernent."
    ,"Gérer son compte et proposer un événement":"Compléter son profil et envoyer un événement à vérifier."
  }
  const topicAnswers={
    "Le parcours étudiant depuis Madagascar":"Commence par l’admission et Campus France à Madagascar. En France, les priorités sont ensuite la validation du VLS-TS si elle est exigée, la CVEC, l’inscription définitive et l’Assurance Maladie.",
    "Les premières démarches à l’arrivée":"Ne cherche pas à tout faire le même jour : sécurise d’abord ton logement et ton inscription, puis valide ton séjour et ouvre tes droits à la santé avec des justificatifs cohérents.",
    "Renouveler son titre étudiant":"N’attends pas l’expiration : la fiche officielle indique une demande entre 4 et 2 mois avant la fin du titre. Prépare surtout les preuves d’inscription, de progression réelle, de ressources et de domicile.",
    "Trouver une alternance":"Vérifie d’abord que la formation accepte l’alternance, puis cible des employeurs avec un CV adapté. Le contrat, le rythme de formation et ton droit au travail doivent être compatibles avant la signature.",
    "Bourses et aides étudiantes":"Commence par les simulateurs et ton établissement. Une bourse, l’aide au logement et une aide d’urgence répondent à des règles différentes : aucune ne doit être comptée comme acquise avant la décision officielle.",
    "Valider son visa VLS-TS":"Lis la mention portée sur le visa. Si une validation est demandée, elle se fait en ligne sur l’ANEF après l’arrivée ; conserve la confirmation et la preuve du paiement demandé.",
    "Renouveler son titre de séjour":"Repère la date d’expiration, le portail compétent et la liste exacte des pièces pour ton motif. Une attestation de dépôt n’a pas toujours les mêmes effets qu’une attestation de prolongation.",
    "Passer du statut étudiant au statut salarié":"Le diplôme obtenu, le poste, le salaire, le contrat et l’autorisation de travail éventuelle sont examinés ensemble. Ne quitte pas ton statut actuel sans avoir vérifié la procédure correspondant au nouvel emploi.",
    "Demander la nationalité française":"Naturalisation par décret, déclaration par mariage ou autre voie ne demandent pas les mêmes preuves. Commence par identifier la procédure qui correspond réellement à ton histoire familiale et à ta résidence.",
    "Préparer un dossier locatif solide":"Utilise DossierFacile pour présenter des copies protégées. Sépare les pièces du candidat de celles du garant et ne transmets jamais de document bancaire inutile.",
    "Demander la garantie Visale":"Teste ton éligibilité et obtiens le visa Visale avant de signer le bail. Le bailleur doit ensuite activer le contrat de cautionnement de son côté.",
    "Trouver un logement étudiant":"Dépose tôt la demande Crous, mais prévois aussi des solutions privées vérifiées. Compare le coût total et la distance réelle jusqu’au lieu d’études.",
    "Demander une aide au logement":"La demande se fait après l’entrée dans le logement avec les informations du bail. Le résultat du simulateur CAF reste indicatif jusqu’à l’étude du dossier.",
    "S’inscrire à l’Assurance Maladie":"Un étudiant venant de Madagascar utilise le portail étudiant étranger. Passeport, titre de séjour, attestation de scolarité et RIB font partie des pièces centrales indiquées par l’Assurance Maladie.",
    "Obtenir sa carte Vitale":"La priorité est d’abord l’ouverture puis la certification du numéro de sécurité sociale. La demande de carte Vitale devient possible après cette étape, pas automatiquement dès l’arrivée.",
    "Choisir une mutuelle":"Compare ce qui reste réellement à payer après l’Assurance Maladie : hospitalisation, optique, dentaire et délais de carence. Vérifie aussi ton éligibilité à la Complémentaire santé solidaire.",
    "Trouver un médecin":"Cherche dans l’Annuaire Santé, vérifie le secteur tarifaire et demande lors du rendez-vous si le médecin accepte d’être déclaré comme médecin traitant.",
    "Travailler pendant ses études":"Le titre étudiant permet normalement un emploi salarié dans la limite de 60 % de la durée annuelle, soit 964 heures. L’employeur doit néanmoins vérifier le titre avant l’embauche.",
    "Chercher son premier emploi":"Commence par un CV ciblé et des preuves d’expérience compréhensibles en France. France Travail, l’APEC et le service carrière de ton école ne couvrent pas exactement les mêmes offres.",
    "Vérifier une autorisation de travail":"Regarde la mention exacte du titre et le volume de travail prévu. Si une autorisation est nécessaire, la démarche relève généralement de l’employeur avant le début du contrat.",
    "Faire reconnaître son diplôme":"L’attestation ENIC-NARIC aide à situer un diplôme étranger, mais elle ne remplace pas l’autorisation d’exercer une profession réglementée.",
    "Ouvrir un compte bancaire":"Demande la liste des pièces avant le rendez-vous. En cas de refus, exige une attestation écrite afin de pouvoir utiliser la procédure gratuite du droit au compte.",
    "Comprendre les aides CAF":"Les droits dépendent notamment du logement, des ressources et de la composition du foyer. Fais la simulation avec la situation réelle puis déclare chaque changement.",
    "Déclarer ses revenus":"Même avec peu ou pas d’impôt à payer, une première déclaration peut être nécessaire pour obtenir un avis fiscal. Conserve salaires, bourses imposables et justificatifs de l’année.",
    "Construire son budget d’arrivée":"Sépare les dépenses uniques — dépôt, installation, transport — des charges mensuelles. Garde une marge pour les délais de remboursement et d’ouverture des aides.",
    "Conduire avec un permis malgache":"Avec un titre de séjour étudiant valide, le permis étranger peut être reconnu pendant les études sous réserve des conditions françaises de validité. Pour les autres résidents, la conduite avec un permis hors Europe est en principe limitée à la première année de résidence normale.",
    "Demander un échange de permis":"Utilise d’abord le simulateur officiel pour vérifier si le permis malgache et sa catégorie sont échangeables. Si le pays ou la catégorie n’est pas admis, il faut passer l’examen français ; un étudiant ne demande normalement pas l’échange pendant son statut étudiant.",
    "Choisir son abonnement de transport":"Commence par ton réseau local et ton trajet réel. Compare abonnement étudiant ou jeune, tarification solidaire et participation éventuelle de l’employeur au lieu de choisir une formule nationale par défaut.",
    "Préparer un voyage France–Madagascar":"Vérifie séparément le droit d’entrer à Madagascar, le droit de revenir en France et les règles de chaque pays de transit. Un billet valide ne garantit pas à lui seul ces trois points.",
    "Comparer les billets d’avion":"Compare le prix final avec bagages, correspondances, aéroport, modification et remboursement. Vérifie l’identité du vendeur avant de payer.",
    "Voyager avec des bagages supplémentaires":"Les franchises changent selon le billet et les compagnies de chaque segment. Fais confirmer par écrit le poids, le nombre de pièces et le tarif avant le départ.",
    "Vérifier une agence de voyages":"Recherche l’entreprise dans le registre Atout France, contrôle ses mentions légales et paie par un moyen traçable. Une page sur un réseau social ne prouve pas son immatriculation.",
    "Créer une microentreprise":"Déclare l’activité sur le guichet unique de l’INPI, puis organise factures, déclarations de chiffre d’affaires et assurances nécessaires avant de commencer à vendre.",
    "Créer une association":"Définis l’objet, les dirigeants, le siège et les règles dans les statuts. La déclaration officielle vient ensuite ; une association n’est pas destinée à partager des bénéfices entre ses membres.",
    "Choisir son statut":"Compare responsabilité, associés, protection sociale, fiscalité et besoin d’investissement. Le statut le plus simple n’est pas forcément le plus adapté au projet.",
    "Trouver les aides à la création":"Recherche les aides selon la ville, le profil et le stade du projet. Vérifie les conditions avant l’immatriculation car certains dispositifs exigent une demande préalable.",
    "Faire venir sa famille":"Commence par identifier la procédure exacte : regroupement familial, réunification familiale ou visa de membre de famille. Elles ne concernent pas les mêmes personnes.",
    "Déclarer une naissance":"La déclaration auprès de l’état civil du lieu de naissance est prioritaire. Vérifie ensuite les démarches consulaires ou de transcription liées aux nationalités des parents.",
    "Inscrire un enfant à l’école":"Contacte d’abord la mairie pour le primaire, avec identité, domicile et vaccinations ; pour le collège ou le lycée, l’affectation suit une autre procédure.",
    "Faire reconnaître un mariage":"Le pays du mariage et la nationalité de chaque époux déterminent s’il faut une transcription ou une autre formalité. Ne confonds pas reconnaissance de l’acte et droit au séjour.",
    "Quand la préfecture bloque":"Construis une chronologie avec dépôt, attestations, courriers et échéances. Le bon recours dépend de l’existence d’une décision, d’un silence ou d’un simple retard.",
    "Trouver un Point-justice":"Les Points-justice donnent une première information gratuite et confidentielle. Choisis le lieu ou la permanence correspondant au problème rencontré.",
    "Demander l’aide juridictionnelle":"Vérifie les ressources prises en compte, la juridiction et l’avocat éventuel avant de déposer. Cette aide concerne les frais de justice, pas toutes les démarches administratives.",
    "Éviter les faux intermédiaires":"Une personne ne peut pas garantir un titre, un logement ou une décision administrative. Vérifie le domaine officiel et ne communique jamais un code de connexion reçu par SMS.",
    "Trouver les annonces de la communauté":"Filtre par ville, catégorie et date, puis vérifie le profil avant de partager tes coordonnées. Utilise la messagerie de la plateforme pour les premiers échanges.",
    "Profiter des offres partenaires":"Une offre partenaire doit afficher l’entreprise, les conditions, la durée et le rôle exact de Malagasy Events. Sans ces éléments, considère-la comme une annonce ordinaire.",
    "Éviter les arnaques":"Refuse l’urgence artificielle, les paiements non traçables et les demandes de codes. Conserve l’annonce et les échanges pour pouvoir signaler correctement.",
    "Demander de l’entraide":"Décris le besoin, la ville, la date et ce qui a déjà été essayé, sans publier de document personnel. Une demande précise obtient des réponses plus utiles."
  }
  const topicDocs={
    "Le parcours étudiant depuis Madagascar":["J’ai obtenu une admission écrite et vérifié la procédure Campus France Madagascar","J’ai obtenu le visa correspondant à mes études et préparé une copie numérique du dossier","J’ai prévu une adresse pour l’arrivée et un budget couvrant les premières semaines","J’ai réglé la CVEC si mon établissement et ma situation l’exigent","Après l’arrivée, j’ai validé mon VLS-TS et lancé l’inscription à l’Assurance Maladie"],
    "Les premières démarches à l’arrivée":["J’ai une adresse utilisable et un justificatif de domicile conforme","J’ai finalisé mon inscription et récupéré mon certificat de scolarité","J’ai validé mon VLS-TS sur l’ANEF si la mention de mon visa l’impose","J’ai ouvert un compte bancaire ou obtenu un RIB utilisable","J’ai déposé mon dossier sur le portail étudiant étranger de l’Assurance Maladie"],
    "Renouveler son titre étudiant":["J’ai noté la date d’expiration et programmé le dépôt entre 4 et 2 mois avant cette date","J’ai une inscription ou préinscription pour l’année suivante","J’ai réuni mes relevés de notes, résultats et preuves du sérieux des études","J’ai préparé mes justificatifs de ressources et de domicile récents","J’ai déposé sur le portail indiqué et sauvegardé l’attestation reçue"],
    "Trouver une alternance":["J’ai confirmé que ma formation accepte l’alternance et connaît le rythme prévu","Mon CV indique clairement le diplôme préparé, le rythme et la date de disponibilité","J’ai ciblé des offres compatibles avec mon niveau et mon domaine","J’ai vérifié avec l’école et l’employeur mon droit au travail avant la signature","J’ai relu le type de contrat, le salaire, les horaires et la période d’essai"],
    "Bourses et aides étudiantes":["J’ai demandé à mon établissement les aides ouvertes aux étudiants internationaux","J’ai simulé séparément bourse, logement et aides d’urgence sur les portails officiels","J’ai réuni certificat de scolarité, ressources, domicile et RIB selon l’aide","J’ai vérifié la date limite avant de déposer","Je n’intègre l’aide à mon budget qu’après réception d’une décision officielle"],
    "Valider son visa VLS-TS":["J’ai vérifié que mon visa porte bien une mention imposant la validation","Je dispose de mon numéro de visa, de ma date d’entrée et d’une adresse en France","J’ai effectué la validation sur l’ANEF dans le délai indiqué","J’ai payé la taxe uniquement sur le parcours officiel lorsqu’elle était demandée","J’ai téléchargé et sauvegardé la confirmation de validation"],
    "Renouveler son titre de séjour":["J’ai identifié le titre exact à renouveler et le portail correspondant","J’ai noté l’échéance et commencé le dossier avant la période limite","J’ai réuni passeport, titre actuel, domicile, ressources et preuves du motif de séjour","J’ai contrôlé que chaque document est lisible, complet et récent","J’ai conservé l’attestation de dépôt et vérifié les messages du portail"],
    "Passer du statut étudiant au statut salarié":["J’ai vérifié que le diplôme et l’emploi permettent la procédure visée","Je dispose d’un contrat ou d’une promesse précisant poste, durée et rémunération","L’employeur a vérifié s’il doit demander une autorisation de travail","J’ai préparé diplôme, ancien titre, domicile et justificatifs professionnels","J’ai déposé avant l’expiration du titre étudiant et conservé la preuve"],
    "Demander la nationalité française":["J’ai identifié la bonne voie : décret, mariage, ascendant, frère ou sœur","J’ai vérifié les conditions de durée de résidence et de régularité du séjour","J’ai réuni les actes d’état civil et vérifié traduction ou légalisation si nécessaire","J’ai préparé les preuves de revenus, domicile, situation fiscale et intégration demandées","J’ai utilisé uniquement le portail ou l’autorité indiqué pour cette procédure"],
    "Préparer un dossier locatif solide":["J’ai créé un dossier protégé sur DossierFacile","J’ai séparé clairement mes pièces de celles de mon garant","J’ai ajouté identité, situation, ressources et justificatif de domicile adaptés","J’ai masqué les informations bancaires inutiles et ajouté un filigrane aux copies","Je n’envoie le dossier complet qu’après avoir vérifié le logement et l’interlocuteur"],
    "Demander la garantie Visale":["J’ai testé mon éligibilité sur Visale avant de signer le bail","J’ai créé mon espace avec des informations identiques à mes justificatifs","J’ai transmis les pièces demandées et obtenu le visa Visale","J’ai contrôlé la durée de validité et le loyer maximal couverts","J’ai envoyé le visa au bailleur pour qu’il crée le cautionnement avant la signature"],
    "Trouver un logement étudiant":["J’ai calculé le budget total avec charges, assurance, énergie et transport","J’ai déposé ma demande Crous sans attendre le dernier moment","J’ai préparé un dossier locatif protégé et une solution de garantie","J’ai vérifié le trajet réel entre le logement et l’établissement","J’ai visité ou fait vérifier le logement avant tout versement"],
    "Demander une aide au logement":["J’ai signé le bail et j’occupe réellement le logement déclaré","J’ai simulé mon droit sur la CAF avec ma situation exacte","J’ai préparé bail, montant du loyer, coordonnées du bailleur, ressources et RIB","J’ai déposé la demande avec la date réelle d’entrée dans les lieux","J’ai déclaré ensuite tout changement de logement, ressources ou situation familiale"],
    "S’inscrire à l’Assurance Maladie":["J’ai choisi le parcours correspondant à mon statut, notamment étudiant étranger si je suis concerné","J’ai préparé passeport, titre de séjour, attestation de scolarité ou contrat et adresse française","J’ai ajouté un RIB pour permettre les remboursements","J’ai déposé des copies complètes et lisibles sur le portail officiel","J’ai téléchargé l’attestation provisoire et répondu aux demandes complémentaires"],
    "Obtenir sa carte Vitale":["Mes droits à l’Assurance Maladie sont ouverts","Mon numéro de sécurité sociale est définitif et certifié","J’ai créé mon compte ameli si le service me le permet","J’ai transmis photo et pièce d’identité par le parcours demandé","À réception, j’ai vérifié les informations et mis la carte à jour"],
    "Choisir une mutuelle":["J’ai vérifié d’abord ce que rembourse déjà l’Assurance Maladie","J’ai estimé mes besoins réels en hospitalisation, dentaire, optique et consultations","J’ai vérifié mon éligibilité à la Complémentaire santé solidaire","J’ai comparé cotisation, plafonds, exclusions et délais de carence","J’ai lu les conditions de résiliation avant de signer"],
    "Trouver un médecin":["J’ai recherché le professionnel dans l’Annuaire Santé officiel","J’ai vérifié la spécialité, le secteur tarifaire et l’adresse","J’ai demandé si le cabinet accepte de nouveaux patients","J’ai apporté carte Vitale ou attestation de droits et moyen de paiement","J’ai demandé la déclaration comme médecin traitant si le médecin l’accepte"],
    "Travailler pendant ses études":["J’ai vérifié que mon titre étudiant est valide et autorise l’activité prévue","J’ai calculé que le total annuel restera dans la limite applicable de 964 heures","J’ai transmis à l’employeur les éléments nécessaires à la vérification du titre","J’ai reçu un contrat écrit précisant horaires, salaire et missions","J’ai vérifié que le travail reste compatible avec l’assiduité et les études"],
    "Chercher son premier emploi":["J’ai choisi un métier cible au lieu d’envoyer le même CV partout","Mon CV montre résultats, compétences et niveau de français de façon vérifiable","J’ai préparé diplômes, attestations et références utiles","J’ai créé des alertes ciblées sur France Travail, APEC ou les plateformes du secteur","Je suis chaque candidature avec date, contact, relance et réponse"],
    "Vérifier une autorisation de travail":["J’ai lu la mention exacte de mon visa ou titre de séjour","J’ai vérifié si l’emploi et le nombre d’heures sont déjà autorisés","L’employeur a contrôlé le titre avant l’embauche","Si nécessaire, l’employeur a déposé la demande d’autorisation avant le début du travail","J’ai conservé contrat, récépissé et décision officielle"],
    "Faire reconnaître son diplôme":["J’ai vérifié si le métier visé est réglementé ou non","J’ai demandé à l’employeur ou l’école si une attestation ENIC-NARIC est réellement utile","J’ai préparé diplôme, relevés et traduction exigée","J’ai déposé la demande sur le portail officiel et payé uniquement le tarif affiché","Je distingue l’attestation de comparabilité de l’autorisation d’exercer"],
    "Ouvrir un compte bancaire":["J’ai comparé frais mensuels, carte, retraits, virements et découvert","J’ai préparé identité, domicile et titre de séjour selon la banque","J’ai demandé un document écrit si la banque refuse l’ouverture","En cas de refus, j’ai utilisé la procédure officielle du droit au compte","Après ouverture, j’ai sécurisé l’accès et conservé mon RIB"],
    "Comprendre les aides CAF":["J’ai créé une simulation avec mon logement, mon foyer et mes ressources réels","J’ai identifié précisément l’aide correspondant à mon besoin","J’ai préparé identité, titre, logement, ressources et RIB demandés","J’ai déposé la demande sans déclarer une situation future comme déjà acquise","J’ai signalé chaque changement et vérifié les messages de mon espace CAF"],
    "Déclarer ses revenus":["J’ai vérifié si je dois faire une première déclaration papier ou en ligne","J’ai réuni salaires, revenus étrangers, bourses imposables et justificatifs de l’année","J’ai déclaré mon adresse et ma situation au 1er janvier correctement","J’ai relu les montants préremplis avant validation","J’ai sauvegardé l’accusé puis l’avis d’imposition ou de non-imposition"],
    "Construire son budget d’arrivée":["J’ai listé dépôt de garantie, premier loyer, transport et frais d’installation","J’ai séparé les dépenses uniques des dépenses mensuelles","J’ai prévu l’alimentation, l’assurance, le téléphone et les frais de séjour","J’ai calculé une réserve pour les aides ou remboursements versés en retard","Je vérifie chaque semaine le réel par rapport au budget prévu"],
    "Conduire avec un permis malgache":["J’ai vérifié sur Service-Public la règle correspondant à mon statut : étudiant, court séjour ou résident","Mon permis malgache original est en cours de validité","J’ai une traduction officielle si le permis n’est pas rédigé en français","Je garde avec moi passeport et preuve de séjour régulier","Le véhicule est assuré et je dispose de ses documents obligatoires"],
    "Demander un échange de permis":["J’ai utilisé le simulateur officiel pour vérifier le pays et la catégorie du permis","J’ai confirmé que je suis dans le délai lié au début de ma résidence normale","Mon permis physique est valide et mes droits à conduire ne sont pas suspendus","J’ai obtenu l’attestation des droits à conduire et la traduction lorsqu’elles sont demandées","J’ai déposé sur France Titres et conservé la confirmation"],
    "Choisir son abonnement de transport":["J’ai identifié le réseau qui couvre réellement mes trajets quotidiens","J’ai comparé plein tarif, jeune ou étudiant et tarification solidaire","J’ai préparé identité, photo et justificatifs correspondant au tarif choisi","Si je travaille, j’ai demandé à l’employeur les modalités de prise en charge","J’ai choisi mensuel ou annuel après comparaison du coût réel et de la durée d’utilisation"],
    "Préparer un voyage France–Madagascar":["J’ai vérifié la validité du passeport et les conditions d’entrée à Madagascar","Mon titre français permet le retour à la date prévue","J’ai contrôlé les formalités de chaque pays de transit","J’ai relu bagages, horaires, aéroports et conditions de modification","J’ai enregistré billets, assurance éventuelle et contacts d’urgence hors ligne"],
    "Comparer les billets d’avion":["Je compare exactement les mêmes dates, aéroports et classes tarifaires","J’ai ajouté au prix les bagages, sièges, moyens de paiement et transferts","J’ai vérifié la durée et les conditions de transit","J’ai lu les règles de modification, annulation et remboursement","J’ai contrôlé l’identité du vendeur avant le paiement"],
    "Voyager avec des bagages supplémentaires":["J’ai vérifié la franchise de chaque segment du voyage","J’ai distingué nombre de pièces, poids par pièce et dimensions","J’ai comparé l’achat du supplément en ligne et à l’aéroport","J’ai fait confirmer par écrit le supplément lorsque plusieurs compagnies interviennent","J’ai gardé les objets essentiels et documents dans le bagage cabine autorisé"],
    "Vérifier une agence de voyages":["J’ai retrouvé l’entreprise dans le registre officiel Atout France","Les mentions légales correspondent au nom qui encaisse le paiement","J’ai reçu un prix final et des conditions écrites","Le paiement est traçable et le bénéficiaire correspond à l’entreprise","J’ai conservé facture, contrat, échanges et preuve de paiement"],
    "Créer une microentreprise":["J’ai défini précisément l’activité principale et vérifié si elle est réglementée","J’ai vérifié que mon titre de séjour autorise cette activité","J’ai déclaré la création sur le guichet unique de l’INPI","J’ai reçu et vérifié mes identifiants officiels avant de facturer","J’ai préparé factures, déclarations de chiffre d’affaires, compte et assurance nécessaires"],
    "Créer une association":["L’objet de l’association est clair et réellement non lucratif","Les fondateurs ont choisi les dirigeants et l’adresse du siège","Les statuts précisent décisions, adhésions, ressources et dissolution","La déclaration a été faite sur le portail officiel","J’ai organisé compte bancaire, assurance et registre des décisions selon les besoins"],
    "Choisir son statut":["J’ai chiffré revenu, dépenses, investissements et risques du projet","J’ai décidé si je travaille seul ou avec des associés","J’ai comparé responsabilité, fiscalité et protection sociale","J’ai vérifié la compatibilité du statut avec mon titre de séjour et l’activité","J’ai fait relire le choix si les enjeux financiers ou juridiques sont importants"],
    "Trouver les aides à la création":["J’ai défini le besoin exact : financement, accompagnement, exonération ou local","J’ai recherché selon mon profil, ma ville et le secteur d’activité","J’ai vérifié si la demande doit être faite avant l’immatriculation","J’ai préparé budget, plan de financement et justificatifs demandés","Je n’engage aucune dépense en supposant l’aide obtenue avant la décision"],
    "Faire venir sa famille":["J’ai identifié la procédure correspondant à mon statut et au lien familial","J’ai vérifié durée de séjour, ressources et logement éventuellement exigés","J’ai réuni actes d’état civil et preuves du lien familial","J’ai contrôlé traduction, légalisation ou transcription nécessaires","J’ai déposé auprès de l’OFII, du consulat ou du portail indiqué pour cette procédure"],
    "Déclarer une naissance":["La naissance a été déclarée dans le délai auprès de l’état civil du lieu de naissance","J’ai obtenu plusieurs copies de l’acte de naissance","J’ai informé Assurance Maladie, CAF et employeur selon ma situation","J’ai vérifié les démarches consulaires liées aux nationalités des parents","J’ai mis à jour titre de séjour ou document de voyage de l’enfant si nécessaire"],
    "Inscrire un enfant à l’école":["J’ai identifié l’école ou le service d’affectation selon l’âge","J’ai contacté la mairie pour le primaire ou l’Éducation nationale pour le secondaire","J’ai préparé identité, domicile et vaccinations disponibles","J’ai obtenu le certificat d’inscription ou la décision d’affectation","J’ai pris rendez-vous avec l’établissement pour finaliser l’admission"],
    "Faire reconnaître un mariage":["J’ai identifié le pays du mariage et la nationalité de chaque époux","J’ai vérifié si une transcription française est nécessaire","J’ai obtenu une copie complète et récente de l’acte","J’ai contrôlé les exigences de traduction ou de légalisation","J’ai traité séparément la reconnaissance de l’acte et la demande de séjour éventuelle"],
    "Quand la préfecture bloque":["J’ai réuni numéro de dossier, dates de dépôt et toutes les attestations","J’ai classé les messages et décisions dans l’ordre chronologique","J’ai envoyé une demande écrite et conservé sa preuve de réception","J’ai identifié s’il s’agit d’un retard, d’un silence ou d’une décision contestable","J’ai consulté rapidement un Point-justice ou un professionnel si un délai de recours court"],
    "Trouver un Point-justice":["J’ai résumé le problème et la question à résoudre en quelques lignes","J’ai rassemblé décisions, contrats et échanges importants","J’ai recherché la permanence adaptée dans l’annuaire Justice.fr","J’ai vérifié s’il faut prendre rendez-vous et quels documents apporter","Après l’entretien, j’ai noté l’interlocuteur et la prochaine action conseillée"],
    "Demander l’aide juridictionnelle":["J’ai identifié la procédure et la juridiction concernées","J’ai vérifié les conditions de ressources et de résidence","J’ai demandé à l’avocat s’il accepte l’aide juridictionnelle, si j’en ai déjà un","J’ai réuni justificatifs de ressources, identité et pièces de l’affaire","J’ai déposé le dossier au bon bureau et conservé le récépissé"],
    "Éviter les faux intermédiaires":["J’ai vérifié que l’adresse du site appartient bien à l’administration annoncée","Je refuse toute promesse de décision garantie ou de rendez-vous vendu","Je ne communique jamais mot de passe, code SMS ou accès FranceConnect","Je demande facture, identité professionnelle et mission écrite avant de payer un conseil","Je conserve les preuves et signale toute tentative suspecte"],
    "Trouver les annonces de la communauté":["J’ai filtré par besoin, ville et date récente","J’ai lu le profil et vérifié la cohérence de l’annonce","J’ai posé les questions essentielles dans la messagerie avant de donner mes coordonnées","J’ai demandé un prix total, une date et des conditions écrites","J’ai signalé l’annonce si elle demande des données ou paiements suspects"],
    "Profiter des offres partenaires":["Le badge partenaire est visible et l’entreprise est clairement identifiée","J’ai lu la durée, les bénéficiaires et les exclusions de l’offre","J’ai vérifié le prix normal avant d’évaluer la réduction","Je sais qui vend, facture et assure le service","J’ai conservé les conditions affichées au moment de l’achat"],
    "Éviter les arnaques":["J’ai vérifié l’identité, l’ancienneté et les coordonnées de l’interlocuteur","Je refuse l’urgence artificielle et les paiements impossibles à tracer","Je ne partage ni pièce d’identité brute, ni code SMS, ni accès bancaire","J’ai recherché les incohérences de prix, d’adresse et de discours","J’ai conservé l’annonce et les échanges pour signaler si nécessaire"],
    "Demander de l’entraide":["J’ai écrit précisément le besoin, la ville et la date limite","J’ai indiqué ce que j’ai déjà essayé et le résultat obtenu","Je n’ai publié aucun document personnel ou numéro sensible","J’ai précisé si je cherche un conseil, un contact, un prêt ou une prestation payante","Quand le besoin est résolu, je clôture ou mets à jour la demande" ],
    "Comprendre tous les onglets":["Événements : je cherche une sortie par ville, date ou catégorie","Gastronomie, Églises, Sportifs, Tournois, Boutiques et Professionnels : je consulte les annuaires spécialisés","Guide : je suis une démarche pratique avec sa checklist et ses sources","Diaspora : je découvre les médias, associations et ressources de la communauté","Petites annonces : je consulte les demandes et services publiés par les membres","Après connexion : j’accède aussi aux After-movies, à la Communauté, aux messages et aux notifications"],
    "Trouver et suivre un événement":["Je recherche par nom, ville ou catégorie dans l’onglet Événements","J’ouvre la fiche pour vérifier date, heure, adresse, prix et organisateur","J’utilise le lien Billets ou la source officielle lorsque le bouton est disponible","Je peux indiquer que je suis intéressé, ajouter la date à mon agenda ou demander un rappel","Je consulte le profil de l’organisateur pour retrouver ses autres événements et ses réseaux"],
    "Explorer les annuaires":["Je choisis l’onglet correspondant : Gastronomie, Églises, Sportifs, Boutiques ou Professionnels","J’utilise la recherche et les filtres pour réduire les résultats","J’ouvre une fiche pour voir la ville, la description et les coordonnées disponibles","Je vérifie le site ou le réseau officiel avant de me déplacer ou de commander","Pour le sport, j’utilise Tournois afin de voir compétitions, résultats et calendriers disponibles"],
    "Utiliser les petites annonces":["Je peux consulter et filtrer les annonces sans publier","Je me connecte avec un compte gratuit pour déposer une annonce","Je choisis une catégorie existante ou j’en propose une nouvelle","J’ajoute un titre clair, une description, une ville, un moyen de contact et les informations utiles","J’envoie l’annonce : elle reste en attente jusqu’à la vérification par l’administration","Depuis mon compte, je peux ensuite suivre, modifier ou retirer mes propres annonces lorsque l’option est disponible"],
    "Publier dans la communauté":["Je me connecte pour faire apparaître l’onglet Communauté","J’écris une publication claire et j’ajoute une photo seulement si j’ai le droit de la partager","Je publie puis je peux répondre aux commentaires et réactions","J’ouvre le profil d’un membre ou le bouton Message pour échanger en privé","J’utilise Signaler si une publication ou un commentaire ne respecte pas les règles"],
    "Utiliser les messages et notifications":["Après connexion, j’ouvre la bulle 💬 pour retrouver mes conversations","Je choisis un membre ou un organisateur avant d’envoyer un message","Je peux modifier mon message pendant les 30 minutes qui suivent son envoi","Je peux supprimer un message de mon affichage selon les règles prévues par la plateforme","J’ouvre la cloche 🔔 pour voir les réponses, annonces et activités qui me concernent","Je marque les notifications comme lues après les avoir consultées"],
    "Gérer son compte et proposer un événement":["Je me connecte puis j’ouvre mon avatar pour accéder au profil","Je complète mon pseudo, ma photo, mon code postal et mes centres d’intérêt si je le souhaite","J’utilise le bouton Proposer un événement depuis l’accueil","Je renseigne le nom, la date, la catégorie, l’adresse, l’organisateur et le lien de billetterie s’il existe","J’envoie la proposition : elle doit être vérifiée avant sa publication","Je consulte ensuite mes notifications ou mes messages si l’équipe demande une précision"]
  }
  const topicLinks={
    "Conduire avec un permis malgache":[["Règles pour un permis hors Europe — Service-Public","https://www.service-public.fr/particuliers/vosdroits/F1459"],["Vérifier si le permis est échangeable","https://www.service-public.fr/particuliers/vosdroits/R64185"],["Liste officielle de réciprocité — France Diplomatie","https://www.diplomatie.gouv.fr/IMG/pdf/liste_reciprocite_hors_ue_et_eee_au_2_mars_2026_cle0d91a1.pdf"]],
    "Demander un échange de permis":[["Vérifier l’échangeabilité — simulateur officiel","https://www.service-public.fr/particuliers/vosdroits/R64185"],["Procédure d’échange hors Europe","https://www.service-public.fr/particuliers/vosdroits/F1460"],["Faire la demande — France Titres","https://permisdeconduire.ants.gouv.fr/"]],
    "Choisir son abonnement de transport":[["Île-de-France Mobilités — tarifs","https://www.iledefrance-mobilites.fr/titres-et-tarifs"],["Trouver le réseau de transport de sa ville","https://lannuaire.service-public.fr/navigation/mairie"]],
    "Comprendre tous les onglets":[["Voir les événements","/"],["Découvrir la gastronomie","/gastronomie"],["Voir les professionnels","/organisateurs"],["Ouvrir le Guide France","/guide-france"],["Découvrir la diaspora","/diaspora-malgache-france"]],
    "Trouver et suivre un événement":[["Ouvrir les événements","/"]],
    "Explorer les annuaires":[["Gastronomie","/gastronomie"],["Églises","/eglises"],["Sportifs","/sportifs"],["Tournois","/tournois"],["Boutiques","/boutiques"],["Professionnels","/organisateurs"]],
    "Utiliser les petites annonces":[["Ouvrir les petites annonces","/petites-annonces"]],
    "Publier dans la communauté":[["Ouvrir la Communauté","/communaute"]],
    "Utiliser les messages et notifications":[["Voir les notifications","/notifications"],["Ouvrir la Communauté","/communaute"]],
    "Gérer son compte et proposer un événement":[["Retourner aux événements","/"],["Contacter Malagasy Events","/contact"]]
  }
  const platformGuideVisuals={
    "Comprendre tous les onglets":{icon:"🧭",accent:GREEN,label:"La carte du site",active:"Guide",title:"Pars de ce que tu veux faire",note:"Les onglets visibles servent à consulter. Après connexion, les outils pour participer apparaissent aussi.",items:[["📅","Je veux sortir","Événements"],["📍","Je cherche une adresse","Annuaires"],["💬","Je veux échanger","Communauté"]]},
    "Trouver et suivre un événement":{icon:"📅",accent:RED,label:"Depuis Événements",active:"Événements",title:"De l’affiche aux informations utiles",note:"La fiche rassemble la date, le lieu, le prix, la billetterie et l’organisateur quand ces informations sont disponibles.",items:[["🔎","Recherche","Nom, ville ou catégorie"],["🎫","Billets / source","Accès à l’information officielle"],["🏢","Organisateur","Profil, réseaux et autres événements"]]},
    "Explorer les annuaires":{icon:"📍",accent:"#6b4fb5",label:"Gastronomie et annuaires",active:"Gastronomie",title:"Trouve une adresse puis vérifie-la",note:"Chaque annuaire a ses propres filtres. Une fiche peut ensuite ouvrir le site ou le réseau officiel de la structure.",items:[["🍽️","Gastronomie","Restaurants et traiteurs"],["🛍️","Boutiques","Créateurs et commerces"],["💼","Professionnels","Services et organisateurs"]]},
    "Utiliser les petites annonces":{icon:"📣",accent:"#e07b21",label:"Depuis Petites annonces",active:"Petites annonces",title:"Consulte librement, publie avec ton compte",note:"Une annonce envoyée n’apparaît pas immédiatement : l’administration la vérifie avant publication.",items:[["🔎","Consulter","Filtrer les annonces publiées"],["＋","Déposer une annonce","Titre, ville, catégorie, contact"],["🛡️","Validation","Contrôle avant mise en ligne"]]},
    "Publier dans la communauté":{icon:"👥",accent:"#167a62",label:"Après connexion",active:"Communauté",title:"Publie et échange avec les membres",note:"La Communauté apparaît après connexion. Tu peux publier, commenter, réagir, contacter un membre ou signaler un contenu.",items:[["✍️","Nouvelle publication","Texte clair et photo autorisée"],["💬","Commentaires","Répondre sous la publication"],["🚩","Signaler","Prévenir l’administration"]]},
    "Utiliser les messages et notifications":{icon:"💬",accent:"#2672c9",label:"Dans l’en-tête du site",active:"💬  🔔",title:"Retrouve ce qui demande ton attention",note:"La bulle ouvre les conversations. La cloche rassemble les réponses et les activités qui te concernent.",items:[["💬","Messages","Conversations privées"],["✏️","Modifier","Pendant les 30 premières minutes"],["🔔","Notifications","Nouveautés et réponses"]]},
    "Gérer son compte et proposer un événement":{icon:"👤",accent:"#a53d72",label:"Depuis ton avatar",active:"Mon profil",title:"Complète ton profil ou propose une date",note:"La proposition d’événement est relue avant publication. Si une précision manque, l’équipe peut te contacter.",items:[["👤","Mon profil","Photo, pseudo et informations utiles"],["＋","Proposer un événement","Date, lieu, organisateur, billetterie"],["🛡️","Vérification","Validation par Malagasy Events"]]}
  }
  const platformScreen=(title,visual)=>{
    const marker={outline:`3px solid ${visual.accent}`,outlineOffset:2,boxShadow:`0 0 0 6px ${visual.accent}1f`}
    const miniButton=(label,active=false)=>({background:active?"#eaf6ef":"transparent",color:active?GREEN:"#252525",fontWeight:800,fontSize:10,padding:"7px 9px",borderRadius:9,whiteSpace:"nowrap"})
    const shell=children=><div style={{background:"#f6f6f6",minHeight:330,fontFamily:"system-ui,sans-serif"}}><div style={{background:WHITE,padding:"11px 13px",boxShadow:"0 2px 10px rgba(0,0,0,.08)",display:"flex",alignItems:"center",gap:9,overflow:"hidden"}}><b style={{fontSize:12,whiteSpace:"nowrap"}}><span style={{color:RED}}>🇲🇬 Malagasy</span><span style={{color:GREEN}}> Events</span></b><div style={{display:"flex",gap:2,overflow:"hidden",flex:1}}><span style={miniButton("Événements",title==="Trouver et suivre un événement")}>📅 Événements</span><span style={miniButton("Gastronomie",title==="Explorer les annuaires")}>🍽️ Gastronomie</span><span style={miniButton("Guide",title==="Comprendre tous les onglets")}>🧭 Guide</span><span style={miniButton("Petites annonces",title==="Utiliser les petites annonces")}>📌 Petites annonces</span></div><span style={{...miniButton("Connexion"),background:GREEN,color:WHITE}}>👤 Connexion</span></div><div style={{height:4,display:"flex"}}><i style={{flex:1,background:WHITE}}/><i style={{flex:2,background:RED}}/><i style={{flex:2,background:GREEN}}/></div>{children}</div>
    if(title==="Comprendre tous les onglets")return shell(<div style={{padding:16}}><div style={{background:WHITE,borderRadius:18,padding:16,textAlign:"center",marginBottom:12}}><b style={{display:"block",fontSize:18,color:"#26215C",marginBottom:5}}>Que veux-tu trouver ?</b><span style={{fontSize:11,color:"#777"}}>Utilise directement les onglets du menu en haut.</span></div><div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:9}}>{[["📅","Événements","Les sorties à venir"],["🍽️","Gastronomie","Restaurants et traiteurs"],["🧭","Guide","Les démarches expliquées"],["📌","Petites annonces","Les besoins de la communauté"]].map(([icon,label,text],i)=><div key={label} style={{background:WHITE,borderRadius:14,padding:12,...(i===0?marker:{})}}><span style={{fontSize:19}}>{icon}</span><b style={{display:"block",fontSize:12,color:"#26215C",margin:"5px 0 2px"}}>{label}</b><small style={{fontSize:10,color:"#777"}}>{text}</small></div>)}</div></div>)
    if(title==="Trouver et suivre un événement")return shell(<div style={{padding:16,display:"grid",gridTemplateColumns:"108px 1fr",gap:12}}><div style={{background:WHITE,borderRadius:17,overflow:"hidden",boxShadow:"0 2px 10px rgba(0,0,0,.08)"}}><div style={{height:95,background:"linear-gradient(145deg,#C8102E,#4f1722)",position:"relative"}}><span style={{position:"absolute",bottom:8,left:8,background:RED,color:WHITE,borderRadius:99,padding:"3px 7px",fontSize:8,fontWeight:800}}>Culture</span></div><div style={{padding:10}}><b style={{fontSize:11}}>Tana–Paris–Tana</b><small style={{display:"block",fontSize:9,color:"#777",marginTop:5}}>📅 3 octobre · 📍 Châtillon</small></div></div><div style={{background:WHITE,borderRadius:17,padding:13}}><small style={{color:GREEN,fontWeight:900}}>FICHE ÉVÉNEMENT</small><h3 style={{fontSize:15,color:"#26215C",margin:"6px 0"}}>Toutes les informations au même endroit</h3><p style={{fontSize:10.5,color:"#777",lineHeight:1.5}}>Date, heure, adresse, prix et organisateur.</p><div style={{display:"grid",gap:8,marginTop:12}}><div style={{background:RED,color:WHITE,borderRadius:10,padding:"9px 10px",fontSize:10,fontWeight:900,...marker}}>🎫 Billetterie officielle →</div><div style={{background:"#eef6f1",color:GREEN,borderRadius:10,padding:"9px 10px",fontSize:10,fontWeight:800}}>👤 Voir l’organisateur →</div></div></div></div>)
    if(title==="Explorer les annuaires")return shell(<div style={{padding:16}}><h3 style={{fontSize:16,margin:"0 0 4px"}}>🍽️ Gastronomie malagasy</h3><p style={{fontSize:10.5,color:"#777",margin:"0 0 11px"}}>Restaurants, traiteurs et food trucks.</p><div style={{background:WHITE,border:"1px solid #e5e5e5",borderRadius:12,padding:"10px 12px",fontSize:11,color:"#aaa",marginBottom:9}}>🔍 Rechercher par nom ou ville…</div><div style={{display:"flex",gap:6,marginBottom:11}}>{["Tous","Restaurant","Traiteur"].map((x,i)=><span key={x} style={{background:i===0?RED:WHITE,color:i===0?WHITE:"#555",borderRadius:99,padding:"6px 9px",fontSize:9,fontWeight:800}}>{x}</span>)}</div><div style={{background:WHITE,borderRadius:16,overflow:"hidden",display:"grid",gridTemplateColumns:"70px 1fr",...marker}}><div style={{background:"linear-gradient(145deg,#C8102E,#711125)",display:"grid",placeItems:"center",fontSize:25}}>🍽️</div><div style={{padding:12}}><b style={{fontSize:12}}>Nom de la structure</b><small style={{display:"block",color:"#888",fontSize:10,margin:"4px 0 8px"}}>Restaurant · Paris</small><strong style={{color:GREEN,fontSize:10}}>Voir la fiche et les liens →</strong></div></div></div>)
    if(title==="Utiliser les petites annonces")return shell(<div style={{padding:14}}><div style={{background:"linear-gradient(125deg,#8f0e22,#C8102E 50%,#007A3D 130%)",borderRadius:18,padding:16,color:WHITE}}><small style={{fontSize:8,fontWeight:900,letterSpacing:1}}>ENTRAIDE · SERVICES · OPPORTUNITÉS</small><h3 style={{fontSize:21,margin:"6px 0"}}>📌 Petites annonces</h3><p style={{fontSize:10,lineHeight:1.45,opacity:.9}}>Cours, logement, covoiturage ou service dans la communauté.</p><div style={{display:"inline-block",background:WHITE,color:RED,borderRadius:99,padding:"9px 12px",fontSize:10,fontWeight:900,...marker}}>＋ Publier une annonce gratuitement</div></div><div style={{display:"flex",gap:6,marginTop:11}}>{["Toutes","Cours","Services","Logement"].map((x,i)=><span key={x} style={{background:i===0?RED:WHITE,color:i===0?WHITE:"#555",padding:"6px 9px",borderRadius:99,fontSize:9,fontWeight:800}}>{x}</span>)}</div></div>)
    if(title==="Publier dans la communauté")return shell(<div style={{padding:15}}><h3 style={{fontSize:16,margin:"0 0 10px"}}>👥 Communauté Malagasy</h3><div style={{background:WHITE,borderRadius:16,padding:12,marginBottom:10,...marker}}><div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{display:"grid",placeItems:"center",width:30,height:30,borderRadius:"50%",background:RED,color:WHITE,fontWeight:900}}>M</span><span style={{flex:1,background:"#f4f4f4",borderRadius:99,padding:"9px 11px",fontSize:10,color:"#888"}}>Partage quelque chose avec la communauté 🇲🇬…</span></div><div style={{display:"flex",justifyContent:"space-between",marginTop:9,fontSize:9,fontWeight:800,color:GREEN}}><span>📷 Ajouter une photo</span><span>Publier →</span></div></div><div style={{background:WHITE,borderRadius:16,padding:12}}><b style={{fontSize:11}}>Malagasy_events_admin ✓</b><p style={{fontSize:10,color:"#555",lineHeight:1.45}}>Bienvenue dans l’espace de la communauté !</p><span style={{fontSize:9,color:"#888"}}>♡ Réagir　💬 Commenter　✉ Message</span></div></div>)
    if(title==="Utiliser les messages et notifications")return shell(<div style={{padding:15}}><div style={{display:"flex",justifyContent:"flex-end",gap:8,marginBottom:12}}><span style={{background:"#f3f3f3",borderRadius:99,padding:"8px 10px",fontSize:12,...marker}}>💬 <b style={{color:RED}}>1</b></span><span style={{background:"#eaf6ef",borderRadius:99,padding:"8px 10px",fontSize:12}}>🔔 <b style={{color:RED}}>3</b></span><span style={{background:"#f3f3f3",borderRadius:99,padding:"8px 10px",fontSize:11}}>👤 Mon profil</span></div><div style={{background:WHITE,borderRadius:18,overflow:"hidden",boxShadow:"0 8px 25px rgba(0,0,0,.12)"}}><div style={{background:RED,color:WHITE,padding:"11px 14px",fontWeight:900,fontSize:13}}>💬 Messages</div><div style={{display:"grid",gridTemplateColumns:"38% 1fr",minHeight:175}}><div style={{borderRight:"1px solid #eee",padding:9}}><div style={{background:"#f4f4f4",borderRadius:9,padding:8,fontSize:9,color:"#999"}}>Chercher un utilisateur…</div><div style={{fontSize:9,fontWeight:800,padding:"12px 3px"}}>Besha Beep<br/><small style={{color:"#888"}}>Dernier message…</small></div></div><div style={{padding:11,display:"flex",flexDirection:"column",justifyContent:"flex-end",gap:7}}><span style={{alignSelf:"flex-start",background:"#eee",padding:"7px 9px",borderRadius:12,fontSize:9}}>Bonjour 👋</span><span style={{alignSelf:"flex-end",background:RED,color:WHITE,padding:"7px 9px",borderRadius:12,fontSize:9}}>Bienvenue !</span><div style={{background:"#f4f4f4",borderRadius:99,padding:8,fontSize:9,color:"#aaa"}}>Ton message…</div></div></div></div></div>)
    return shell(<div style={{padding:15}}><div style={{display:"flex",justifyContent:"flex-end",gap:8,marginBottom:12}}><span style={{background:"#f3f3f3",borderRadius:99,padding:"7px 10px",fontSize:10,...marker}}>👤 Mon profil　⚙️</span></div><div style={{background:WHITE,borderRadius:18,padding:15}}><small style={{color:RED,fontWeight:900}}>PROPOSER UN ÉVÉNEMENT</small><h3 style={{fontSize:17,color:"#26215C",margin:"6px 0 12px"}}>Ajoute les informations utiles</h3><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{["Nom de l’événement *","Date *","Lieu / salle","Organisateur *"].map(x=><div key={x} style={{border:"1px solid #e5e5e5",borderRadius:9,padding:9,fontSize:9,color:"#777"}}>{x}</div>)}</div><div style={{background:RED,color:WHITE,borderRadius:10,padding:10,textAlign:"center",fontSize:10,fontWeight:900,marginTop:11,...marker}}>Envoyer ma proposition</div></div></div>)
  }
  const selectedCategory=categories.find(x=>x.id===category)
  const normalized=query.trim().toLowerCase()
  const visible=categories.filter(x=>!normalized||`${x.title} ${x.desc} ${x.topics.join(" ")}`.toLowerCase().includes(normalized))
  const goHome=()=>{setCategory(null);setArticle(null);setQuery("");window.scrollTo({top:0,behavior:"smooth"})}
  const openCategory=id=>{setCategory(id);setArticle(null);window.scrollTo({top:0,behavior:"smooth"})}
  const openArticle=title=>{setArticle(title);setChecked({});window.scrollTo({top:0,behavior:"smooth"})}
  const topButton={border:"none",background:"transparent",color:GREEN,fontWeight:850,fontSize:13,cursor:"pointer",padding:0}
  if(article){
    const parent=selectedCategory||categories[0]
    const detail=guideDetails[parent.id]
    const summary=topicSummaries[article]||detail.intro
    const answer=summary
    const checklist=topicDocs[article]||detail.docs
    const officialLinks=topicLinks[article]||detail.links
    const accessTitle=parent.id==="bons-plans"?"Accès directs dans le site":"Accès officiels"
    const accessIntro=parent.id==="bons-plans"?"Ouvre directement l’onglet expliqué dans cette fiche.":"Administration ou organisme compétent — pas de lien commercial caché."
    const completed=checklist.filter((_,i)=>checked[i]).length
    const platformVisual=platformGuideVisuals[article]
    if(parent.id==="bons-plans"&&platformVisual)return <main style={{...publicPageShell,maxWidth:1080}}>
      <button onClick={()=>{setArticle(null);window.scrollTo({top:0})}} style={topButton}>← Retour au guide de la plateforme</button>
      <header style={{margin:"23px 0 20px",maxWidth:850}}>
        <p style={{color:platformVisual.accent,fontWeight:950,fontSize:12,textTransform:"uppercase",letterSpacing:1.2,margin:"0 0 8px"}}>{platformVisual.label}</p>
        <h1 style={{color:"#24204f",fontSize:isMobile?30:45,lineHeight:1.08,margin:"0 0 10px"}}>{article}</h1>
        <p style={{color:"#686872",fontSize:15,lineHeight:1.6,margin:0}}>{summary}</p>
      </header>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.15fr .85fr",gap:18,alignItems:"start"}}>
        <section style={{...publicCard,padding:0,overflow:"hidden",border:"1px solid #e4e5e8"}} aria-label={`Reproduction de l’écran : ${article}`}>
          <div style={{padding:"10px 14px",background:"#26215C",color:WHITE,fontSize:10,fontWeight:900,letterSpacing:.6}}>APERÇU DU VRAI SITE · LA ZONE ENCADRÉE EST CELLE À UTILISER</div>
          {platformScreen(article,platformVisual)}
          <div style={{padding:"13px 16px",background:`${platformVisual.accent}0d`,borderTop:`1px solid ${platformVisual.accent}22`,color:"#3f3d55",fontSize:12.5,lineHeight:1.5}}><b style={{color:platformVisual.accent}}>À retenir : </b>{platformVisual.note}</div>
        </section>
        <aside style={{display:"grid",gap:14}}>
          <section style={{...publicCard,padding:19}}><h2 style={{color:"#26215C",fontSize:18,margin:"0 0 12px"}}>Comment faire</h2><div style={{display:"grid",gap:11}}>{checklist.map((x,i)=><div key={x} style={{display:"grid",gridTemplateColumns:"27px 1fr",gap:10,alignItems:"start"}}><span style={{display:"grid",placeItems:"center",width:27,height:27,borderRadius:9,background:i===0?platformVisual.accent:"#eef0f1",color:i===0?WHITE:"#595966",fontWeight:950,fontSize:12}}>{i+1}</span><span style={{color:"#464650",fontSize:13,lineHeight:1.45,paddingTop:4}}>{x}</span></div>)}</div></section>
          <section style={{...publicCard,padding:18}}><h2 style={{color:"#26215C",fontSize:17,margin:"0 0 5px"}}>Essaie directement</h2><p style={{fontSize:11.5,color:"#888",lineHeight:1.45,margin:"0 0 12px"}}>Ces boutons ouvrent les parties du site expliquées ici.</p><div style={{display:"grid",gap:8}}>{officialLinks.map(([label,url],i)=><a key={label} href={url} style={{background:i===0?platformVisual.accent:"#f4f5f6",color:i===0?WHITE:"#333",borderRadius:11,padding:"11px 12px",fontWeight:800,fontSize:13,textDecoration:"none"}}>{label} →</a>)}</div></section>
        </aside>
      </div>
    </main>
    return <main style={{...publicPageShell,maxWidth:1060}}>
      <button onClick={()=>{setArticle(null);window.scrollTo({top:0})}} style={topButton}>← Retour à {parent.title}</button>
      <header style={{margin:"24px 0 22px",maxWidth:820}}>
        <div style={{display:"flex",alignItems:"center",gap:13,marginBottom:13}}><span style={{display:"grid",placeItems:"center",width:54,height:54,borderRadius:17,background:parent.color,fontSize:28}}>{parent.icon}</span><span style={{color:GREEN,fontWeight:900,fontSize:12,textTransform:"uppercase",letterSpacing:1.2}}>{parent.title}</span></div>
        <h1 style={{color:"#24204f",fontSize:isMobile?30:46,lineHeight:1.08,margin:0}}>{article}</h1>
      </header>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:18,alignItems:"start"}}>
        <section style={{display:"grid",gap:14}}>
          <section style={{...publicCard,padding:20}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}><h2 style={{color:"#26215C",fontSize:18,margin:0}}>Voici les étapes</h2><b style={{color:completed===checklist.length?GREEN:RED,fontSize:12}}>{completed}/{checklist.length}</b></div><div aria-hidden="true" style={{height:6,background:"#ececf0",borderRadius:99,overflow:"hidden",margin:"12px 0 10px"}}><div style={{height:"100%",width:`${(completed/checklist.length)*100}%`,background:completed===checklist.length?GREEN:RED,transition:"width .2s ease"}}/></div><p style={{fontSize:11.5,color:"#777",lineHeight:1.45,margin:"0 0 9px"}}>Coche une étape quand elle est faite.</p>{checklist.map((x,i)=><label key={x} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"10px 0",fontSize:13.5,color:checked[i]?"#76767d":"#383841",lineHeight:1.45,borderBottom:i===checklist.length-1?"none":"1px solid #f0f0f2",textDecoration:checked[i]?"line-through":"none"}}><input type="checkbox" checked={!!checked[i]} onChange={e=>setChecked(prev=>({...prev,[i]:e.target.checked}))} style={{marginTop:2,accentColor:GREEN}}/> {x}</label>)}{completed===checklist.length&&<div role="status" style={{marginTop:12,background:"#e9f7ef",color:GREEN,borderRadius:12,padding:"11px 12px",fontSize:12.5,fontWeight:850}}>✓ Toutes les étapes sont terminées.</div>}</section>
          <section style={{background:"#f3faf6",border:`1px solid #cfe5d8`,borderLeft:`5px solid ${GREEN}`,borderRadius:17,padding:18}}><p style={{color:GREEN,fontSize:11,fontWeight:950,textTransform:"uppercase",letterSpacing:1.1,margin:"0 0 7px"}}>En bref</p><p style={{color:"#292654",fontSize:14.5,lineHeight:1.55,fontWeight:700,margin:0}}>{answer}</p><p style={{color:"#798179",fontSize:10.5,margin:"10px 0 0"}}>Informations vérifiées le 10 septembre 2026</p></section>
        </section>
        <aside style={{display:"grid",gap:14}}>
          <section style={{...publicCard,padding:18}}><h2 style={{color:"#26215C",fontSize:17,margin:"0 0 5px"}}>{accessTitle}</h2><p style={{fontSize:11.5,color:"#888",lineHeight:1.45,margin:"0 0 12px"}}>{accessIntro}</p><div style={{display:"grid",gap:8}}>{officialLinks.map(([label,url],i)=><a key={label} href={url} target={url.startsWith("/")?undefined:"_blank"} rel={url.startsWith("/")?undefined:"noopener noreferrer"} style={{background:i===0?GREEN:"#f4f5f6",color:i===0?WHITE:"#333",borderRadius:11,padding:"11px 12px",fontWeight:800,fontSize:13,textDecoration:"none"}}>{label} {url.startsWith("/")?"→":"↗"}</a>)}</div></section>
        </aside>
      </div>
    </main>
  }
  if(selectedCategory?.id==="bons-plans"){
    const journeys=[
      {number:"1",title:"Je cherche",text:"Une sortie, une adresse ou une information pratique.",color:RED,topics:["Comprendre tous les onglets","Trouver et suivre un événement","Explorer les annuaires"]},
      {number:"2",title:"J’échange",text:"Avec la communauté ou directement avec un membre.",color:"#2672c9",topics:["Publier dans la communauté","Utiliser les messages et notifications"]},
      {number:"3",title:"Je participe",text:"Je dépose une annonce ou je propose un événement.",color:GREEN,topics:["Utiliser les petites annonces","Gérer son compte et proposer un événement"]}
    ]
    return <main style={{...publicPageShell,maxWidth:1080}}>
      <button onClick={goHome} style={topButton}>← Toutes les catégories</button>
      <header style={{margin:"24px 0 22px",maxWidth:820}}><p style={{color:GREEN,fontWeight:950,fontSize:11,textTransform:"uppercase",letterSpacing:1.25,margin:"0 0 7px"}}>Le site, en un coup d’œil</p><h1 style={{color:"#26215C",fontSize:isMobile?30:43,lineHeight:1.08,margin:"0 0 10px"}}>Comment utiliser Malagasy Events ?</h1><p style={{color:"#666",fontSize:15,lineHeight:1.6,margin:0}}>Choisis ce que tu veux faire. Chaque carte te montre l’écran concerné et le chemin le plus court pour y arriver.</p></header>
      <section style={{background:WHITE,borderRadius:18,padding:"13px 15px",boxShadow:"0 3px 14px rgba(0,0,0,.07)",marginBottom:16,overflow:"hidden"}}><p style={{color:"#777",fontSize:10,fontWeight:900,letterSpacing:.8,margin:"0 0 9px"}}>LE MENU QUE TU VOIS SUR LE SITE</p><div style={{display:"flex",alignItems:"center",gap:8,overflowX:"auto",paddingBottom:4}}><b style={{fontSize:12,whiteSpace:"nowrap",marginRight:6}}><span style={{color:RED}}>🇲🇬 Malagasy</span><span style={{color:GREEN}}> Events</span></b>{[["📅","Événements"],["🍽️","Gastronomie"],["⛪","Églises"],["🏆","Sportifs"],["🏅","Tournois"],["🛍️","Boutiques"],["💼","Professionnels"],["🧭","Guide"],["🇲🇬","Diaspora"],["📌","Petites annonces"]].map(([icon,label])=><span key={label} style={{background:label==="Guide"?"#eaf6ef":"#f6f6f6",color:label==="Guide"?GREEN:"#333",borderRadius:10,padding:"8px 10px",fontSize:10,fontWeight:800,whiteSpace:"nowrap"}}>{icon} {label}</span>)}</div></section>
      <section style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:14}}>{journeys.map(journey=><article key={journey.number} style={{...publicCard,padding:18,borderTop:`5px solid ${journey.color}`}}><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}><span style={{display:"grid",placeItems:"center",width:31,height:31,borderRadius:10,background:journey.color,color:WHITE,fontWeight:950}}>{journey.number}</span><h2 style={{fontSize:19,color:"#26215C",margin:0}}>{journey.title}</h2></div><p style={{fontSize:12.5,color:"#777",lineHeight:1.45,margin:"0 0 13px"}}>{journey.text}</p><div style={{display:"grid",gap:7}}>{journey.topics.map(title=>{const visual=platformGuideVisuals[title];return <button key={title} onClick={()=>openArticle(title)} style={{border:"1px solid #e8e8eb",background:"#fafafa",borderRadius:12,padding:"10px 11px",display:"grid",gridTemplateColumns:"29px 1fr auto",alignItems:"center",gap:8,textAlign:"left",cursor:"pointer",fontFamily:"inherit"}}><span style={{fontSize:16}}>{visual.icon}</span><b style={{color:"#3b3957",fontSize:12.5,lineHeight:1.3}}>{title}</b><span style={{color:journey.color,fontWeight:950}}>→</span></button>})}</div></article>)}</section>
      <section style={{marginTop:18,background:"linear-gradient(120deg,#25204f,#343069)",borderRadius:21,padding:isMobile?18:22,color:WHITE,display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:18}}><div><span style={{fontSize:24}}>👀</span><h2 style={{fontSize:18,margin:"8px 0 5px"}}>Sans compte</h2><p style={{fontSize:13,lineHeight:1.55,opacity:.86,margin:0}}>Tu peux découvrir les événements, consulter les annuaires, lire le Guide et parcourir les petites annonces.</p></div><div style={{borderLeft:isMobile?"none":"1px solid #ffffff30",borderTop:isMobile?"1px solid #ffffff30":"none",paddingLeft:isMobile?0:18,paddingTop:isMobile?16:0}}><span style={{fontSize:24}}>🔓</span><h2 style={{fontSize:18,margin:"8px 0 5px"}}>Après connexion gratuite</h2><p style={{fontSize:13,lineHeight:1.55,opacity:.86,margin:0}}>Tu peux publier, échanger, envoyer des messages, recevoir des notifications et proposer un événement.</p></div></section>
    </main>
  }
  if(selectedCategory)return <main style={{...publicPageShell,maxWidth:1040}}>
    <button onClick={goHome} style={topButton}>← Toutes les catégories</button>
    <header style={{margin:"24px 0 24px",display:"flex",gap:16,alignItems:"center"}}><span style={{display:"grid",placeItems:"center",width:64,height:64,borderRadius:20,background:selectedCategory.color,fontSize:32}}>{selectedCategory.icon}</span><div><p style={{color:GREEN,fontWeight:900,fontSize:11,textTransform:"uppercase",letterSpacing:1.2,margin:"0 0 5px"}}>{selectedCategory.count} guides pratiques</p><h1 style={{color:"#26215C",fontSize:isMobile?28:40,margin:0}}>{selectedCategory.title}</h1></div></header>
    <p style={{color:"#666",fontSize:15,lineHeight:1.65,maxWidth:760,margin:"-8px 0 22px"}}>{guideDetails[selectedCategory.id].intro}</p>
    <section style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(2,1fr)",gap:14}}>{selectedCategory.topics.map((title,i)=><button key={title} onClick={()=>openArticle(title)} style={{...publicCard,textAlign:"left",cursor:"pointer",fontFamily:"inherit",padding:20,display:"flex",justifyContent:"space-between",alignItems:"center",gap:15}}><span><small style={{color:RED,fontWeight:900,textTransform:"uppercase"}}>Guide {i+1}</small><strong style={{display:"block",color:"#26215C",fontSize:17,marginTop:6}}>{title}</strong><span style={{display:"block",color:"#73737a",fontSize:13.5,lineHeight:1.5,marginTop:6}}>{topicSummaries[title]||guideDetails[selectedCategory.id].intro}</span></span><span style={{color:GREEN,fontSize:22}}>→</span></button>)}</section>
  </main>
  return <main style={{...publicPageShell,maxWidth:1120}}>
    <header style={{textAlign:"center",marginBottom:23}}><p style={{color:GREEN,fontWeight:900,fontSize:12,letterSpacing:1.5,textTransform:"uppercase",margin:"0 0 8px"}}>Démarches · aides · bons plans</p><h1 style={{color:"#26215C",fontSize:isMobile?31:46,lineHeight:1.08,margin:"0 0 13px"}}>Le Guide Malagasy en France</h1><p style={{color:"#62626a",fontSize:16,lineHeight:1.65,maxWidth:720,margin:"0 auto"}}>Comprendre quoi faire, dans quel ordre et auprès de qui, avec des informations vérifiées et des liens officiels.</p></header>
    <div style={{maxWidth:720,margin:"0 auto 24px",position:"relative"}}><span style={{position:"absolute",left:17,top:14,fontSize:18}}>🔎</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher une démarche, une aide ou un bon plan…" style={{width:"100%",boxSizing:"border-box",border:"1px solid #dedee5",borderRadius:17,padding:"15px 16px 15px 48px",fontSize:15,outline:"none",background:WHITE}}/></div>
    <button onClick={()=>openCategory("etudes")} style={{width:"100%",border:"none",borderRadius:22,padding:isMobile?19:24,marginBottom:20,background:"linear-gradient(120deg,#C8102E,#9f0b24)",color:WHITE,textAlign:"left",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,fontFamily:"inherit"}}><span><small style={{fontWeight:900,textTransform:"uppercase",letterSpacing:1.2,opacity:.82}}>Parcours recommandé</small><strong style={{display:"block",fontSize:isMobile?21:27,margin:"7px 0"}}>🎓 Je viens étudier en France</strong><span style={{fontSize:14,opacity:.9}}>Avant le départ, arrivée, visa, inscription, santé et logement.</span></span><span style={{fontSize:26}}>→</span></button>
    <section style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:14}}>{visible.map(item=><button key={item.id} onClick={()=>openCategory(item.id)} style={{...publicCard,padding:19,textAlign:"left",cursor:"pointer",fontFamily:"inherit",minHeight:185,display:"flex",flexDirection:"column"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{display:"grid",placeItems:"center",width:44,height:44,borderRadius:14,background:item.color,fontSize:23}}>{item.icon}</span><span style={{color:GREEN,fontSize:12,fontWeight:850}}>{item.count} guides</span></div><h2 style={{color:"#26215C",fontSize:18,margin:"14px 0 7px"}}>{item.title}</h2><p style={{color:"#6c6c73",fontSize:13.5,lineHeight:1.55,margin:"0 0 14px",flex:1}}>{item.desc}</p><strong style={{color:RED,fontSize:13}}>Voir les démarches →</strong></button>)}</section>
    {!visible.length&&<div style={{...publicCard,textAlign:"center",color:"#666"}}>Aucun résultat. Essaie « logement », « visa » ou « travail ».</div>}
    <div style={{background:"#f3f8f5",border:"1px solid #d7e8dd",borderRadius:17,padding:"14px 17px",color:"#456052",fontSize:13,lineHeight:1.55,marginTop:20}}><b>Informations vérifiées le 10 septembre 2026.</b> Ce guide oriente et renvoie toujours vers l’administration ou l’organisme compétent.</div>
  </main>
}

function ContactPage({isMobile,onPropose,onGoto}) {
  return <main style={publicPageShell}>
    <header style={{textAlign:"center",marginBottom:26}}>
      <p style={{color:GREEN,fontWeight:900,fontSize:12,letterSpacing:1.5,textTransform:"uppercase",margin:"0 0 8px"}}>Échangeons</p>
      <h2 style={{color:"#26215C",fontSize:isMobile?28:38,lineHeight:1.12,margin:"0 0 12px"}}>Contacter Malagasy Events</h2>
      <p style={{color:"#666",fontSize:16,lineHeight:1.65,maxWidth:700,margin:"0 auto"}}>Choisissez le sujet de votre demande pour être dirigé vers le bon espace.</p>
    </header>
    <section style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:16}}>
      <article style={publicCard}>
        <div style={{fontSize:28}}>🎉</div><h3 style={{color:"#26215C",margin:"8px 0"}}>Proposer un événement</h3>
        <p style={{color:"#666",fontSize:14,lineHeight:1.6,minHeight:66}}>Ajoutez une soirée, un concert, un tournoi ou une rencontre communautaire.</p>
        <button onClick={onPropose} style={{background:RED,color:WHITE,border:"none",borderRadius:12,padding:"11px 14px",fontWeight:800,cursor:"pointer"}}>Proposer un événement</button>
      </article>
      <article style={publicCard}>
        <div style={{fontSize:28}}>🏢</div><h3 style={{color:"#26215C",margin:"8px 0"}}>Référencer une structure</h3>
        <p style={{color:"#666",fontSize:14,lineHeight:1.6,minHeight:66}}>Association, artiste, restaurant ou commerce : présentez votre activité à la communauté.</p>
        <button onClick={()=>onGoto("orgas")} style={{background:GREEN,color:WHITE,border:"none",borderRadius:12,padding:"11px 14px",fontWeight:800,cursor:"pointer"}}>Voir les structures</button>
      </article>
      <article style={publicCard}>
        <div style={{fontSize:28}}>🤝</div><h3 style={{color:"#26215C",margin:"8px 0"}}>Partenariat & visibilité</h3>
        <p style={{color:"#666",fontSize:14,lineHeight:1.6,minHeight:66}}>Découvrez les solutions de mise en avant pour organisateurs et professionnels.</p>
        <button onClick={()=>onGoto("pro")} style={{background:"#26215C",color:WHITE,border:"none",borderRadius:12,padding:"11px 14px",fontWeight:800,cursor:"pointer"}}>Découvrir l’offre Pro</button>
      </article>
    </section>
    <div style={{textAlign:"center",color:"#666",fontSize:13,lineHeight:1.7,margin:"24px auto 0",maxWidth:680}}>
      <p>Contact général et juridique : <a href={`mailto:${LEGAL_CONTACT}`} style={{color:GREEN,fontWeight:800}}>{LEGAL_CONTACT}</a></p>
      <button onClick={()=>onGoto("rights")} style={{background:"#eef6f1",color:GREEN,border:"1px solid #cfe5d7",borderRadius:99,padding:"10px 16px",fontWeight:800,cursor:"pointer"}}>Signaler · Corriger · Revendiquer · Supprimer mes données</button>
    </div>
  </main>
}

function FaqPage({isMobile,onGoto}) {
  const items = [
    ["Qu’est-ce que Malagasy Events ?","Malagasy Events est l’agenda des événements et des bonnes adresses de la communauté malagasy en France."],
    ["Quels événements peut-on trouver ?","Des soirées gasy, concerts, festivals, tournois sportifs, rencontres culturelles, repas communautaires et événements associatifs."],
    ["Comment proposer un événement ?","Utilisez le bouton « Proposer un événement », connectez-vous puis renseignez la date, la ville, l’organisateur et les informations utiles."],
    ["Comment référencer une association ou un organisateur ?","Consultez l’espace Structures & artistes. Les responsables peuvent présenter leur organisation et leurs événements."],
    ["Où trouver un restaurant ou un traiteur malgache ?","La rubrique Gastronomie rassemble des restaurants, traiteurs et food trucks malgaches dans plusieurs régions françaises."],
    ["Le service couvre-t-il toute la France ?","Oui. L’objectif est de référencer les initiatives malagasy à Paris, Lyon, Marseille, Toulouse et dans toutes les régions."],
    ["Comment obtenir plus de visibilité ?","Les organisateurs et professionnels peuvent consulter l’offre Pro pour découvrir les options de mise en avant."],
  ]
  return <main style={publicPageShell}>
    <header style={{textAlign:"center",marginBottom:26}}>
      <p style={{color:RED,fontWeight:900,fontSize:12,letterSpacing:1.5,textTransform:"uppercase",margin:"0 0 8px"}}>Centre d’aide</p>
      <h2 style={{color:"#26215C",fontSize:isMobile?28:38,lineHeight:1.12,margin:"0 0 12px"}}>Questions fréquentes</h2>
      <p style={{color:"#666",fontSize:16,margin:0}}>Tout savoir sur Malagasy Events et son fonctionnement.</p>
    </header>
    <section style={{display:"grid",gap:12}}>
      {items.map(([q,a])=><details key={q} style={{...publicCard,padding:"18px 20px"}}><summary style={{color:"#26215C",fontWeight:800,fontSize:16,cursor:"pointer"}}>{q}</summary><p style={{color:"#666",fontSize:14,lineHeight:1.65,margin:"12px 0 0"}}>{a}</p></details>)}
    </section>
    <div style={{textAlign:"center",marginTop:24}}><button onClick={()=>onGoto("contact")} style={{background:GREEN,color:WHITE,border:"none",borderRadius:99,padding:"13px 22px",fontWeight:800,cursor:"pointer"}}>Nous contacter →</button></div>
  </main>
}

const legalSectionStyle = {...publicCard,padding:22}
const legalTextStyle = {color:"#555",fontSize:14,lineHeight:1.7,margin:"8px 0 0"}

function LegalDocumentPage({kind,isMobile}) {
  const [audienceRefused,setAudienceRefused] = useState(()=>audienceOptedOut())
  const changeAudienceChoice = refused => {
    try {
      localStorage.setItem('mev_audience_optout',String(refused))
      localStorage.removeItem('mev_tracking_visitor')
      sessionStorage.removeItem('mev_tracking_session')
      sessionStorage.removeItem('mev_last_page_view')
    } catch {}
    setAudienceRefused(refused)
    setTimeout(()=>window.location.reload(),250)
  }
  const docs = {
    legal:{
      eyebrow:"Informations obligatoires", title:"Mentions légales",
      intro:"Informations relatives à l’édition, à l’hébergement et au fonctionnement de Malagasy Events.",
      sections:[
        ["Éditeur","Le site www.malagasy-events.com est édité par l’exploitant de Malagasy Events, établi en France. Les nom, forme juridique, adresse, numéro d’immatriculation et directeur de publication doivent être complétés avant toute commercialisation. Contact électronique : "+LEGAL_CONTACT+"."],
        ["Hébergement","Interface hébergée par Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis. Base de données, authentification et stockage fournis par Supabase. Les garanties contractuelles et la région effective du projet doivent être conservées dans le registre des sous-traitants."],
        ["Plateforme indépendante","Malagasy Events référence des informations pratiques. Sauf mention explicite, la plateforme n’est ni l’organisateur d’un événement, ni son mandataire, ni le vendeur des billets. Une fiche ne signifie pas un partenariat ou une approbation de l’organisateur."],
        ["Propriété intellectuelle","La charte Malagasy Events appartient à son éditeur. Les marques, logos, affiches, photographies et textes de tiers restent la propriété de leurs titulaires. Les visuels d’événements sont désactivés tant qu’une autorisation exploitable n’est pas enregistrée."],
        ["Signalement","Toute demande relative à un contenu, une marque, une fiche, une donnée ou un droit peut être déposée depuis la page « Exercer mes droits ». Les demandes documentées sont examinées rapidement et peuvent entraîner une correction, un masquage ou un retrait conservatoire."],
      ],
    },
    cgu:{
      eyebrow:"Règles de la communauté", title:"Conditions générales d’utilisation",
      intro:"En utilisant Malagasy Events, vous acceptez les règles suivantes.",
      sections:[
        ["Objet du service","La plateforme propose un agenda, des annuaires, des fiches de structures et des fonctions communautaires. La consultation est gratuite ; certaines fonctions nécessitent un compte."],
        ["Exactitude et vérification","Les informations sont indicatives et peuvent évoluer. Avant tout déplacement ou paiement, l’utilisateur doit vérifier la date, le lieu, le tarif et le lien auprès de l’organisateur ou de la billetterie officielle."],
        ["Publications autorisées","L’utilisateur ne publie que des contenus exacts, licites et pour lesquels il dispose des droits nécessaires. Sont interdits : usurpation, faux événements, spam, contenus haineux, injurieux, diffamatoires, trompeurs, violents, sexuels, discriminatoires ou portant atteinte à la vie privée, aux données personnelles, aux marques, au droit d’auteur ou au droit à l’image."],
        ["Garantie de droits","En envoyant un texte, une photographie, un logo ou une affiche, l’utilisateur garantit être titulaire des droits ou disposer d’une autorisation écrite couvrant la diffusion sur la plateforme et ses réseaux. Il conserve ses droits et accorde une licence non exclusive limitée au fonctionnement et à la promotion du service."],
        ["Événements et billetterie","Malagasy Events n’est pas responsable de l’organisation, de l’annulation, de la sécurité ou du remboursement d’un événement tiers. Un lien de billetterie n’est actif qu’après vérification ; le vendeur indiqué sur la billetterie reste le cocontractant de l’acheteur."],
        ["Modération","La plateforme peut masquer, corriger ou supprimer un contenu, suspendre un compte et conserver les éléments nécessaires à la preuve ou au respect d’une obligation légale. Une décision peut être contestée via la page « Exercer mes droits »."],
        ["Messagerie","L’auteur peut modifier son message pendant trente minutes. Une suppression le masque aux participants, mais une copie de sécurité à accès très restreint peut être conservée temporairement pour la modération, la sécurité et la réponse à une demande légale vérifiée."],
        ["Droit applicable","Les CGU sont soumises au droit français. Une solution amiable est recherchée avant toute action, sans priver un consommateur de ses droits impératifs."],
      ],
    },
    privacy:{
      eyebrow:"RGPD", title:"Politique de confidentialité",
      intro:"Cette politique explique les traitements de données effectués par Malagasy Events.",
      sections:[
        ["Responsable et contact","Le responsable du traitement est l’exploitant de Malagasy Events. Contact données personnelles : "+LEGAL_CONTACT+". Les informations d’identité complètes du responsable doivent être ajoutées dans les mentions légales."],
        ["Données traitées","Compte : e-mail, identifiant technique, pseudonyme et authentification. Profil : avatar, code postal, centres d’intérêt et type de compte. Service : publications, commentaires, abonnements, messages, événements, signalements, demandes de revendication et rappels. Sécurité : journaux techniques et données nécessaires à la prévention des abus."],
        ["Finalités et bases légales","Compte, publications, messagerie et abonnements : exécution des CGU. Modération, sécurité et prévention de la fraude : intérêt légitime et obligations légales. Facturation : contrat et obligations comptables. Communications facultatives : consentement. Annuaire professionnel : intérêt légitime après mise en balance, information et possibilité d’opposition."],
        ["Sources des annuaires","Les fiches peuvent provenir de données professionnelles rendues publiques par la structure ou de sources ouvertes. Aucune donnée personnelle sans lien direct avec l’activité n’est volontairement ajoutée. Toute personne peut demander la source, la correction, l’opposition ou l’effacement selon sa situation."],
        ["Destinataires et prestataires","Accès limité à l’équipe habilitée et aux prestataires nécessaires, notamment Supabase et Vercel. Les contenus publics sont visibles des visiteurs. Les transferts éventuels hors EEE doivent reposer sur une décision d’adéquation ou des garanties contractuelles appropriées."],
        ["Conservation","Compte et profil : pendant l’utilisation du compte puis suppression ou anonymisation dans un délai raisonnable après clôture. Contenus : pendant leur publication puis durée nécessaire à la sauvegarde et aux litiges. Les versions modifiées ou supprimées des messages sont archivées séparément pendant six mois, avec accès réservé au super-administrateur et consultation tracée ; une conservation plus longue n’est possible qu’en cas de signalement grave, litige ou demande légale vérifiée. Signalements et demandes : durée de traitement puis archivage probatoire limité. Données comptables : durée légale. Logs de sécurité : durée proportionnée, normalement douze mois maximum sauf incident. L’identifiant de mesure d’audience expire au plus tard après treize mois sans prolongation automatique et les événements de mesure plus anciens sont supprimés."],
        ["Mesure d’audience interne","Malagasy Events mesure les pages consultées, les visites répétées, la provenance générale et les clics externes afin d’améliorer uniquement son propre site. Aucun nom, e-mail, identifiant de compte ou adresse IP n’est enregistré dans cette table. Un code pseudonyme distingue un navigateur, sans suivre la personne sur d’autres sites. Les données ne sont ni utilisées pour la publicité, ni revendues, ni rapprochées des comptes membres. L’accès aux parcours détaillés est réservé au Super Admin. Pour toute question ou demande : "+LEGAL_CONTACT+"."],
        ["Vos droits","Vous pouvez demander l’accès, la rectification, l’effacement, la limitation, l’opposition et, lorsque applicable, la portabilité. Une réponse est apportée en principe sous un mois. Vous pouvez également saisir la CNIL."],
      ],
    },
    cookies:{
      eyebrow:"Traceurs", title:"Cookies et stockage local",
      intro:"Malagasy Events limite les traceurs à ce qui est nécessaire au service.",
      sections:[
        ["Nécessaires","Supabase utilise le stockage local du navigateur pour maintenir la session. La plateforme mémorise aussi des préférences d’interface. Ces éléments sont indispensables au service demandé."],
        ["Mesure d’audience","Notre mesure interne sans cookie publicitaire permet de compter les pages vues, les sessions, les retours d’un même navigateur, la provenance UTM et les clics vers des sites externes. Elle est limitée à Malagasy Events et ne contient ni nom, ni adresse e-mail, ni identifiant de compte, ni adresse IP. L’identifiant expire après treize mois au maximum et sa durée n’est pas renouvelée lors d’une visite."],
        ["Services tiers","Les cartes, vidéos, billetteries et liens externes peuvent dépendre de tiers. La plateforme privilégie un clic volontaire avant l’ouverture de ces services. Le tiers applique alors sa propre politique."],
        ["Votre choix","Aucun pixel publicitaire ni traceur marketing n’est autorisé sans information préalable et, lorsque requis, consentement. Vous pouvez supprimer les données locales depuis les réglages de votre navigateur ; cela peut vous déconnecter."],
      ],
    },
    moderation:{
      eyebrow:"Sécurité", title:"Modération et signalement",
      intro:"Procédure applicable aux contenus, fiches, avis et comptes.",
      sections:[
        ["Signaler","Toute personne, même non inscrite, peut utiliser « Exercer mes droits » pour identifier le contenu, son URL, le motif, les droits concernés et joindre les informations utiles. Les urgences manifestes sont traitées en priorité."],
        ["Examen","La plateforme vérifie la précision du signalement, peut masquer le contenu à titre conservatoire, contacte l’auteur si nécessaire et conserve une trace de la décision. Un retrait n’implique pas la reconnaissance d’une faute."],
        ["Décisions","Mesures possibles : correction, restriction, déréférencement, retrait, avertissement, suspension ou fermeture du compte. La personne concernée reçoit le motif lorsque cela est possible et peut contester la décision."],
        ["Priorités","Retrait rapide des contenus manifestement illicites, atteintes à la sécurité, usurpations, données privées, menaces, haine, contenus sexuels non consentis et violations documentées de propriété intellectuelle."],
        ["Avis et commentaires","Les avis ne sont ni achetés ni triés selon leur caractère positif ou négatif. Les critères de classement, dates et règles de conservation doivent être affichés si un système d’avis de consommateurs est activé."],
      ],
    },
    ranking:{
      eyebrow:"Transparence", title:"Référencement, classement et mises en avant",
      intro:"Cette page explique comment les contenus sont ajoutés, classés et retirés.",
      sections:[
        ["Référencement","Une fiche peut être proposée par un utilisateur, une structure, l’équipe éditoriale ou provenir d’informations professionnelles publiques. Elle doit être utile à la communauté, suffisamment précise et respecter les droits de tiers."],
        ["Classement par défaut","Les événements sont principalement classés par date, puis filtrés par ville, catégorie et recherche textuelle. Les annuaires peuvent être classés alphabétiquement, par catégorie, zone ou pertinence pour la recherche."],
        ["Mises en avant payantes","Une offre Premium ou Organisateur peut donner une visibilité renforcée. Toute mise en avant influencée par une rémunération doit porter une mention visible comme « À la une », « Sponsorisé » ou « Mise en avant payante ». Le paiement n’autorise pas un contenu illicite et ne garantit pas une recommandation de qualité."],
        ["Déréférencement","Une fiche peut être retirée si elle est inexacte, obsolète, frauduleuse, illicite, contraire aux CGU, sans lien avec le service, ou si une opposition juridiquement fondée l’exige. Le responsable peut revendiquer sa fiche et demander une correction."],
        ["Relations commerciales","Malagasy Events indique lorsqu’un lien capitalistique, un partenariat ou une rémunération influence le classement. En l’absence de mention, le référencement ne constitue pas un partenariat."],
      ],
    },
  }
  const doc = docs[kind]||docs.legal
  return <main style={{...publicPageShell,maxWidth:900}}>
    <header style={{textAlign:"center",marginBottom:26}}>
      <p style={{color:RED,fontWeight:900,fontSize:12,letterSpacing:1.4,textTransform:"uppercase",margin:"0 0 8px"}}>{doc.eyebrow}</p>
      <h1 style={{color:"#26215C",fontSize:isMobile?28:40,lineHeight:1.12,margin:"0 0 12px"}}>{doc.title}</h1>
      <p style={{color:"#666",fontSize:15,lineHeight:1.65,maxWidth:720,margin:"0 auto"}}>{doc.intro}</p>
      <p style={{fontSize:12,color:"#999",margin:"10px 0 0"}}>Version du 7 août 2026</p>
    </header>
    <section style={{display:"grid",gap:12}}>
      {doc.sections.map(([title,text])=><article key={title} style={legalSectionStyle}><h2 style={{color:"#26215C",fontSize:18,margin:0}}>{title}</h2><p style={legalTextStyle}>{text}</p></article>)}
    </section>
    {(kind==="privacy"||kind==="cookies")&&<section style={{...legalSectionStyle,marginTop:12,border:`1px solid ${audienceRefused?'#ddd':GREEN}`}}><h2 style={{color:"#26215C",fontSize:18,margin:0}}>Votre choix pour la mesure d’audience</h2><p style={legalTextStyle}>{audienceRefused?"Ce navigateur n’est pas comptabilisé dans les statistiques internes.":"Ce navigateur est comptabilisé sans nom, e-mail, compte utilisateur ni adresse IP."}</p><button onClick={()=>changeAudienceChoice(!audienceRefused)} style={{marginTop:10,border:0,borderRadius:99,padding:'10px 15px',background:audienceRefused?GREEN:'#eee',color:audienceRefused?WHITE:'#444',fontWeight:900,cursor:'pointer'}}>{audienceRefused?'Autoriser la mesure d’audience':'Ne pas comptabiliser mes visites'}</button><p style={{fontSize:10,color:'#999',margin:'9px 0 0'}}>Vous pouvez aussi écrire à <a href={`mailto:${LEGAL_CONTACT}?subject=${encodeURIComponent('Opposition à la mesure d’audience')}`} style={{color:GREEN}}>{LEGAL_CONTACT}</a>.</p></section>}
  </main>
}

function RightsPage({isMobile,user,userProfile}) {
  const [type,setType] = useState("access")
  const [email,setEmail] = useState(user?.email||"")
  const [subject,setSubject] = useState("")
  const [details,setDetails] = useState("")
  const [sent,setSent] = useState(false)
  const [saving,setSaving] = useState(false)
  const [error,setError] = useState("")
  const submit = async e => {
    e.preventDefault()
    if (!email.trim() || !details.trim()) { setError("Indiquez votre e-mail et décrivez précisément la demande."); return }
    setSaving(true); setError("")
    const payload = {requester_id:user?.id||null,requester_email:email.trim().toLowerCase(),request_type:type,subject:subject.trim(),details:details.trim(),status:"received"}
    const {error:dbError} = await supabase.from("privacy_requests").insert(payload)
    setSaving(false)
    if (dbError) {
      setError("La demande n’a pas pu être enregistrée automatiquement. Envoyez-la à "+LEGAL_CONTACT+" en reprenant les informations ci-dessous.")
      return
    }
    setSent(true)
  }
  return <main style={{...publicPageShell,maxWidth:820}}>
    <header style={{textAlign:"center",marginBottom:24}}>
      <p style={{color:GREEN,fontWeight:900,fontSize:12,letterSpacing:1.4,textTransform:"uppercase",margin:"0 0 8px"}}>Données · fiches · contenus</p>
      <h1 style={{color:"#26215C",fontSize:isMobile?28:40,lineHeight:1.12,margin:"0 0 12px"}}>Exercer mes droits</h1>
      <p style={{color:"#666",fontSize:15,lineHeight:1.65,margin:0}}>Accès, rectification, opposition, effacement, portabilité, revendication d’une fiche ou signalement d’un contenu.</p>
    </header>
    <div style={{background:"#fff8e8",border:"1px solid #eed89c",borderRadius:14,padding:"12px 15px",fontSize:13,color:"#6b5419",lineHeight:1.55,marginBottom:16}}>Une réponse est apportée en principe sous un mois. Pour protéger vos données, une preuve d’identité proportionnée peut être demandée. N’envoyez pas de pièce d’identité dans ce premier formulaire.</div>
    {sent ? <section style={{...publicCard,textAlign:"center"}}><div style={{fontSize:38}}>✅</div><h2 style={{color:"#26215C"}}>Demande enregistrée</h2><p style={legalTextStyle}>Conservez une copie de votre demande. L’équipe vous répondra à l’adresse indiquée.</p></section> :
    <form onSubmit={submit} style={{...publicCard,display:"grid",gap:14}}>
      <label style={{fontSize:13,fontWeight:800,color:"#333"}}>Nature de la demande
        <select value={type} onChange={e=>setType(e.target.value)} style={{width:"100%",marginTop:6,padding:"11px 12px",border:"1px solid #ddd",borderRadius:10}}>
          <option value="access">Accéder à mes données</option>
          <option value="rectification">Corriger des données ou une fiche</option>
          <option value="opposition">M’opposer à un traitement ou au référencement</option>
          <option value="erasure">Demander l’effacement / la fermeture du compte</option>
          <option value="portability">Recevoir mes données dans un format portable</option>
          <option value="claim">Revendiquer une fiche professionnelle</option>
          <option value="content">Signaler un contenu ou une atteinte à mes droits</option>
          <option value="appeal">Contester une décision de modération</option>
        </select>
      </label>
      <label style={{fontSize:13,fontWeight:800,color:"#333"}}>Adresse e-mail
        <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="vous@exemple.fr" style={{width:"100%",boxSizing:"border-box",marginTop:6,padding:"11px 12px",border:"1px solid #ddd",borderRadius:10}}/>
      </label>
      <label style={{fontSize:13,fontWeight:800,color:"#333"}}>Fiche, contenu ou URL concerné
        <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Nom de la fiche ou lien exact" style={{width:"100%",boxSizing:"border-box",marginTop:6,padding:"11px 12px",border:"1px solid #ddd",borderRadius:10}}/>
      </label>
      <label style={{fontSize:13,fontWeight:800,color:"#333"}}>Votre demande
        <textarea required value={details} onChange={e=>setDetails(e.target.value)} rows={7} placeholder="Expliquez les informations à corriger ou retirer, votre lien avec la fiche et les raisons de la demande." style={{width:"100%",boxSizing:"border-box",marginTop:6,padding:"11px 12px",border:"1px solid #ddd",borderRadius:10,resize:"vertical",fontFamily:"Arial,sans-serif"}}/>
      </label>
      <label style={{display:"flex",gap:9,alignItems:"flex-start",fontSize:12,color:"#666",lineHeight:1.45}}><input required type="checkbox" style={{marginTop:2}}/>Je certifie que les informations fournies sont exactes et j’accepte leur utilisation pour traiter cette demande.</label>
      {error && <p role="alert" style={{background:"#fff0f1",color:RED,borderRadius:10,padding:11,margin:0,fontSize:12,lineHeight:1.5}}>{error} <a href={`mailto:${LEGAL_CONTACT}`} style={{color:RED,fontWeight:800}}>Écrire par e-mail</a></p>}
      <button disabled={saving} style={{background:GREEN,color:WHITE,border:"none",borderRadius:12,padding:"12px 18px",fontWeight:900,cursor:"pointer"}}>{saving?"Enregistrement…":"Envoyer ma demande"}</button>
      {userProfile && <p style={{fontSize:11,color:"#999",margin:0}}>Compte connecté : @{userProfile.username||"membre"}. La demande sera liée à ce compte.</p>}
    </form>}
  </main>
}

const LCM_TEAMS = [
  {pos:1,name:'Phil-France',w:13,l:2,color:'#27394f',abbr:'PF'},
  {pos:2,name:'B-Miray',w:13,l:2,color:'#201814',abbr:'BM'},
  {pos:3,name:'Legasy',w:12,l:4,color:'#0b6638',abbr:'LG'},
  {pos:4,name:'Clichy',w:6,l:9,color:'#222',abbr:'CL'},
  {pos:5,name:'Uzumaki',w:6,l:10,color:'#e16d18',abbr:'UZ'},
  {pos:6,name:'Fizamami',w:6,l:10,color:'#78206f',abbr:'FZ'},
  {pos:7,name:'Raikitra',w:6,l:10,color:'#be1821',abbr:'RK'},
  {pos:8,name:'Tafaray',w:4,l:11,color:'#128651',abbr:'TF'},
  {pos:9,name:'MBC',w:4,l:12,color:'#d47b22',abbr:'MB'},
]
const TeamBadge = ({team,size=42}) => <span aria-label={team.name} title={team.name} style={{width:size,height:size,borderRadius:'50%',display:'inline-flex',alignItems:'center',justifyContent:'center',flex:'0 0 auto',background:team.color,color:WHITE,border:'3px solid #fff',boxShadow:'0 2px 8px rgba(0,0,0,.18)',fontSize:size*.27,fontWeight:950,letterSpacing:-.5}}>{team.abbr}</span>

function TournamentsPage({isMobile}) {
  const [sport,setSport]=useState('basket')
  const [opened,setOpened]=useState(false)
  const [tab,setTab]=useState('overview')
  const phil=LCM_TEAMS[0],miray=LCM_TEAMS[1],uzumaki=LCM_TEAMS[4]
  const pill=(active)=>({border:active?`1px solid ${GREEN}`:'1px solid #e4e4e4',background:active?GREEN:WHITE,color:active?WHITE:'#333',borderRadius:99,padding:isMobile?'8px 12px':'9px 15px',fontSize:12,fontWeight:850,cursor:'pointer',whiteSpace:'nowrap'})
  const official='https://lcmbasket.com/'
  if(opened) return <main style={{maxWidth:1080,margin:'0 auto',padding:isMobile?'18px 14px 70px':'30px 24px 80px'}}>
    <button onClick={()=>setOpened(false)} style={{border:0,background:'transparent',color:GREEN,fontWeight:850,cursor:'pointer',padding:0,marginBottom:14}}>← Tous les tournois</button>
    <section style={{background:'linear-gradient(135deg,#006b38,#083d29)',color:WHITE,borderRadius:isMobile?20:28,padding:isMobile?'22px 18px':'32px',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',right:-35,top:-55,width:190,height:190,border:'3px solid rgba(255,255,255,.10)',borderRadius:'50%'}}/>
      <p style={{color:'#ffd044',fontWeight:900,fontSize:11,textTransform:'uppercase',letterSpacing:1.4,margin:'0 0 8px'}}>🏀 Championnat en cours</p>
      <h1 style={{fontSize:isMobile?27:40,lineHeight:1.05,margin:'0 0 8px'}}>Ligue Clichy Madagascar</h1>
      <p style={{margin:0,color:'rgba(255,255,255,.82)',fontWeight:700}}>Basket · Saison 2025–2026 · Clichy</p>
    </section>
    <nav style={{display:'flex',overflowX:'auto',gap:4,background:WHITE,borderRadius:16,padding:6,margin:'-10px 10px 18px',position:'relative',boxShadow:'0 8px 25px rgba(0,0,0,.09)'}}>{[['overview','Aperçu'],['games','Matchs'],['ranking','Classement'],['teams','Équipes']].map(([k,l])=><button key={k} onClick={()=>setTab(k)} style={{flex:'1 0 auto',border:0,borderRadius:11,padding:'10px 13px',background:tab===k?'#fff0f2':'transparent',color:tab===k?RED:'#555',fontWeight:900,cursor:'pointer'}}>{l}</button>)}</nav>
    {(tab==='overview'||tab==='games')&&<section style={{background:WHITE,borderRadius:20,padding:isMobile?17:23,marginBottom:16,boxShadow:'0 7px 22px rgba(0,0,0,.06)'}}>
      <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center',marginBottom:15}}><div><p style={{color:RED,fontWeight:950,fontSize:10,letterSpacing:1.1,margin:'0 0 4px'}}>DERNIER RÉSULTAT RÉFÉRENCÉ</p><p style={{fontSize:11,color:'#888',margin:0}}>21 septembre 2025 · Gymnase Van Gogh</p></div><span style={{background:'#e8f6ee',color:GREEN,borderRadius:99,padding:'5px 8px',fontSize:9,fontWeight:900}}>TERMINÉ</span></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',alignItems:'center',gap:12,textAlign:'center'}}><div><TeamBadge team={phil} size={isMobile?50:62}/><b style={{display:'block',fontSize:isMobile?12:15,marginTop:7}}>{phil.name}</b></div><div><b style={{fontSize:isMobile?26:36}}>66 <span style={{color:RED,fontSize:.55+'em'}}>–</span> 65</b></div><div><TeamBadge team={uzumaki} size={isMobile?50:62}/><b style={{display:'block',fontSize:isMobile?12:15,marginTop:7}}>{uzumaki.name}</b></div></div>
      <a href={official} target="_blank" rel="noopener noreferrer" style={{display:'block',textAlign:'center',marginTop:18,border:`1.5px solid ${GREEN}`,color:GREEN,borderRadius:12,padding:'10px 12px',fontSize:12,fontWeight:900,textDecoration:'none'}}>Voir le calendrier officiel ↗</a>
    </section>}
    {(tab==='overview'||tab==='ranking')&&<section style={{background:WHITE,borderRadius:20,padding:isMobile?17:23,marginBottom:16,boxShadow:'0 7px 22px rgba(0,0,0,.06)'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,marginBottom:10}}><h2 style={{fontSize:18,margin:0,color:GREEN}}>Classement 2025–2026</h2>{tab==='overview'&&<button onClick={()=>setTab('ranking')} style={{border:0,background:'transparent',color:RED,fontWeight:900,cursor:'pointer'}}>Voir tout →</button>}</div><div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',minWidth:420}}><thead><tr style={{fontSize:10,color:'#888',textAlign:'left'}}><th style={{padding:8}}>POS.</th><th>ÉQUIPE</th><th>V</th><th>D</th><th>%</th></tr></thead><tbody>{LCM_TEAMS.slice(0,tab==='overview'?3:9).map(team=><tr key={team.name} style={{borderTop:'1px solid #eee'}}><td style={{padding:9,fontWeight:950}}>{team.pos}</td><td><span style={{display:'flex',alignItems:'center',gap:9}}><TeamBadge team={team} size={34}/><b>{team.name}</b></span></td><td style={{fontWeight:900,color:GREEN}}>{team.w}</td><td>{team.l}</td><td>{(team.w/(team.w+team.l)).toFixed(3).replace(/^0/,'')}</td></tr>)}</tbody></table></div><p style={{fontSize:9,color:'#999',margin:'10px 0 0'}}>Données présentées d’après le classement communiqué. Consultez toujours la source officielle pour les mises à jour.</p></section>}
    {(tab==='overview'||tab==='teams')&&<section style={{background:WHITE,borderRadius:20,padding:isMobile?17:23,marginBottom:16,boxShadow:'0 7px 22px rgba(0,0,0,.06)'}}><h2 style={{fontSize:18,margin:'0 0 14px',color:GREEN}}>Les 9 équipes</h2><div style={{display:'grid',gridTemplateColumns:`repeat(${isMobile?3:5},1fr)`,gap:12}}>{LCM_TEAMS.map(team=><div key={team.name} style={{textAlign:'center',background:'#fafafa',borderRadius:14,padding:'12px 5px'}}><TeamBadge team={team} size={45}/><b style={{display:'block',fontSize:10,marginTop:7}}>{team.name}</b></div>)}</div></section>}
    <a href={official} target="_blank" rel="noopener noreferrer" style={{display:'block',background:GREEN,color:WHITE,borderRadius:14,padding:13,textAlign:'center',fontWeight:900,textDecoration:'none'}}>Consulter LCM Basket, site officiel ↗</a>
  </main>

  return <main style={{maxWidth:1120,margin:'0 auto',padding:isMobile?'20px 14px 70px':'36px 24px 80px'}}>
    <header style={{marginBottom:20}}><p style={{color:RED,fontSize:11,fontWeight:950,letterSpacing:1.4,textTransform:'uppercase',margin:'0 0 6px'}}>Sport malagasy en France</p><h1 style={{fontSize:isMobile?31:46,lineHeight:1.05,color:GREEN,margin:'0 0 9px'}}>🏆 Tournois</h1><p style={{fontSize:isMobile?14:17,color:'#666',lineHeight:1.55,maxWidth:720,margin:0}}>Calendriers, résultats, classements et équipes des compétitions de la communauté malagasy.</p></header>
    <div style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:8,marginBottom:14}}>{[['all','Tous'],['basket','🏀 Basket'],['football','⚽ Foot'],['volley','🏐 Volley'],['other','Autres']].map(([k,l])=><button key={k} onClick={()=>setSport(k)} style={pill(sport===k||(k==='all'&&sport==='all'))}>{l}</button>)}</div>
    {(sport==='all'||sport==='basket')&&<section style={{background:'linear-gradient(145deg,#007a3d,#06492f)',color:WHITE,borderRadius:isMobile?22:28,padding:isMobile?18:28,boxShadow:'0 16px 36px rgba(0,85,47,.22)',marginBottom:18,position:'relative',overflow:'hidden'}}><div style={{position:'absolute',right:-30,bottom:-55,width:190,height:190,borderRadius:'50%',border:'3px solid rgba(255,255,255,.08)'}}/><div style={{position:'relative'}}><p style={{fontSize:11,color:'#ffd044',fontWeight:950,textTransform:'uppercase',letterSpacing:1.2,margin:'0 0 7px'}}>🏀 Compétition à la une</p><h2 style={{fontSize:isMobile?23:32,margin:'0 0 6px'}}>Ligue Clichy Madagascar</h2><p style={{fontSize:13,color:'rgba(255,255,255,.82)',margin:'0 0 4px'}}>Saison 2025–2026 · Clichy</p><p style={{fontSize:12,fontWeight:850,margin:'0 0 18px'}}>9 équipes · Championnat en cours</p><div style={{background:WHITE,color:'#222',borderRadius:16,padding:15,maxWidth:620}}><p style={{color:RED,fontSize:10,fontWeight:950,textAlign:'center',margin:'0 0 10px'}}>DERNIER RÉSULTAT</p><div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:10,alignItems:'center',textAlign:'center'}}><div><TeamBadge team={phil}/><b style={{display:'block',fontSize:11,marginTop:5}}>{phil.name}</b></div><b style={{fontSize:25}}>66 <span style={{color:RED}}>–</span> 65</b><div><TeamBadge team={uzumaki}/><b style={{display:'block',fontSize:11,marginTop:5}}>{uzumaki.name}</b></div></div></div><div style={{display:'flex',gap:9,marginTop:14,flexWrap:'wrap'}}><button onClick={()=>setOpened(true)} style={{flex:'1 1 180px',border:0,borderRadius:12,padding:12,background:RED,color:WHITE,fontWeight:950,cursor:'pointer'}}>Voir le tournoi →</button><a href={official} target="_blank" rel="noopener noreferrer" style={{flex:'1 1 180px',border:'1px solid rgba(255,255,255,.65)',borderRadius:12,padding:11,color:WHITE,fontWeight:900,textAlign:'center',textDecoration:'none'}}>Site officiel ↗</a></div></div></section>}
    {sport!=='all'&&sport!=='basket'&&<section style={{background:WHITE,borderRadius:20,padding:'35px 20px',textAlign:'center'}}><div style={{fontSize:42}}>{sport==='football'?'⚽':sport==='volley'?'🏐':'🏅'}</div><h2 style={{margin:'10px 0 7px'}}>Compétitions prochainement</h2><p style={{color:'#777',fontSize:13,margin:'0 auto',maxWidth:460}}>Cette rubrique accueillera les tournois vérifiés dès que nous disposerons du calendrier et de la source officielle.</p></section>}
    {(sport==='all'||sport==='basket')&&<section style={{background:WHITE,borderRadius:20,padding:20}}><h2 style={{fontSize:19,margin:'0 0 5px'}}>Autres compétitions</h2><p style={{fontSize:12,color:'#888',margin:'0 0 15px'}}>Le football, le volley et les autres sports apparaîtront ici après vérification.</p><div style={{display:'grid',gridTemplateColumns:`repeat(auto-fit,minmax(${isMobile?220:260}px,1fr))`,gap:10}}>{[['⚽','Tournois de football'],['🏐','Compétitions de volley'],['🏅','Autres disciplines']].map(([e,l])=><div key={l} style={{background:'#f7f7f7',border:'1px solid #eee',borderRadius:14,padding:15,display:'flex',alignItems:'center',gap:11}}><span style={{fontSize:25}}>{e}</span><div><b style={{fontSize:13}}>{l}</b><p style={{fontSize:10,color:'#999',margin:'2px 0 0'}}>Bientôt</p></div></div>)}</div></section>}
  </main>
}

export default function App() {
  const [language,setLanguage]         = useState(()=>localStorage.getItem('mev_language')||'fr')
  const [events,setEvents]             = useState(()=>initialEvents.map(item=>({...item,image:approvedEventImage(item),mediaUrls:[]})))
  const [videos,setVideos]             = useState(initialVideos)
  const [gastro,setGastro]             = useState(initialGastro)
  const [orgas,setOrgas]               = useState(initialOrgas)
  const [lieux,setLieux]               = useState([])
  const [user,setUser]                 = useState(null)
  const [userProfile,setUserProfile]   = useState(null)
  const [showAuth,setShowAuth]         = useState(false)
  const [showProfile,setShowProfile]   = useState(false)
  const [profileInitialTab,setProfileInitialTab] = useState("profil")
  const [showMessages,setShowMessages] = useState(false)
  const [msgTarget,setMsgTarget]       = useState({type:'person',id:null,name:"",orga:null})
  const [page,setPage]                 = useState(()=>{
    const path=window.location.pathname
    return Object.keys(PAGE_PATHS).find(key=>PAGE_PATHS[key]===path)||"home"
  }) // initialise correctement les pages ouvertes par leur URL, dont /petites-annonces
  const [mobileMenu,setMobileMenu]     = useState(false)
  const [unreadMsgs,setUnreadMsgs]     = useState(0)
  const [unreadNotifications,setUnreadNotifications] = useState(0)
  const [communityStats,setCStats]     = useState({members:0,events:0})
  const [cityFilter,setCityFilter]     = useState("Toutes")
  const [catFilter,setCatFilter]       = useState("Toutes")
  const [search,setSearch]             = useState("")
  const [filterFeedback,setFilterFeedback] = useState("")
  const [showForm,setShowForm]         = useState(false)
  const [form,setForm]                 = useState(EMPTY_FORM)
  const [mediaInput,setMediaInput]     = useState("")
  const [banner,setBanner]             = useState("")
  const [showSubmit,setShowSubmit]     = useState(false)
  const [showResetPw,setShowResetPw]   = useState(false)
  const [homeView,setHomeView]         = useState("list") // "list" | "calendar"
  const [showPast,setShowPast]         = useState(false)
  const [isAdmin,setIsAdmin]           = useState(false)
  const [showLogin,setShowLogin]       = useState(false) // modal "ce compte n'est pas admin"
  const [logoClicks,setLogoClicks]     = useState(0)
  const [selectedEvent,setSelectedEvent] = useState(null)
  const [selectedOrganizer,setSelectedOrganizer] = useState(null)
  const [showOnboarding,setOnboarding] = useState(!localStorage.getItem('mev_visited'))
  const [showInterestOnboarding,setShowInterestOnboarding] = useState(false)
  const [showLoginIntent,setShowLoginIntent]               = useState(false)
  const [sessionCats,setSessionCats]                       = useState([]) // filtre temporaire de session
  const [showAdmin,setShowAdmin]       = useState(false)
  const [activeOrgaId,setActiveOrgaId] = useState(()=>localStorage.getItem('mev_active_orga')||null)
  const [viewingProfile,setViewingProfile] = useState(null) // {id, name}
  const [pendingSlug,setPendingSlug]   = useState(null)
  const [directoryRoute,setDirectoryRoute] = useState(null) // {kind,slug,page}
  const lastTrackedPath = useRef("")
  const isMobile                       = useIsMobile()
  const compactNav                     = useIsMobile(1180) // barre repliée en menu tant qu'il n'y a pas la place pour tous les onglets
  const ui = INTERFACE_LANGUAGES[language]||INTERFACE_LANGUAGES.fr
  const chooseLanguage = code => { setLanguage(code); localStorage.setItem('mev_language',code); document.documentElement.lang=code }

  /* ── Admin = compte Supabase officiel connecté (la sécurité réelle est côté serveur, via RLS) ── */
  useEffect(()=>{ setIsAdmin(userProfile?.username===ADMIN_USERNAME) },[userProfile])
  useEffect(()=>{ document.documentElement.lang=language },[language])
  useEffect(()=>{
    const root=document.getElementById("mev-app")
    translateFixedInterface(root,language)
    const observer=new MutationObserver(()=>translateFixedInterface(root,language))
    if(root) observer.observe(root,{childList:true,subtree:true})
    return ()=>observer.disconnect()
  },[language,page,selectedEvent,showAuth,showProfile,showMessages,showAdmin])
  const myOrgas = user ? orgas.filter(o=>o.owner_id===user.id) : []
  const activeOrga = myOrgas.find(o=>String(o.id)===String(activeOrgaId))||null
  const switchIdentity = id => { const next=id?String(id):null; setActiveOrgaId(next); if(next)localStorage.setItem('mev_active_orga',next);else localStorage.removeItem('mev_active_orga') }
  useEffect(()=>{ if(activeOrgaId && !myOrgas.some(o=>String(o.id)===String(activeOrgaId))) switchIdentity(null) },[user?.id,orgas.length])

  /* ── SEO : routing par URL, méta, données structurées ── */
  useEffect(()=>{
    const applyRoute = () => {
      const path = window.location.pathname
      if (path.startsWith("/evenement/")) { setPage("home"); setPendingSlug(decodeURIComponent(path.split("/")[2]||"")) }
      else {
        const directoryPrefixes = {
          "/restaurant/":{kind:"restaurant",page:"gastro"}, "/traiteur/":{kind:"restaurant",page:"gastro"},
          "/professionnel/":{kind:"professionnel",page:"orgas"}, "/sportif/":{kind:"sportif",page:"sportifs"},
          "/eglise/":{kind:"eglise",page:"eglises"}, "/boutique/":{kind:"boutique",page:"boutiques"},
          "/artisan/":{kind:"artisan",page:"artisanat"},
        }
        const prefix=Object.keys(directoryPrefixes).find(p=>path.startsWith(p))
        if(prefix){ const route={...directoryPrefixes[prefix],slug:decodeURIComponent(path.slice(prefix.length))}; setDirectoryRoute(route); setPage(route.page) }
        else { const k = Object.keys(PAGE_PATHS).find(k=>PAGE_PATHS[k]===path); setDirectoryRoute(null); setPage(k||"home") }
        setSelectedEvent(null)
      }
    }
    applyRoute()
    window.addEventListener("popstate", applyRoute)
    return ()=>window.removeEventListener("popstate", applyRoute)
  },[])

  useEffect(()=>{ // résoudre un lien profond /evenement/slug une fois les événements chargés
    if (!pendingSlug) return
    const ev = events.find(e=>slugify(e.title)===pendingSlug)
    if (ev) { setSelectedEvent(ev); setPendingSlug(null) }
  },[events,pendingSlug])

  useEffect(()=>{ // pages vues dans la navigation interne de l'application
    if(isAdmin) return
    const timer=setTimeout(()=>{
      const path=selectedEvent?`/evenement/${slugify(selectedEvent.title)}`:directoryRoute?window.location.pathname:(PAGE_PATHS[page]||'/')
      let recent={};try{recent=JSON.parse(sessionStorage.getItem('mev_last_page_view')||'{}')}catch{}
      if(lastTrackedPath.current===path||(recent.path===path&&Date.now()-(recent.time||0)<5000)) return
      lastTrackedPath.current=path
      try{sessionStorage.setItem('mev_last_page_view',JSON.stringify({path,time:Date.now()}))}catch{}
      trackVisitEvent('page_view',{page_path:path,page_title:document.title.slice(0,200),landing_path:(sessionStorage.getItem('mev_landing_path')||path).slice(0,500)})
      try { if(!sessionStorage.getItem('mev_landing_path')) sessionStorage.setItem('mev_landing_path',path) } catch {}
    },350)
    return()=>clearTimeout(timer)
  },[page,selectedEvent,directoryRoute,isAdmin])

  useEffect(()=>{ // clics vers Facebook, Instagram, billetteries et autres sites externes
    if(isAdmin) return
    const onClick=e=>{
      const a=e.target.closest?.('a[href]'); if(!a) return
      let url; try{url=new URL(a.href,window.location.href)}catch{return}
      if(url.origin===window.location.origin) return
      const host=url.hostname.replace(/^www\./,'').toLowerCase()
      const platform=host.includes('instagram')?'instagram':host.includes('facebook')||host==='fb.com'?'facebook':host.includes('tiktok')?'tiktok':'external'
      trackVisitEvent(platform==='external'?'outbound_link_click':'outbound_social_click',{destination_host:host.slice(0,200),destination_url:(url.origin+url.pathname).slice(0,800),link_label:(a.textContent||a.getAttribute('aria-label')||'').trim().slice(0,200),platform})
    }
    document.addEventListener('click',onClick,true)
    return()=>document.removeEventListener('click',onClick,true)
  },[isAdmin])

  useEffect(()=>{ // URL + méta par page
    if (selectedEvent) return
    if (directoryRoute) {
      if (page!==directoryRoute.page) { setDirectoryRoute(null); return }
      const source=directoryRoute.kind==="restaurant"?gastro:directoryRoute.kind==="professionnel"||directoryRoute.kind==="sportif"?orgas:lieux
      const item=source.find(x=>slugify(x.name)===directoryRoute.slug)
      if(item){
        const labels={restaurant:"Restaurant malgache",professionnel:"Professionnel malagasy",sportif:"Club sportif malagasy",eglise:"Église malagasy",boutique:"Boutique malgache",artisan:"Artisanat malgache"}
        const label=labels[directoryRoute.kind]
        const desc=`${item.name}${item.city?` à ${item.city}`:""} — ${item.note||`${label} référencé sur Malagasy Events.`}`.slice(0,160)
        setMeta(`${item.name}${item.city?` — ${item.city}`:""} | ${label}`,desc)
        setJsonLd("ld-directory",{"@context":"https://schema.org","@type":directoryRoute.kind==="restaurant"?"Restaurant":directoryRoute.kind==="boutique"?"Store":directoryRoute.kind==="eglise"?"Church":"Organization",name:item.name,url:SITE_URL+window.location.pathname,description:item.note||undefined,telephone:item.phone||undefined,address:item.address?{"@type":"PostalAddress",streetAddress:item.address,addressLocality:item.city,addressCountry:"FR"}:undefined,sameAs:[item.site,item.fb,item.insta].filter(Boolean)})
      }
      return
    }
    setJsonLd("ld-directory",null)
    const path = PAGE_PATHS[page]||"/"
    if (window.location.pathname!==path) window.history.pushState({},"",path)
    const [t,d] = PAGE_META[page]||PAGE_META.home
    setMeta(t,d,{index:page!=="notifications" && page!=="community" && page!=="aftermovies" && page!=="offers"})
    setJsonLd("ld-breadcrumb", page==="home" ? null : {"@context":"https://schema.org","@type":"BreadcrumbList",
      itemListElement:[
        {"@type":"ListItem",position:1,name:"Accueil",item:SITE_URL+"/"},
        {"@type":"ListItem",position:2,name:t.split("—")[0].trim(),item:SITE_URL+path},
      ]})
  },[page,selectedEvent,directoryRoute,gastro,orgas,lieux])

  useEffect(()=>{ // URL + méta + JSON-LD de l'événement ouvert
    if (selectedEvent) {
      const path = "/evenement/"+slugify(selectedEvent.title)
      if (window.location.pathname!==path) window.history.pushState({},"",path)
      setMeta(`${selectedEvent.title} — ${fmtShort(selectedEvent.date)} · ${selectedEvent.city} | Malagasy Events`, (selectedEvent.description||selectedEvent.title).slice(0,160), {
        image:SITE_URL+"/og-image.png"
      })
      setJsonLd("ld-event", {"@context":"https://schema.org", ...eventJsonLd(selectedEvent)})
      setJsonLd("ld-breadcrumb", {"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:[
        {"@type":"ListItem",position:1,name:"Accueil",item:SITE_URL+"/"},
        {"@type":"ListItem",position:2,name:"Événements",item:SITE_URL+"/"},
        {"@type":"ListItem",position:3,name:selectedEvent.title,item:SITE_URL+path},
      ]})
    } else setJsonLd("ld-event", null)
  },[selectedEvent])

  useEffect(()=>{ // Données structurées Organisation + Site (une fois)
    setJsonLd("ld-org", {"@context":"https://schema.org","@type":"Organization","@id":SITE_URL+"/#organization",
      name:"Malagasy Events", alternateName:["Malagasy Event","MalagasyEvents","Malagasy Events France","Agenda Malagasy France"], url:SITE_URL,
      logo:{"@type":"ImageObject","@id":SITE_URL+"/#logo",url:SITE_URL+"/logo-512.png",contentUrl:SITE_URL+"/logo-512.png",width:512,height:512,caption:"Malagasy Events"},
      image:{"@id":SITE_URL+"/#logo"},
      description:"L'agenda des événements et des bonnes adresses de la communauté malagasy en France.",
      sameAs:[OFFICIAL_SOCIALS.facebook,OFFICIAL_SOCIALS.instagram],
      areaServed:{"@type":"Country",name:"France"}})
    setJsonLd("ld-website", {"@context":"https://schema.org","@type":"WebSite","@id":SITE_URL+"/#website",
      name:"Malagasy Events", alternateName:["Malagasy Event","MalagasyEvents","Agenda Malagasy France"], url:SITE_URL,
      inLanguage:"fr-FR", publisher:{"@id":SITE_URL+"/#organization"},
      potentialAction:{"@type":"SearchAction", target:SITE_URL+"/?q={search_term_string}", "query-input":"required name=search_term_string"}})
  },[])

  useEffect(()=>{ // Questions fréquentes : variantes de recherche utiles et réponses visibles
    const faq = [
      {q:"Où trouver les événements malagasy en France ?",a:"Malagasy Events rassemble les soirées, concerts, festivals, rencontres sportives et sorties de la communauté malagasy partout en France."},
      {q:"Comment trouver une soirée gasy près de chez moi ?",a:"Consultez l’agenda Malagasy Events et filtrez les sorties par ville ou région : Paris, Lyon, Marseille, Toulouse et toute la France."},
      {q:"Où trouver un restaurant ou un traiteur malgache en France ?",a:"L’annuaire gastronomie de Malagasy Events référence des restaurants, traiteurs et food trucks malgaches avec leurs adresses et contacts."},
      {q:"Comment publier un événement malgache ?",a:"Les organisateurs et associations peuvent proposer leur événement sur Malagasy Events afin de le rendre visible auprès de la diaspora malgache en France."},
    ]
    setJsonLd("ld-faq", (page==="home"||page==="faq") ? {"@context":"https://schema.org","@type":"FAQPage",mainEntity:faq.map(x=>({"@type":"Question",name:x.q,acceptedAnswer:{"@type":"Answer",text:x.a}}))} : null)
  },[page])

  useEffect(()=>{ // JSON-LD listes (événements à venir + annuaire gastro)
    const upcomingLd = events.filter(e=>!isPast(e.date))
    setJsonLd("ld-events", page==="home" && upcomingLd.length ? {"@context":"https://schema.org","@type":"ItemList",
      itemListElement: upcomingLd.map((e,i)=>({"@type":"ListItem",position:i+1,item:eventJsonLd(e)}))} : null)
    setJsonLd("ld-gastro", page==="gastro" && gastro.length ? {"@context":"https://schema.org","@type":"ItemList",
      itemListElement: gastro.map((g,i)=>({"@type":"ListItem",position:i+1,item:{
        "@type": g.type==="Restaurant"?"Restaurant":"FoodEstablishment", name:g.name, servesCuisine:"Malgache",
        ...(g.address?{address:{"@type":"PostalAddress",streetAddress:g.address,addressCountry:"FR"}}:{}),
        ...(g.phone?{telephone:g.phone}:{}), ...(g.fb?{sameAs:[g.fb,g.insta].filter(Boolean)}:{}),
        ...(g.lat?{geo:{"@type":"GeoCoordinates",latitude:g.lat,longitude:g.lng}}:{}),
      }}))} : null)
  },[events,gastro,page])

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{ setUser(session?.user??null); if(session?.user) fetchProfile(session.user.id) })
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_e,session)=>{ setUser(session?.user??null); if(session?.user) fetchProfile(session.user.id); else setUserProfile(null); if(_e==="PASSWORD_RECOVERY") setShowResetPw(true) })
    fetchStats()
    loadDb()
    return()=>subscription.unsubscribe()
  },[])

  useEffect(()=>{ if(user) { fetchUnread(); fetchUnreadNotifications() } else setUnreadNotifications(0) },[user,activeOrga?.id])

  const loadDb = async () => {
    const [ev,ga,vi] = await Promise.all([
      supabase.from('events').select('*'),
      supabase.from('gastro').select('*').order('name'),
      supabase.from('videos').select('*').order('id'),
    ])
    if (!ev.error && ev.data?.length) {
      const verifiedEvents = ev.data.filter(isConfirmedAgendaEvent).map(item=>({
        ...item,
        ...(verifiedEventPatches[String(item.title||"").trim().toLowerCase()]||{}),
        image:approvedEventImage(item),
        mediaUrls:[],
      }))
      const additions = supplementalEvents.filter(isConfirmedAgendaEvent).filter(extra=>!verifiedEvents.some(item=>
        String(item.title||"").trim().toLowerCase()===extra.title.toLowerCase()
        && String(item.date||"")===extra.date
      ))
      setEvents(dedupeEvents([...verifiedEvents,...additions]).map(item=>({...item,image:approvedEventImage(item),mediaUrls:[]})))
    } else {
      setEvents(dedupeEvents([...initialEvents,...supplementalEvents].filter(isConfirmedAgendaEvent)).map(item=>({...item,image:approvedEventImage(item),mediaUrls:[]})))
    }
    if (!ga.error && ga.data?.length) {
      const missingGastroDefaults = initialGastro.filter(def=>!ga.data.some(item=>String(item.name||"").trim().toLowerCase()===String(def.name||"").trim().toLowerCase()))
      setGastro(dedupeByName([...ga.data,...missingGastroDefaults]).map(normalizeGastroRow).filter(item=>VERIFIED_GASY_GASTRO_NAMES.has(normalizedDirectoryName(item.name))))
    }
    const og = await supabase.from('organisateurs').select('*').order('id')
    if (!og.error && og.data?.length) {
      const verifiedOrgas = og.data.map(item=>{
        const name=String(item.name||"").trim().toLowerCase()
        if(name==="rns — rencontre nationale sportive" || name==="rns - rencontre nationale sportive") return {...item,logo_url:"/images/rns-cen-logo.jpg",insta:"https://www.instagram.com/rns_cen/",note:"Partenaire Malagasy Events. Le plus grand événement sportif et culturel de la diaspora malagasy, depuis 1975. Organise la RNS de Pâques à Vichy et le Madadiaspora Foot en décembre."}
        if(name==="gas'paname sport") return {...item,followers:"2 800",insta:"https://www.instagram.com/gas_paname_sport/",note:"Communauté sportive malagasy de Paris : Gaspaname Game, Coupe du Monde Gas’Paname, basket et foot inter-lycées de Tana Alumni France."}
        if(name==="malagasy en france 2.0") return {...item,site:"",note:"Émission web d'actualités de la diaspora malagasy en France. Ancien domaine indisponible au contrôle du 26 août 2026."}
        return item
      })
      const missingDefaults = initialOrgas.filter(def=>!verifiedOrgas.some(item=>String(item.name||"").toLowerCase()===String(def.name||"").toLowerCase()))
      setOrgas(dedupeByName([...verifiedOrgas,...missingDefaults]))
    }
    if (!vi.error && vi.data?.length) setVideos(vi.data)
    const bn = await supabase.from('site_settings').select('value').eq('key','banner').maybeSingle()
    if (bn.data?.value) setBanner(bn.data.value)
    const lx = await supabase.from('lieux').select('*').order('id')
    if (!lx.error && lx.data) setLieux(dedupeByName(lx.data))
  }

  const fetchProfile = async id => {
    const {data} = await supabase.from('profiles').select('*').eq('id',id).single()
    setUserProfile(data)
    return data
  }
  const fetchStats = async () => {
    const [{count:members},{count:evCount}] = await Promise.all([
      supabase.from('profiles').select('*',{count:'exact',head:true}),
      supabase.from('event_interests').select('*',{count:'exact',head:true}),
    ])
    setCStats({members:members||0,events:evCount||0})
  }
  const fetchUnread = async () => {
    if (!user) return
    let q
    if (activeOrga) q = supabase.from('orga_messages').select('*',{count:'exact',head:true}).eq('orga_id',activeOrga.id).eq('sent_as_orga',false).is('read_at',null)
    else q = supabase.from('messages').select('*',{count:'exact',head:true}).eq('recipient_id',user.id).eq('read',false)
    const {count} = await q
    setUnreadMsgs(count||0)
  }
  const fetchUnreadNotifications = async () => {
    if (!user) return
    let q = supabase.from('notifications').select('*',{count:'exact',head:true}).eq('user_id',user.id).is('read_at',null)
    q = activeOrga ? q.eq('orga_id',activeOrga.id) : q.is('orga_id',null)
    const {count} = await q
    setUnreadNotifications(count||0)
  }

  const handleSignOut = async () => { await supabase.auth.signOut(); setUser(null); setUserProfile(null) }

  const handleLogoClick = () => { const n=logoClicks+1; setLogoClicks(n); if(n>=3){ setLogoClicks(0); if(isAdmin) setShowAdmin(true); else if(user) setShowLogin(true); else setShowAuth(true) } }

  const userCats = userProfile?.categories||[]

  const applyFilters = list => {
    const q = search.toLowerCase()
    const activeCats = catFilter==="PourToi" ? (sessionCats.length>0 ? sessionCats : userCats) : null
    return list.filter(e=>{
      const cityOk = cityFilter==="Toutes" ? true : cityFilter==="Autre" ? !GRANDES_VILLES.includes(e.city) : e.city===cityFilter
      const catOk  = activeCats ? activeCats.includes(e.category) : (catFilter==="Toutes"||e.category===catFilter)
      const qOk    = !q||e.title.toLowerCase().includes(q)||e.location.toLowerCase().includes(q)||(e.organizer||"").toLowerCase().includes(q)
      return cityOk&&catOk&&qOk
    })
  }
  const announceFilters = () => {
    const count=applyFilters(events).filter(e=>!isPast(e.date)).length
    setFilterFeedback(`${count} événement${count>1?'s':''} trouvé${count>1?'s':''}`)
    setTimeout(()=>setFilterFeedback(''),2600)
    setTimeout(()=>document.getElementById('events-list')?.scrollIntoView({behavior:'smooth',block:'start'}),80)
  }

  const upcoming = applyFilters(events.filter(e=>!isPast(e.date))).sort((a,b)=>new Date(a.date)-new Date(b.date))
  const past     = applyFilters(events.filter(e=>isPast(e.date))).sort((a,b)=>new Date(b.date)-new Date(a.date))

  const handleSubmit = async e => {
    e.preventDefault()
    const payload = {...form, image:"", mediaUrls:[], createdAt:new Date().toISOString()}
    delete payload.id
    const {data,error} = await supabase.from('events').insert(payload).select().single()
    if (error) {
      alert("⚠️ Événement ajouté localement seulement (" + error.message + ").\nConnecte-toi avec le compte officiel pour le rendre permanent.")
      setEvents([...events,{...payload,id:Date.now()}])
    } else {
      const sync=await ensureRepeatOrganizerProfile({event:data,events,orgas})
      if (sync?.organizer) {
        setOrgas(list=>list.some(o=>String(o.id)===String(sync.organizer.id))?list.map(o=>String(o.id)===String(sync.organizer.id)?sync.organizer:o):[...list,sync.organizer])
        setEvents(list=>linkEventsToOrganizer([...list,data],data.organizer,sync.organizer.id))
      } else setEvents(list=>[...list,data])
      if (sync?.error) alert("Événement ajouté, mais la fiche organisateur n’a pas pu être créée : "+sync.error.message)
    }
    setForm(EMPTY_FORM); setMediaInput(""); setShowForm(false)
  }

  const addMedia = () => { if(mediaInput.trim()){setForm({...form,mediaUrls:[...(form.mediaUrls||[]),mediaInput.trim()]});setMediaInput("")} }
  const removeMedia = i => setForm({...form,mediaUrls:form.mediaUrls.filter((_,idx)=>idx!==i)})
  const deleteEvent = async id => { setEvents(ev=>ev.filter(e=>e.id!==id)); await adminSave(supabase.from('events').delete().eq('id',id)) }
  const extendEventFeatured = async ev => {
    const end = new Date(ev.featured_until||0)
    const start = end.getTime()>Date.now() ? end : new Date()
    const featured_until = new Date(start.getTime()+7*24*3600000).toISOString()
    const {data,error} = await supabase.from('events').update({featured_until}).eq('id',ev.id).select().single()
    if (error) { alert('⚠️ Prolongation impossible ('+error.message+')'); return }
    setEvents(list=>list.map(x=>x.id===ev.id?{...x,...data}:x))
    if (selectedEvent?.id===ev.id) setSelectedEvent({...selectedEvent,...data})
  }

  const openMsg = (target, recipientName) => {
    if (target && typeof target==='object' && target.type==='orga') setMsgTarget({type:'orga',id:null,name:target.orga?.name||'',orga:target.orga})
    else setMsgTarget({type:'person',id:target,name:recipientName||'',orga:null})
    setShowMessages(true)
  }

  const FilterBtn = ({label,active,onClick}) => (
    <button onClick={onClick} style={{padding:"5px 14px",borderRadius:99,fontSize:13,fontWeight:600,cursor:"pointer",border:"none",background:active?RED:WHITE,color:active?WHITE:"#555",boxShadow:active?`0 2px 8px ${RED}55`:"0 1px 4px rgba(0,0,0,0.08)",whiteSpace:"nowrap"}}>
      {label}
    </button>
  )

  const inp = {width:"100%",border:"1.5px solid #e5e5e5",borderRadius:12,padding:"9px 12px",fontSize:13,outline:"none",boxSizing:"border-box"}
  const lbl = {fontSize:13,fontWeight:600,color:"#444",display:"block",marginBottom:6}

  // After-movies et Communauté sont réservés aux membres connectés.
  const navItems = [
    {key:"home",label:ui.events},
    ...(user ? [{key:"aftermovies",label:ui.aftermovies}] : []),
    {key:"gastro",label:ui.gastro},
    {key:"eglises",label:ui.churches},
    {key:"sportifs",label:ui.sports},
    {key:"tournaments",label:ui.tournaments},
    {key:"boutiques",label:ui.shops},
    {key:"orgas",label:ui.professionals},
    {key:"guide",label:ui.guide},
    {key:"diaspora",label:ui.diaspora},
    {key:"classifieds",label:ui.classifieds},
    ...(user ? [{key:"community",label:ui.community}] : []),
  ]

  const dismissOnboarding = () => { localStorage.setItem('mev_visited','1'); setOnboarding(false) }

  const perkToken = new URLSearchParams(window.location.search).get("perk")
  if (perkToken) return <PerkValidationPage token={perkToken}/>

  return (
    <div id="mev-app" style={{minHeight:"100vh",background:"#f6f6f6",fontFamily:"system-ui,sans-serif"}}>

      {/* ── BANDEAU D'ANNONCE ── */}
      {banner && (
        <div style={{background:"#111",color:WHITE,padding:"9px 16px",fontSize:13,fontWeight:700,textAlign:"center",lineHeight:1.4}}>{banner}</div>
      )}

      {/* ── HEADER ── */}
      <header style={{background:WHITE,padding:isMobile?"12px 16px":"14px 24px",boxShadow:"0 2px 14px rgba(0,0,0,0.10)",position:"sticky",top:0,zIndex:60}}>
        <div style={{maxWidth:1400,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",gap:compactNav?7:12,flexWrap:"nowrap"}}>
          {compactNav && <button onClick={()=>setMobileMenu(m=>!m)} aria-label="Ouvrir le menu" style={{background:"#eaf6ef",color:GREEN,fontWeight:800,fontSize:20,width:38,height:38,borderRadius:11,border:"none",cursor:"pointer",flexShrink:0,transform:mobileMenu?'rotate(90deg)':'rotate(0)',transition:'transform .25s ease'}}>☰</button>}
          <a href="/" onClick={e=>{e.preventDefault();setPage('home');setSelectedEvent(null);setMobileMenu(false)}} style={{cursor:"pointer",flex:compactNav?"1 1 auto":"0 0 auto",minWidth:0,textDecoration:"none",textAlign:compactNav?"center":"left",overflow:"hidden"}} title="Retour à l'accueil">
            <h1 style={{fontWeight:900,fontSize:isMobile?17:compactNav?19:23,margin:0,whiteSpace:"nowrap",letterSpacing:-.5,overflow:"hidden",textOverflow:"ellipsis"}}><span style={{color:RED}}>🇲🇬 Malagasy</span><span style={{color:GREEN}}> Events</span></h1>
            {!compactNav && <p style={{color:"#777",fontSize:12,margin:"2px 0 0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{ui.tagline}</p>}
          </a>

          {/* Nav desktop */}
          {!compactNav && (
            <div style={{display:"flex",gap:2,flexWrap:"wrap",justifyContent:"center"}}>
              {navItems.map(n=>(
                <a key={n.key} href={PAGE_PATHS[n.key]||"/"} onClick={e=>{e.preventDefault();setPage(n.key)}} style={{background:page===n.key?"#eaf6ef":"transparent",color:page===n.key?GREEN:"#222",fontWeight:700,fontSize:13,padding:"8px 12px",borderRadius:10,border:"none",cursor:"pointer",whiteSpace:"nowrap",textDecoration:"none"}}>
                  {n.label}
                </a>
              ))}
            </div>
          )}

          <div style={{display:"flex",alignItems:"center",gap:compactNav?5:8,flexShrink:0}}>
            <label title="Langue du site" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:3,position:"relative",background:"#f3f3f3",borderRadius:99,padding:compactNav?0:"0 7px",width:compactNav?56:"auto",height:36,overflow:"hidden"}}>
              <span aria-hidden="true" style={{fontSize:15}}>{ui.flag}</span>
              {compactNav && <span aria-hidden="true" style={{fontSize:10,fontWeight:900,color:"#444",letterSpacing:.4}}>{language.toUpperCase()}</span>}
              <select aria-label="Langue du site" value={language} onChange={e=>chooseLanguage(e.target.value)} style={compactNav?{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0,cursor:"pointer"}:{border:"none",background:"transparent",color:"#333",fontSize:12,fontWeight:800,outline:"none",cursor:"pointer",maxWidth:94}}>
                {Object.entries(INTERFACE_LANGUAGES).map(([code,item])=><option key={code} value={code}>{item.label}</option>)}
              </select>
            </label>
            {isAdmin && (
              <button onClick={()=>setShowAdmin(true)} style={{background:"#fde8ec",color:RED,fontWeight:700,fontSize:12,padding:"8px 14px",borderRadius:12,border:"none",cursor:"pointer"}}>🔓 Admin</button>
            )}
            {user && (
              <button onClick={()=>setShowMessages(true)} style={{background:"#f3f3f3",color:"#333",fontWeight:700,fontSize:13,padding:"7px 10px",borderRadius:99,border:"none",cursor:"pointer",position:"relative"}}>
                💬
                {unreadMsgs>0 && <span style={{position:"absolute",top:-4,right:-4,background:"#ff3b30",color:WHITE,fontSize:9,fontWeight:800,width:16,height:16,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>{unreadMsgs}</span>}
              </button>
            )}
            {user && (
              <button onClick={()=>{setPage("notifications");setMobileMenu(false)}} title="Notifications" style={{background:unreadNotifications?"#eaf6ef":"#f3f3f3",color:GREEN,fontWeight:700,fontSize:14,padding:"7px 10px",borderRadius:99,border:"none",cursor:"pointer",position:"relative"}}>
                🔔
                {unreadNotifications>0 && <span style={{position:"absolute",top:-5,right:-5,background:RED,color:WHITE,fontSize:9,fontWeight:800,minWidth:16,height:16,padding:"0 3px",borderRadius:99,display:"flex",alignItems:"center",justifyContent:"center"}}>{unreadNotifications>9?"9+":unreadNotifications}</span>}
              </button>
            )}
            {user ? (
              <div onClick={()=>{setProfileInitialTab("profil");setShowProfile(true)}} style={{display:"flex",alignItems:"center",gap:6,background:"#f3f3f3",borderRadius:99,padding:"6px 10px 6px 6px",cursor:"pointer"}}>
                <div style={{width:26,height:26,borderRadius:"50%",background:WHITE,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
                  {userProfile?.avatar_url ? <img src={userProfile.avatar_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <span style={{color:RED,fontWeight:800,fontSize:12}}>{(userProfile?.username||user.email)[0].toUpperCase()}</span>}
                </div>
                {!isMobile && <span style={{color:"#333",fontSize:12,fontWeight:600}}>{userProfile?.username||user.email.split("@")[0]}</span>}
                {userProfile?.is_member && <span style={{background:GREEN,color:WHITE,fontSize:8,fontWeight:800,padding:"2px 5px",borderRadius:99}}>M</span>}
                <span style={{color:"#888",fontSize:11}}>⚙️</span>
              </div>
            ) : (
              <button onClick={()=>setShowAuth(true)} title="Connexion ou inscription" style={{background:GREEN,color:WHITE,fontWeight:800,fontSize:compactNav?12:13,padding:compactNav?"9px 11px":"9px 13px",borderRadius:99,border:"none",cursor:"pointer",whiteSpace:"nowrap"}}>👤 Connexion</button>
            )}
          </div>
        </div>

        {/* Mobile nav dropdown */}
        {compactNav && (
          <div style={{maxWidth:1120,margin:mobileMenu?"12px auto 0":"0 auto",display:"flex",flexDirection:"column",gap:4,maxHeight:mobileMenu?600:0,opacity:mobileMenu?1:0,transform:mobileMenu?'translateY(0)':'translateY(-8px)',overflow:'hidden',pointerEvents:mobileMenu?'auto':'none',transition:'max-height .3s ease, opacity .22s ease, transform .22s ease'}}>
            {navItems.map(n=>(
              <a key={n.key} href={PAGE_PATHS[n.key]||"/"} onClick={e=>{e.preventDefault();setPage(n.key);setMobileMenu(false)}} style={{background:page===n.key?"#eaf6ef":"#f5f5f5",color:page===n.key?GREEN:"#222",fontWeight:700,fontSize:14,padding:"12px 16px",borderRadius:12,border:"none",cursor:"pointer",textAlign:"left",textDecoration:"none"}}>
                {n.label}
              </a>
            ))}
            {user && <>
              <button onClick={()=>{setPage("offers");setMobileMenu(false)}} style={{background:page==="offers"?"#eaf6ef":"#f5f5f5",color:page==="offers"?GREEN:"#222",fontWeight:700,fontSize:14,padding:"12px 16px",borderRadius:12,border:"none",cursor:"pointer",textAlign:"left"}}>💳 Mes abonnements</button>
              <button onClick={()=>{setPage("notifications");setMobileMenu(false)}} style={{background:page==="notifications"?"#eaf6ef":"#f5f5f5",color:page==="notifications"?GREEN:"#222",fontWeight:700,fontSize:14,padding:"12px 16px",borderRadius:12,border:"none",cursor:"pointer",textAlign:"left"}}>🔔 Notifications</button>
            </>}
            {isAdmin && (
              <button onClick={()=>{setShowAdmin(true);setMobileMenu(false)}} style={{background:"#fde8ec",color:RED,fontWeight:700,fontSize:14,padding:"12px 16px",borderRadius:12,border:"none",cursor:"pointer",textAlign:"left"}}>🔓 Administration</button>
            )}
          </div>
        )}
      </header>

      {/* ── BANDE TRICOLORE ── */}
      <div style={{display:"flex",height:5}}>
        <div style={{flex:1,background:WHITE,borderBottom:"1px solid #ddd"}}/>
        <div style={{flex:2,background:RED}}/>
        <div style={{flex:2,background:GREEN}}/>
      </div>

      {/* ── ONBOARDING BANNER ── */}
      {false && showOnboarding && page==="home" && (
        <div style={{position:"relative",background:`linear-gradient(135deg, ${RED} 0%, #8f0e22 45%, ${GREEN} 130%)`,padding:isMobile?"26px 18px 28px":"40px 24px"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:4,display:"flex"}}>
            <div style={{flex:1,background:WHITE}}/><div style={{flex:1,background:RED}}/><div style={{flex:1,background:GREEN}}/>
          </div>
          <button onClick={dismissOnboarding} aria-label="Fermer" style={{position:"absolute",top:12,right:14,background:"rgba(255,255,255,0.18)",color:WHITE,fontWeight:800,fontSize:16,width:30,height:30,borderRadius:"50%",border:"none",cursor:"pointer"}}>×</button>
          <div style={{maxWidth:820,margin:"0 auto",textAlign:"center"}}>
            <span style={{color:"rgba(255,255,255,0.85)",fontWeight:800,fontSize:11,letterSpacing:2.5,textTransform:"uppercase"}}>🇲🇬 La communauté malagasy de France</span>
            <h2 style={{color:WHITE,fontWeight:900,fontSize:isMobile?24:36,lineHeight:1.15,margin:"10px 0 10px"}}>Tous les bons plans malagasy,<br/>au même endroit.</h2>
            <p style={{color:"rgba(255,255,255,0.9)",fontSize:isMobile?14:16,margin:"0 auto 18px",maxWidth:560,lineHeight:1.5}}>Soirées, concerts, restos, tournois, entraide… Ne rate plus jamais un événement de la diaspora. Trouve, partage, retrouve les tiens.</p>
            <div style={{display:"flex",gap:isMobile?8:12,flexWrap:"wrap",justifyContent:"center",marginBottom:22}}>
              {["📅 Events vérifiés","🇲🇬 Toute la France","📤 Partage en 1 clic","🤝 Une vraie communauté"].map(t=>(
                <span key={t} style={{background:"rgba(255,255,255,0.15)",color:WHITE,fontSize:12.5,fontWeight:600,padding:"6px 14px",borderRadius:99}}>{t}</span>
              ))}
            </div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center"}}>
              <button onClick={dismissOnboarding} style={{background:WHITE,color:RED,fontWeight:800,fontSize:15,padding:"13px 30px",borderRadius:99,border:"none",cursor:"pointer",boxShadow:"0 6px 20px rgba(0,0,0,0.2)"}}>🎉 Voir les événements</button>
              {!user && <button onClick={()=>setShowAuth(true)} style={{background:"rgba(255,255,255,0.12)",color:WHITE,fontWeight:700,fontSize:15,padding:"13px 26px",borderRadius:99,border:"1.5px solid rgba(255,255,255,0.5)",cursor:"pointer"}}>Rejoindre la communauté</button>}
            </div>
          </div>
        </div>
      )}

      {/* ── PAGES ── */}
      {page==="aftermovies" && (
        user
          ? <AfterMoviePage videos={videos} events={events} user={user} userProfile={userProfile} onAuthRequired={()=>setShowAuth(true)} onBack={()=>setPage("home")}/>
          : <LoginGate title="🎬 After-movies réservés aux membres" text="Connecte-toi pour revivre les événements en vidéo." onLogin={()=>setShowAuth(true)}/>
      )}

      {page==="gastro" && (
        <GastroPage key={directoryRoute?.slug||"gastro"} isMobile={isMobile} gastro={gastro} initialSearch={directoryRoute?.page==="gastro"?(gastro.find(x=>slugify(x.name)===directoryRoute.slug)?.name||""):""}/>
      )}

      {page==="pro" && (
        <ProPage isMobile={isMobile} user={user} onAuthRequired={()=>setShowAuth(true)}/>
      )}

      {page==="premium" && (
        <PremiumPage isMobile={isMobile} user={user} userProfile={userProfile} onAuthRequired={()=>setShowAuth(true)}/>
      )}

      {page==="offers" && (
        <OffersPage isMobile={isMobile} onPremium={()=>setPage('premium')} onPro={()=>setPage('pro')}/>
      )}

      {page==="orgas" && (
        <OrgaPage key={directoryRoute?.slug||"professionnels"} initialSearch={directoryRoute?.page==="orgas"?(orgas.find(x=>slugify(x.name)===directoryRoute.slug)?.name||""):""} isMobile={isMobile} orgas={orgas} events={events} user={user} userProfile={userProfile} isAdmin={isAdmin} onOpenEvent={ev=>setSelectedEvent(ev)} onOrgaUpdated={u=>setOrgas(list=>list.map(x=>x.id===u.id?{...x,...u}:x))} gastro={gastro} lieux={lieux} onGoto={k=>setPage(k)} onAuthRequired={()=>setShowAuth(true)}/>
      )}

      {page==="sportifs" && (
        <OrgaPage key={directoryRoute?.slug||"sportifs"} initialSearch={directoryRoute?.page==="sportifs"?(orgas.find(x=>slugify(x.name)===directoryRoute.slug)?.name||""):""} sportOnly isMobile={isMobile} orgas={orgas} events={events} user={user} userProfile={userProfile} isAdmin={isAdmin} onOpenEvent={ev=>setSelectedEvent(ev)} onOrgaUpdated={u=>setOrgas(list=>list.map(x=>x.id===u.id?{...x,...u}:x))} gastro={gastro} lieux={lieux} onGoto={k=>setPage(k)} onAuthRequired={()=>setShowAuth(true)}/>
      )}

      {page==="tournaments" && <TournamentsPage isMobile={isMobile}/>} 

      {page==="eglises" && (
        <LieuxPage key={directoryRoute?.slug||"eglises"} isMobile={isMobile} page="eglise" lieux={lieux} initialSearch={directoryRoute?.page==="eglises"?(lieux.find(x=>slugify(x.name)===directoryRoute.slug)?.name||""):""}/>
      )}

      {(page==="boutiques"||page==="artisanat") && (
        <LieuxPage key={directoryRoute?.slug||page} isMobile={isMobile} page="shopping" lieux={lieux} initialSearch={directoryRoute?.page===page?(lieux.find(x=>slugify(x.name)===directoryRoute.slug)?.name||""):""}/>
      )}

      {page==="diaspora" && (
        <DiasporaPage isMobile={isMobile} onGoto={setPage}/>
      )}

      {page==="guide" && (
        <GuidePage isMobile={isMobile}/>
      )}

      {page==="about" && (
        <AboutPage isMobile={isMobile} onGoto={setPage}/>
      )}

      {page==="contact" && (
        <ContactPage isMobile={isMobile} onPropose={()=>user?setShowSubmit(true):setShowAuth(true)} onGoto={setPage}/>
      )}

      {page==="faq" && (
        <FaqPage isMobile={isMobile} onGoto={setPage}/>
      )}

      {page==="legal" && <LegalDocumentPage kind="legal" isMobile={isMobile}/>}
      {page==="cgu" && <LegalDocumentPage kind="cgu" isMobile={isMobile}/>}
      {page==="privacy" && <LegalDocumentPage kind="privacy" isMobile={isMobile}/>}
      {page==="cookies" && <LegalDocumentPage kind="cookies" isMobile={isMobile}/>}
      {page==="moderation" && <LegalDocumentPage kind="moderation" isMobile={isMobile}/>}
      {page==="ranking" && <LegalDocumentPage kind="ranking" isMobile={isMobile}/>}
      {page==="rights" && <RightsPage isMobile={isMobile} user={user} userProfile={userProfile}/>}

      {page==="community" && (
        !user ? <LoginGate title="👥 Communauté réservée aux membres" text="Connecte-toi pour échanger, publier et rencontrer la communauté malagasy." onLogin={()=>setShowAuth(true)}/> :
        <div style={{maxWidth:900,margin:"0 auto"}}>
          <div style={{padding:isMobile?"16px 0 0":"32px 0 0",textAlign:"center",paddingBottom:0}}>
            <h2 style={{fontWeight:900,fontSize:isMobile?20:28,color:"#111",margin:"0 0 4px"}}>👥 Communauté Malagasy</h2>
            <p style={{fontSize:14,color:"#888",margin:"0 0 20px"}}>Échangez, partagez, et rencontrez d'autres membres 🇲🇬</p>
          </div>
          <CommunityFeed user={user} userProfile={userProfile} isAdmin={isAdmin} activeOrga={activeOrga} onAuthRequired={()=>setShowAuth(true)} onMessage={openMsg} onProfileClick={(id,name)=>setViewingProfile({id,name})} onOpenEvent={ev=>setSelectedEvent(ev)} events={events} orgas={orgas}/>
        </div>
      )}

      {page==="classifieds" && (
        <ClassifiedsPage user={user} userProfile={userProfile} onAuthRequired={()=>setShowAuth(true)} onMessage={openMsg} onProfileClick={(id,name)=>setViewingProfile({id,name})}/>
      )}

      {page==="notifications" && (
        <NotificationsPage user={user} activeOrga={activeOrga} onAuthRequired={()=>setShowAuth(true)} onUnreadChange={setUnreadNotifications} onOpenCommunity={()=>setPage("community")} onOpenClassifieds={()=>setPage("classifieds")} onOpenEvent={eventId=>{const event=events.find(e=>String(e.id)===String(eventId));if(event){setPage("home");setSelectedEvent(event)}}} onOpenMessages={n=>{const orgaId=n?.data?.orga_id;const orga=orgas.find(o=>String(o.id)===String(orgaId));if(orga)openMsg({type:'orga',orga});else setShowMessages(true)}}/>
      )}

      {page==="home" && (
        <>
          {/* HERO */}
          <div style={{position:"relative",minHeight:isMobile?430:470,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",padding:isMobile?"30px 16px":"44px 24px",backgroundImage:"linear-gradient(90deg,rgba(200,16,46,.66) 0%,rgba(200,16,46,.16) 42%,rgba(0,122,61,.30) 100%), url('/images/hero-communaute-malagasy.png')",backgroundSize:"cover",backgroundPosition:"center"}}>
            <div style={{position:"relative",zIndex:1,maxWidth:960,width:"100%",textAlign:"center"}}>
              <p style={{color:WHITE,fontWeight:800,fontSize:11,letterSpacing:2,textTransform:"uppercase",margin:"0 0 10px",textShadow:"0 2px 10px rgba(0,0,0,.4)"}}>🇲🇬 La communauté malagasy de France</p>
              <h2 style={{color:WHITE,fontWeight:900,fontSize:isMobile?34:54,lineHeight:1.06,letterSpacing:-1.5,margin:"0 auto 12px",maxWidth:850,textShadow:"0 3px 18px rgba(0,0,0,.45)"}}>Tous les événements malagasy,<br/>au même endroit.</h2>
              <p style={{color:WHITE,fontSize:isMobile?15:18,fontWeight:600,margin:"0 auto 24px",maxWidth:660,textShadow:"0 2px 10px rgba(0,0,0,.45)"}}>Soirées, concerts, tournois, gastronomie et rencontres partout en France.</p>
              <div style={{maxWidth:720,width:'100%',display:'flex',gap:8}}><input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&announceFilters()} placeholder="Rechercher un événement, une ville, une catégorie..." style={{flex:1,minWidth:0,padding:isMobile?"15px 18px":"18px 24px",borderRadius:16,background:"rgba(255,255,255,.96)",color:"#222",border:"2px solid rgba(255,255,255,.9)",fontSize:isMobile?14:16,outline:"none",boxSizing:"border-box",boxShadow:"0 8px 28px rgba(0,0,0,.22)"}}/><button onClick={announceFilters} style={{background:WHITE,color:RED,fontWeight:900,border:'2px solid #fff',borderRadius:16,padding:isMobile?'0 14px':'0 20px',cursor:'pointer'}}>Rechercher</button></div>
              <div aria-live="polite" style={{height:20,marginTop:6,color:WHITE,fontSize:13,fontWeight:800,textShadow:'0 1px 5px rgba(0,0,0,.45)'}}>{filterFeedback}</div>
              <div style={{display:"flex",justifyContent:"center",gap:12,marginTop:18,flexWrap:"wrap"}}>
                <button onClick={()=>document.getElementById("events-list")?.scrollIntoView({behavior:"smooth"})} style={{background:RED,color:WHITE,fontWeight:800,fontSize:15,padding:"14px 24px",borderRadius:14,border:"2px solid #fff",cursor:"pointer",boxShadow:"0 5px 18px rgba(0,0,0,.2)"}}>Voir les événements →</button>
                <button onClick={()=>user?setShowSubmit(true):setShowAuth(true)} style={{background:GREEN,color:WHITE,fontWeight:800,fontSize:15,padding:"14px 24px",borderRadius:14,border:"2px solid #fff",cursor:"pointer",boxShadow:"0 5px 18px rgba(0,0,0,.2)"}}>Proposer un événement →</button>
              </div>
              <div style={{display:"flex",justifyContent:"center",gap:isMobile?10:24,marginTop:22,flexWrap:"wrap"}}>
                {["✓ Événements vérifiés","🇫🇷 Partout en France","🤝 Une vraie communauté"].map(t=><span key={t} style={{color:WHITE,fontSize:13,fontWeight:700,textShadow:"0 2px 8px rgba(0,0,0,.5)"}}>{t}</span>)}
              </div>
            </div>
          </div>

          {/* FILTRES */}
          <div style={{maxWidth:1180,margin:"0 auto",padding:isMobile?"16px 12px 0":"24px 24px 0"}}>
            <div style={{marginBottom:12}}>
              <p style={{fontSize:11,fontWeight:700,color:"#999",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Ville</p>
              <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
                {CITIES.map(c=><FilterBtn key={c} label={c} active={cityFilter===c} onClick={()=>{setCityFilter(c);setTimeout(announceFilters,0)}}/>)}
              </div>
            </div>
            <div>
              <p style={{fontSize:11,fontWeight:700,color:"#999",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Catégorie</p>
              <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
                {userCats.length>0 && (
                  <FilterBtn label="🎯 Pour toi" active={catFilter==="PourToi"} onClick={()=>{setCatFilter("PourToi");setTimeout(announceFilters,0)}}/>
                )}
                {CATEGORIES.map(c=><FilterBtn key={c} label={c} active={catFilter===c} onClick={()=>{setCatFilter(c);setTimeout(announceFilters,0)}}/>)}
              </div>
            </div>
          </div>

          {/* ACCÈS RAPIDE AUX ANNUAIRES */}
          <div style={{maxWidth:1180,margin:"0 auto",padding:isMobile?"16px 12px 0":"24px 24px 0"}}>
            <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:4}}>
              {[["eglises","⛪","Églises","#185FA5","#eef4fc"],["gastro","🍽️","Gastronomie","#e65100","#fff3e0"],["boutiques","🛍️","Boutiques & artisanat","#7a243e","#fbeaf0"]].map(([k,emo,lab,c,bg])=>(
                <button key={k} onClick={()=>setPage(k)} style={{flexShrink:0,display:"flex",alignItems:"center",gap:8,background:bg,color:c,fontWeight:800,fontSize:13,padding:"10px 16px",borderRadius:14,border:"none",cursor:"pointer"}}>
                  <span style={{fontSize:18}}>{emo}</span> {lab} <span style={{opacity:0.6}}>→</span>
                </button>
              ))}
            </div>
          </div>

          {/* EVENTS À VENIR */}
          <div id="events-list" style={{maxWidth:1180,margin:"0 auto",padding:isMobile?"16px 12px":"24px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:16,flexWrap:"wrap"}}>
              <h2 style={{fontWeight:900,fontSize:isMobile?22:28,color:"#111",margin:0}}>✨ Les prochains rendez-vous <span style={{fontSize:14,color:"#888",fontWeight:600}}>({upcoming.length})</span></h2>
              <div style={{display:"flex",gap:4,background:"#eee",borderRadius:99,padding:3}}>
                {[["list","📋 Liste"],["calendar","📅 Calendrier"]].map(([k,l])=>(
                  <button key={k} onClick={()=>setHomeView(k)} style={{background:homeView===k?WHITE:"transparent",color:homeView===k?"#111":"#888",fontWeight:700,fontSize:12.5,padding:"6px 14px",borderRadius:99,border:"none",cursor:"pointer",boxShadow:homeView===k?"0 1px 4px rgba(0,0,0,0.1)":"none"}}>{l}</button>
                ))}
              </div>
            </div>
            {homeView==="calendar" && (
              <div style={{marginBottom:8}}>
                <CalendarView events={applyFilters(events)} isMobile={isMobile} onOpenEvent={ev=>setSelectedEvent(ev)}/>
              </div>
            )}
            {homeView==="list" && catFilter==="Gastronomie" && (
              <div onClick={()=>setPage("gastro")} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,background:"#fff3e0",border:"1.5px solid #ffd699",borderRadius:16,padding:"14px 18px",marginBottom:16,cursor:"pointer"}}>
                <div>
                  <p style={{fontWeight:800,fontSize:14,color:"#e65100",margin:"0 0 2px"}}>🍽️ Tu cherches où manger malagasy ?</p>
                  <p style={{fontSize:13,color:"#a15a1a",margin:0}}>Découvre notre annuaire : {gastro.length} restaurants, traiteurs et food trucks partout en France.</p>
                </div>
                <span style={{background:"#e65100",color:WHITE,fontWeight:700,fontSize:13,padding:"8px 16px",borderRadius:99,whiteSpace:"nowrap"}}>Voir l'annuaire →</span>
              </div>
            )}
            {homeView==="list" && catFilter==="Religion" && (
              <div onClick={()=>setPage("eglises")} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,background:"#eef4fc",border:"1.5px solid #b9d3f2",borderRadius:16,padding:"14px 18px",marginBottom:16,cursor:"pointer"}}>
                <div>
                  <p style={{fontWeight:800,fontSize:14,color:"#185FA5",margin:"0 0 2px"}}>⛪ Tu cherches une église malagasy ?</p>
                  <p style={{fontSize:13,color:"#3a6ea5",margin:0}}>Découvre notre annuaire des paroisses et communautés chrétiennes malagasy en France.</p>
                </div>
                <span style={{background:"#185FA5",color:WHITE,fontWeight:700,fontSize:13,padding:"8px 16px",borderRadius:99,whiteSpace:"nowrap"}}>Voir l'annuaire →</span>
              </div>
            )}
            {homeView==="list" && (() => {
              const featured = upcoming.filter(e=>e.featured)
              const rest = upcoming.filter(e=>!e.featured)
              if (upcoming.length===0) return (
                <div style={{textAlign:"center",padding:"48px 24px",background:WHITE,borderRadius:20,color:"#bbb"}}>
                  <p style={{fontSize:32,margin:"0 0 8px"}}>🌺</p>
                  <p style={{fontWeight:700}}>Aucun événement à venir pour ces filtres</p>
                </div>
              )
              return (<>
                {featured.length>0 && (
                  <div style={{marginBottom:24}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                      <span style={{fontSize:16}}>⭐</span>
                      <h3 style={{fontWeight:800,fontSize:16,color:"#b8860b",margin:0}}>À la une</h3>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
                      {featured.map(ev=>(
                        <div key={ev.id} style={{position:"relative",borderRadius:18,padding:3,background:"linear-gradient(135deg,#e6b31e,#b8860b)"}}>
                          <span style={{position:"absolute",top:10,left:10,zIndex:2,background:"#b8860b",color:WHITE,fontSize:10,fontWeight:800,padding:"3px 10px",borderRadius:99}}>⭐ À LA UNE</span>
                          {isAdmin && featuredRemaining(ev.featured_until) && <div style={{position:'absolute',top:38,left:10,zIndex:3,display:'flex',alignItems:'center',gap:5}}><span style={{background:'rgba(35,20,0,.84)',color:WHITE,fontSize:10,fontWeight:800,padding:'3px 9px',borderRadius:99}}>⏳ encore {featuredRemaining(ev.featured_until)}</span><button onClick={()=>extendEventFeatured(ev)} title="Ajouter 7 jours à la une" style={{background:'#fff',color:'#a57400',border:'none',borderRadius:99,fontSize:10,fontWeight:900,padding:'3px 7px',cursor:'pointer'}}>+7j</button></div>}
                          <EventCard event={ev} onSelect={setSelectedEvent} user={user} onAuthRequired={()=>setShowAuth(true)} isAdmin={isAdmin} onDelete={deleteEvent} onEdit={item=>setSelectedEvent({...item,_edit:true})}/>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {rest.length>0 && (
                  <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
                    {rest.map(ev=>(
                      <EventCard key={ev.id} event={ev} onSelect={setSelectedEvent} user={user} onAuthRequired={()=>setShowAuth(true)} isAdmin={isAdmin} onDelete={deleteEvent} onEdit={item=>setSelectedEvent({...item,_edit:true})}/>
                    ))}
                  </div>
                )}
              </>)
            })()}
          </div>

          {/* EVENTS PASSÉS */}
          {homeView==="list" && (
          <div style={{maxWidth:900,margin:"0 auto",padding:isMobile?"0 12px 32px":"0 24px 40px"}}>
            <button onClick={()=>setShowPast(p=>!p)} style={{display:"flex",alignItems:"center",gap:8,background:"none",border:"none",cursor:"pointer",padding:"8px 0",marginBottom:showPast?16:0}}>
              <h3 style={{fontWeight:700,fontSize:16,color:"#555",margin:0}}>⏪ Événements passés ({past.length})</h3>
              <span style={{color:"#aaa"}}>{showPast?"▲":"▼"}</span>
            </button>
            {showPast && past.length>0 && (
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
                {past.map(ev=>(
                  <EventCard key={ev.id} event={ev} onSelect={setSelectedEvent} user={user} onAuthRequired={()=>setShowAuth(true)} isAdmin={isAdmin} onDelete={deleteEvent} onEdit={item=>setSelectedEvent({...item,_edit:true})}/>
                ))}
              </div>
            )}
          </div>
          )}
        </>
      )}

      {page==="home" && (
        <section aria-labelledby="seo-faq-title" style={{maxWidth:900,margin:"0 auto",padding:isMobile?"8px 16px 32px":"16px 24px 44px"}}>
          <div style={{background:"#fff",border:"1px solid #eee",borderRadius:20,padding:isMobile?18:26,boxShadow:"0 8px 28px rgba(35,25,35,.06)"}}>
            <p style={{color:RED,fontWeight:800,fontSize:12,letterSpacing:1.2,textTransform:"uppercase",margin:"0 0 6px"}}>Agenda de la diaspora malgache</p>
            <h2 id="seo-faq-title" style={{fontSize:isMobile?21:25,lineHeight:1.2,color:"#26215C",margin:"0 0 12px"}}>Trouver un événement malagasy en France</h2>
            <p style={{color:"#555",fontSize:14,lineHeight:1.65,margin:"0 0 20px"}}>Malagasy Events, aussi recherché sous les noms Malagasy Event ou agenda gasy, rassemble les événements malgaches en France : soirées gasy, concerts, festivals, tournois sportifs, sorties culturelles et rencontres de la communauté.</p>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>
              {[
                ["Où trouver les événements malagasy en France ?","Sur cet agenda : soirées, concerts, festivals, sport et sorties malgaches dans toute la France."],
                ["Comment trouver une soirée gasy ?","Filtre les événements par ville pour découvrir les prochaines soirées près de chez toi."],
                ["Où manger malgache en France ?","Consulte l’annuaire des restaurants, traiteurs et food trucks malgaches."],
                ["Comment publier un événement ?","Les associations et organisateurs peuvent proposer leurs événements à la communauté."],
              ].map(([q,a])=><article key={q}><h3 style={{fontSize:14,color:"#26215C",margin:"0 0 5px"}}>{q}</h3><p style={{fontSize:13,color:"#666",lineHeight:1.5,margin:0}}>{a}</p></article>)}
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER ── */}
      {!["community","notifications","aftermovies"].includes(page) && (
        <footer style={{background:RED,padding:"20px 24px",textAlign:"center"}}>
          <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:8}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:WHITE}}/><div style={{width:8,height:8,borderRadius:"50%",background:WHITE}}/><div style={{width:8,height:8,borderRadius:"50%",background:GREEN}}/>
          </div>
          <p style={{color:WHITE,fontWeight:800,fontSize:15,margin:0}}>Malagasy Events</p>
          <p style={{color:"rgba(255,255,255,0.82)",fontSize:12,maxWidth:640,margin:"6px auto 0",lineHeight:1.55}}>L’agenda de référence pour trouver les événements malagasy en France : soirées, concerts, culture, sport, restaurants, associations et bonnes adresses de la diaspora malgache.</p>
          <div aria-label="Réseaux sociaux officiels Malagasy Events" style={{display:"flex",justifyContent:"center",gap:10,marginTop:13}}>
            <a href={OFFICIAL_SOCIALS.facebook} target="_blank" rel="me noopener noreferrer" aria-label="Malagasy Events sur Facebook" style={{display:"inline-flex",alignItems:"center",gap:7,color:WHITE,background:"rgba(255,255,255,.14)",border:"1px solid rgba(255,255,255,.38)",borderRadius:99,padding:"8px 13px",fontSize:12,fontWeight:800,textDecoration:"none"}}>📘 Facebook</a>
            <a href={OFFICIAL_SOCIALS.instagram} target="_blank" rel="me noopener noreferrer" aria-label="Malagasy Events sur Instagram" style={{display:"inline-flex",alignItems:"center",gap:7,color:WHITE,background:"rgba(255,255,255,.14)",border:"1px solid rgba(255,255,255,.38)",borderRadius:99,padding:"8px 13px",fontSize:12,fontWeight:800,textDecoration:"none"}}>📸 Instagram</a>
          </div>
          <nav aria-label="Liens utiles Malagasy Events" style={{display:"flex",justifyContent:"center",flexWrap:"wrap",gap:"8px 16px",marginTop:12}}>
            <a href="/" style={{color:WHITE,fontSize:12,fontWeight:700,textDecoration:"none"}}>Événements malagasy</a>
            <a href="/gastronomie" style={{color:WHITE,fontSize:12,fontWeight:700,textDecoration:"none"}}>Restaurants malgaches</a>
            <a href="/organisateurs" style={{color:WHITE,fontSize:12,fontWeight:700,textDecoration:"none"}}>Associations & organisateurs</a>
            <a href="/boutiques" style={{color:WHITE,fontSize:12,fontWeight:700,textDecoration:"none"}}>Boutiques malgaches</a>
            <a href="/diaspora-malgache-france" style={{color:WHITE,fontSize:12,fontWeight:700,textDecoration:"none"}}>Diaspora malagasy</a>
            <a href="/guide-france" style={{color:WHITE,fontSize:12,fontWeight:700,textDecoration:"none"}}>Guide France</a>
            <a href="/a-propos" style={{color:WHITE,fontSize:12,fontWeight:700,textDecoration:"none"}}>À propos</a>
            <a href="/faq" style={{color:WHITE,fontSize:12,fontWeight:700,textDecoration:"none"}}>FAQ</a>
            <a href="/contact" style={{color:WHITE,fontSize:12,fontWeight:700,textDecoration:"none"}}>Contact</a>
            <a href="/eglises" style={{color:WHITE,fontSize:12,fontWeight:700,textDecoration:"none"}}>Églises</a>
          </nav>
          <nav aria-label="Informations légales" style={{display:"flex",justifyContent:"center",flexWrap:"wrap",gap:"8px 14px",marginTop:14,paddingTop:12,borderTop:"1px solid rgba(255,255,255,.25)"}}>
            {[["/mentions-legales","Mentions légales"],["/cgu","CGU"],["/confidentialite","Confidentialité"],["/cookies","Cookies"],["/moderation","Modération"],["/referencement","Référencement"]].map(([href,label])=><a key={href} href={href} style={{color:WHITE,fontSize:11,fontWeight:700,textDecoration:"underline",textUnderlineOffset:3}}>{label}</a>)}
            <a href={`mailto:${LEGAL_CONTACT}?subject=${encodeURIComponent("Exercice de mes droits — Malagasy Events")}`} style={{color:WHITE,fontSize:11,fontWeight:700,textDecoration:"underline",textUnderlineOffset:3}}>Exercer mes droits : envoyer un e-mail</a>
          </nav>
          <p style={{color:"rgba(255,255,255,.72)",fontSize:10.5,margin:"12px auto 0"}}>Plateforme indépendante · Une fiche ne constitue pas un partenariat · Contact : {LEGAL_CONTACT}</p>
        </footer>
      )}

      {/* ── MODALS ── */}
      {selectedEvent && (
        <EventDetail
          event={selectedEvent}
          onClose={()=>setSelectedEvent(null)}
          user={user}
          onAuthRequired={()=>setShowAuth(true)}
          isAdmin={isAdmin}
          onProfileClick={(id,name)=>setViewingProfile({id,name})}
          organizerProfile={resolveEventOrganizer(selectedEvent,orgas)}
          onOrganizerClick={()=>{
            const organizer = resolveEventOrganizer(selectedEvent,orgas)
            if (!organizer) return
            setSelectedEvent(null)
            setSelectedOrganizer(organizer)
          }}
          onUpdated={updated=>{setEvents(list=>list.map(x=>x.id===updated.id?updated:x));setSelectedEvent(updated)}}
        />
      )}

      {selectedOrganizer && (
        <OrgaDetail
          o={selectedOrganizer}
          isMobile={isMobile}
          user={user}
          userProfile={userProfile}
          isAdmin={isAdmin}
          events={events}
          onOpenEvent={event=>{setSelectedOrganizer(null);setSelectedEvent(event)}}
          onClose={()=>setSelectedOrganizer(null)}
          onUpdated={updated=>{
            setOrgas(list=>list.map(orga=>orga.id===updated.id?{...orga,...updated}:orga))
            setSelectedOrganizer(updated)
          }}
          onAuthRequired={()=>setShowAuth(true)}
        />
      )}

      {showAuth && <AuthModal onClose={()=>setShowAuth(false)} onSuccess={async(isNew)=>{
        // Attendre que fetchProfile soit appelé via onAuthStateChange, puis décider
        if (isNew) setShowInterestOnboarding(true)
        else setShowLoginIntent(true)
      }}/>}

      {showInterestOnboarding && user && (
        <InterestOnboarding
          user={user}
          userProfile={userProfile}
          onSave={cats => { setUserProfile(p=>({...p,categories:cats})); setShowInterestOnboarding(false) }}
          onSkip={() => setShowInterestOnboarding(false)}
        />
      )}

      {showLoginIntent && user && !showInterestOnboarding && (
        <LoginIntentModal
          userProfile={userProfile}
          onSelect={cats => {
            // Applique le filtre pour cette session uniquement (pas sauvegardé en DB)
            setSessionCats(cats)
            if (cats.length===1) setCatFilter(cats[0])
            else setCatFilter("PourToi")
            setShowLoginIntent(false)
          }}
          onSkip={() => setShowLoginIntent(false)}
        />
      )}

      {showAdmin && <AdminPanel events={events} setEvents={setEvents} videos={videos} setVideos={setVideos} gastro={gastro} setGastro={setGastro} orgas={orgas} setOrgas={setOrgas} lieux={lieux} setLieux={setLieux} onClose={()=>setShowAdmin(false)}/>}

      {showSubmit && <SubmitEventModal user={user} userProfile={userProfile} events={events} orgas={orgas} onEventPublished={ev=>setEvents(list=>[...list,ev])} onOrganizerSynced={sync=>{
        setOrgas(list=>list.some(o=>String(o.id)===String(sync.organizer.id))?list.map(o=>String(o.id)===String(sync.organizer.id)?sync.organizer:o):[...list,sync.organizer])
        setEvents(list=>linkEventsToOrganizer(list,sync.organizer.name,sync.organizer.id))
      }} onClose={()=>setShowSubmit(false)}/>}

      {showResetPw && <ResetPasswordModal onClose={()=>setShowResetPw(false)}/>}

      {/* Bouton flottant : proposer un événement */}
      {(page==="home"||page==="community") && !showAdmin && (
        <button onClick={()=>user?setShowSubmit(true):setShowAuth(true)} title="Proposer un événement" style={{position:"fixed",right:isMobile?16:24,bottom:isMobile?16:24,zIndex:55,background:RED,color:WHITE,fontWeight:800,fontSize:14,padding:isMobile?"14px 16px":"14px 22px",borderRadius:99,border:"none",cursor:"pointer",boxShadow:"0 6px 20px rgba(200,16,46,0.4)"}}>➕ {isMobile?"":"Proposer un event"}</button>
      )}

      {viewingProfile && <UserProfileModal profileId={viewingProfile.id} currentUser={user} onAuthRequired={()=>setShowAuth(true)} onClose={()=>setViewingProfile(null)} onMessage={openMsg}/>}

      {showProfile && user && (
        <ProfileModal key={profileInitialTab} initialTab={profileInitialTab} user={user} userProfile={userProfile} onClose={()=>setShowProfile(false)} onSignOut={handleSignOut} onUpdate={up=>setUserProfile(up)} orgas={orgas} events={events} activeOrga={activeOrga} onSwitchIdentity={switchIdentity} onUpdateOrga={updated=>setOrgas(list=>list.map(o=>o.id===updated.id?{...o,...updated}:o))} onGoPro={()=>setPage('pro')} onGoPremium={()=>setPage('premium')}/>
      )}

      {user && userProfile?.plan==="organisateur" && !orgas.some(o=>o.owner_id===user.id) && !localStorage.getItem('orga_onboard_'+user.id) && (
        <OrgaOnboarding user={user} orgas={orgas} setOrgas={setOrgas} onClose={()=>setUserProfile(p=>({...p}))}/>
      )}

      {showMessages && user && activeOrga && (
        <OrgaMessagesModal user={user} orga={activeOrga} onClose={()=>{setShowMessages(false);fetchUnread()}}/>
      )}
      {showMessages && user && !activeOrga && msgTarget.type==='orga' && msgTarget.orga && (
        <ContactOrgaModal user={user} orga={msgTarget.orga} onClose={()=>{setShowMessages(false);fetchUnread()}}/>
      )}
      {showMessages && user && !activeOrga && msgTarget.type!=='orga' && (
        <MessagesModal user={user} userProfile={userProfile} onClose={()=>{setShowMessages(false);fetchUnread()}} initialRecipientId={msgTarget.id} initialRecipientName={msgTarget.name} onProfileClick={(id,name)=>setViewingProfile({id,name})}/>
      )}

      {/* Admin login */}
      {showLogin && (
        <div onClick={e=>e.target===e.currentTarget&&setShowLogin(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:16}}>
          <div style={{background:WHITE,borderRadius:20,width:"100%",maxWidth:360,padding:32,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{textAlign:"center",marginBottom:16}}><p style={{fontSize:32,margin:"0 0 8px"}}>🔐</p><h2 style={{fontWeight:800,fontSize:18,color:"#111",margin:0}}>Accès administrateur</h2></div>
            <p style={{fontSize:13,color:"#666",textAlign:"center",lineHeight:1.6,margin:"0 0 16px"}}>L'administration est réservée au compte officiel du site. Connecte-toi avec le compte administrateur pour y accéder.</p>
            <button type="button" onClick={()=>setShowLogin(false)} style={{width:"100%",background:RED,color:WHITE,fontWeight:700,fontSize:14,padding:"12px 0",borderRadius:12,border:"none",cursor:"pointer"}}>OK</button>
          </div>
        </div>
      )}

      {/* Admin add event form */}
      {showForm && (
        <div onClick={e=>e.target===e.currentTarget&&setShowForm(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:16}}>
          <div style={{background:WHITE,borderRadius:20,width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{display:"flex",height:5}}><div style={{flex:1,background:"#eee"}}/><div style={{flex:2,background:RED}}/><div style={{flex:2,background:GREEN}}/></div>
            <div style={{padding:"20px 24px",borderBottom:"1px solid #f0f0f0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <h2 style={{fontWeight:800,fontSize:18,color:"#111",margin:0}}>Ajouter un événement</h2>
              <button onClick={()=>setShowForm(false)} style={{background:"none",border:"none",fontSize:22,color:"#999",cursor:"pointer"}}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={{padding:24,display:"flex",flexDirection:"column",gap:16}}>
              <div><label style={lbl}>Nom *</label><input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Soirée Malagasy Paris" style={inp}/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div><label style={lbl}>Date *</label><input required type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={inp}/></div>
                <div><label style={lbl}>Prix</label><input value={form.price} onChange={e=>setForm({...form,price:e.target.value})} placeholder="15€ ou Gratuit" style={inp}/></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div><label style={lbl}>Lieu *</label><input required value={form.location} onChange={e=>setForm({...form,location:e.target.value})} placeholder="Paris 11ème" style={inp}/></div>
                <div><label style={lbl}>Ville *</label><select value={form.city} onChange={e=>setForm({...form,city:e.target.value})} style={inp}>{CITIES.filter(c=>c!=="Toutes").map(c=><option key={c}>{c}</option>)}</select></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div><label style={lbl}>Catégorie</label><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={inp}>{CATEGORIES.filter(c=>c!=="Toutes").map(c=><option key={c}>{c}</option>)}</select></div>
                <div><label style={lbl}>Organisateur</label><input value={form.organizer} onChange={e=>setForm({...form,organizer:e.target.value})} placeholder="Asso, DJ..." style={inp}/></div>
              </div>
              <div><label style={lbl}>Description</label><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Décris l'événement..." rows={3} style={{...inp,resize:"vertical",fontFamily:"system-ui,sans-serif"}}/></div>
              <div style={{background:"#fff8e8",border:"1px solid #eed89c",borderRadius:10,padding:"10px 12px",fontSize:12,color:"#6b5419"}}>🛡️ L’ajout d’affiches est désactivé jusqu’à validation des droits.</div>
              <div><label style={lbl}>Lien billetterie</label><input type="url" value={form.ticketUrl} onChange={e=>setForm({...form,ticketUrl:e.target.value})} placeholder="https://helloasso.com/..." style={inp}/></div>
              <div><label style={lbl}>Annonce officielle</label><input type="url" value={form.official_source_url||''} onChange={e=>setForm({...form,official_source_url:e.target.value})} placeholder="Publication Facebook, Instagram ou site officiel" style={inp}/></div>
              <div><label style={lbl}>Page à suivre</label><input type="url" value={form.updates_url||''} onChange={e=>setForm({...form,updates_url:e.target.value})} placeholder="Page officielle pour les actualités" style={inp}/></div>
              <div>
                <label style={lbl}>📸 Photos & vidéos</label>
                <div style={{display:"flex",gap:8}}>
                  <input value={mediaInput} onChange={e=>setMediaInput(e.target.value)} placeholder="https://... (image ou YouTube)" style={{...inp,marginBottom:0}}/>
                  <button type="button" onClick={addMedia} style={{background:RED,color:WHITE,fontWeight:700,padding:"9px 14px",borderRadius:12,border:"none",cursor:"pointer",flexShrink:0}}>+</button>
                </div>
                {form.mediaUrls?.map((url,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginTop:6}}>
                    <span style={{flex:1,fontSize:11,color:"#666",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{url}</span>
                    <button type="button" onClick={()=>removeMedia(i)} style={{background:"#fde8ec",color:RED,border:"none",borderRadius:8,padding:"3px 8px",cursor:"pointer",fontSize:12}}>×</button>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",gap:10}}>
                <button type="button" onClick={()=>setShowForm(false)} style={{flex:1,background:"#f0f0f0",color:"#555",fontWeight:700,fontSize:14,padding:"11px 0",borderRadius:12,border:"none",cursor:"pointer"}}>Annuler</button>
                <button type="submit" style={{flex:2,background:RED,color:WHITE,fontWeight:700,fontSize:14,padding:"11px 0",borderRadius:12,border:"none",cursor:"pointer"}}>Publier l'événement</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
