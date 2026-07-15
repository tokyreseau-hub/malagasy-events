import { useState, useEffect, useRef } from "react"
import { supabase } from './supabase'

const RED = "#C8102E", GREEN = "#007A3D", WHITE = "#FFFFFF"
const ADMIN_USERNAME = "Malagasy_events_admin" // l'accès admin = être connecté avec ce compte (vérifié aussi côté serveur par RLS)
const OFFICIAL_USERNAME = "Malagasy_events_admin"
const isOfficial = u => u === OFFICIAL_USERNAME
// Packs membres : avantages et badges
const PLAN_BADGE = {
  organisateur:{emoji:"🎪",label:"Organisateur",bg:"#fde8ec",color:"#C8102E"},
  pro:{emoji:"⭐",label:"Pro",bg:"linear-gradient(135deg,#b8860b,#e6b31e)",color:"#fff"},
}
const PlanBadge = ({ plan, size=9 }) => {
  const b = PLAN_BADGE[plan]; if (!b) return null
  return <span style={{background:b.bg,color:b.color,fontSize:size,fontWeight:800,padding:"2px 6px",borderRadius:99,whiteSpace:"nowrap"}}>{b.emoji} {b.label}</span>
}
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
const SITE_URL = "https://malagasy-events.vercel.app"
// Sécurité : n'autorise que http(s) et mailto/tel — bloque javascript:, data:, etc.
// (protège contre un lien piégé mis par un organisateur/établissement dans sa fiche)
const safeUrl = u => {
  if (!u) return ""
  const s = String(u).trim()
  if (/^(https?:|mailto:|tel:)/i.test(s)) return s
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return "" // schéma non autorisé → neutralisé
  return "https://" + s // sans schéma → on force https
}
const slugify = t => String(t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")
const PAGE_PATHS = {home:"/", aftermovies:"/after-movies", gastro:"/gastronomie", orgas:"/organisateurs", pro:"/pro", eglises:"/eglises", boutiques:"/boutiques", artisanat:"/artisanat", community:"/communaute"}
const PAGE_META = {
  home:       ["Malagasy Events — Tous les événements malagasy en France","Soirées, concerts, tournois sportifs et culture malgache : l'agenda de la communauté malagasy en France. Paris, Lyon, Marseille, Toulouse et plus."],
  aftermovies:["After-movies & vidéos — Malagasy Events","Revivez les événements malagasy de France en vidéo : after-movies, teasers et portraits de la communauté."],
  gastro:     ["Restaurants & traiteurs malgaches en France — Malagasy Events","L'annuaire de la gastronomie malagasy en France : restaurants, traiteurs et food trucks, avec carte, adresses et contacts."],
  orgas:      ["Organisateurs & associations malagasy en France — Malagasy Events","Annuaire des associations sportives et culturelles, organisateurs de soirées, médias et groupes de la communauté malagasy en France."],
  eglises:    ["Églises malagasy en France — Malagasy Events","Annuaire des paroisses et communautés chrétiennes malagasy en France : FJKM, FLM, FPMA, catholiques. Paris, Meaux, Rennes, Orléans et plus."],
  boutiques:  ["Boutiques & épiceries malgaches en France — Malagasy Events","Où acheter des produits de Madagascar en France : épiceries, boutiques en ligne, vanille, épices et spécialités malgaches."],
  artisanat:  ["Artisanat malgache en France — Malagasy Events","Créateurs et boutiques d'artisanat malgache en France : raphia, vannerie, bijoux et objets faits main de Madagascar."],
  pro:        ["Offres Pro pour organisateurs & commerces malagasy — Malagasy Events","Boostez vos événements malagasy : mise en avant, rappels aux intéressés, calendrier intégrable et fiches premium pour restaurants et boutiques."],
  community:  ["Communauté & entraide — Malagasy Events","Covoiturage et hébergement pour les événements malagasy, discussions et membres de la communauté malagasy de France."],
}
const setMeta = (title, desc) => {
  document.title = title
  const ensure = (sel, create) => { let el = document.querySelector(sel); if (!el) { el = create(); document.head.appendChild(el) } return el }
  ensure('meta[name="description"]', ()=>{ const m=document.createElement("meta"); m.name="description"; return m }).content = desc
  const og = document.querySelector('meta[property="og:title"]'); if (og) og.content = title
  const ogd = document.querySelector('meta[property="og:description"]'); if (ogd) ogd.content = desc
  const ogu = document.querySelector('meta[property="og:url"]'); if (ogu) ogu.content = SITE_URL + window.location.pathname
  ensure('link[rel="canonical"]', ()=>{ const l=document.createElement("link"); l.rel="canonical"; return l }).href = SITE_URL + window.location.pathname
}
const setJsonLd = (id, data) => {
  let el = document.getElementById(id)
  if (!data) { if (el) el.remove(); return }
  if (!el) { el = document.createElement("script"); el.type = "application/ld+json"; el.id = id; document.head.appendChild(el) }
  el.textContent = JSON.stringify(data)
}
const eventJsonLd = e => ({
  "@type":"Event", name:e.title, startDate:e.date,
  eventAttendanceMode:"https://schema.org/OfflineEventAttendanceMode",
  eventStatus:"https://schema.org/EventScheduled",
  location:{"@type":"Place", name:e.location||e.city, address:{"@type":"PostalAddress", addressLocality:e.city, addressCountry:"FR"}},
  ...(e.image?{image:[e.image.startsWith("http")?e.image:SITE_URL+e.image]}:{}),
  description:e.description||e.title,
  organizer:{"@type":"Organization", name:e.organizer||"Malagasy Events"},
  ...(e.ticketUrl?{offers:{"@type":"Offer", url:e.ticketUrl, availability:"https://schema.org/InStock"}}:{}),
  url: SITE_URL + "/evenement/" + slugify(e.title),
})

const adminSave = async promise => {
  const {data,error} = await promise
  if (error) { alert("⚠️ Changement local seulement — non sauvegardé en base (" + error.message + ").\nConnecte-toi avec le compte officiel Malagasy_events_admin pour que ce soit permanent."); return null }
  return data
}

const AVATARS = [
  "https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Lova&backgroundColor=b6e3f4&backgroundType=solid",
  "https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Tiana&backgroundColor=c0aede&backgroundType=solid",
  "https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Niry&backgroundColor=d1f9c0&backgroundType=solid",
  "https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Hery&backgroundColor=ffd5dc&backgroundType=solid",
  "https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Vola&backgroundColor=ffdfbf&backgroundType=solid",
]

const todayD = new Date(); todayD.setHours(0,0,0,0)
const isPast = d => new Date(d) < todayD

const countdown = dateStr => {
  const diff = Math.ceil((new Date(dateStr) - todayD) / 86400000)
  if (diff <= 0) return null
  if (diff === 1) return { text:"Demain 🔥", hot:true }
  if (diff <= 3)  return { text:`J-${diff} 🔥`, hot:true }
  if (diff <= 7)  return { text:`J-${diff} ⚡`, hot:false }
  if (diff <= 30) return { text:`J-${diff}`, hot:false }
  return null
}

const isNew = c => c && Date.now() - new Date(c) < 14*86400000
const fmtDate = d => new Date(d).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
const fmtShort = d => new Date(d).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})
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
  const url  = `https://malagasy-events.vercel.app/#event-${ev.id}`
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

const EMPTY_FORM = {title:'',date:'',location:'',city:'Paris',category:'Soirée',price:'',organizer:'',ticketUrl:'',image:'',description:'',mediaUrls:[],createdAt:new Date().toISOString()}

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
  {id:10,title:"Hajazz en cabaret",date:"2026-08-13",location:"La Grande Rouge, La Chapelle-Naude (71)",city:"La Chapelle-Naude",category:"Soirée",image:"https://madatsara.com/uploads/medias/image-6a4fe73f740d4.jpg",price:"8€ / gratuit -12 ans",organizer:"La Grande Rouge",ticketUrl:"https://www.helloasso.com/associations/association-la-petite-mandarine/evenements/hajazz-13-aout-grange-rouge",description:"Hajazz en solo à La Grande Rouge (Saône-et-Loire). Buvette/restauration dès 18h, concert 20h, jam session 21h–minuit avec les amis musiciens.",mediaUrls:[],createdAt:new Date().toISOString()},
  {id:11,title:"Shao Boana en showcase",date:"2026-08-15",location:"La Lagune, base de loisirs, Jonzac (17)",city:"Jonzac",category:"Soirée",image:"https://madatsara.com/uploads/medias/Shao-Boana-Showcase-La-Lagune-base-de-loisirs-Jonzac-69bab805a4d96.jpg",price:"",organizer:"La Lagune",ticketUrl:"https://madatsara.com/evenement_shao-boana-showcase-la-lagune-base-de-loisirs-jonzac.html",description:"Shao Boana « Madagascar Vibes » en sound system à La Lagune de Jonzac (17). Roots reggae & dancehall riddims, dès 20h30.",mediaUrls:[],createdAt:new Date().toISOString()},
  {id:12,title:"Feo Gasy en concert",date:"2026-09-04",location:"Maison pour tous Melina Mercouri, Montpellier",city:"Montpellier",category:"Culture",image:"https://madatsara.com/uploads/medias/image-6a4d5ab6d0a00.jpg",price:"30€",organizer:"Maison pour tous Melina Mercouri",ticketUrl:"https://madatsara.com/evenement_feo-gasy-en-concert-maison-pour-tous-melina-mercouri-montpellier.html",description:"Le groupe Feo Gasy en concert « Any indray andro… » à la Maison pour tous Melina Mercouri (64 route de Lavérune, Montpellier), vendredi 4 septembre à 20h30.",mediaUrls:[],createdAt:new Date().toISOString()},
  {id:13,title:"Rija Ramanantoanina en concert",date:"2026-10-17",location:"Espace Magnan, Nice",city:"Nice",category:"Culture",image:"https://madatsara.com/uploads/medias/image-6a52334735617.jpg",price:"20€ / 30€",organizer:"Espace Magnan",ticketUrl:"https://madatsara.com/evenement_rija-ramanantoanina-concert-espace-magnan-nice.html",description:"Rija Ramanantoanina en concert à l'Espace Magnan de Nice — musique malgache & jazz, nouvel album « FY ». 19h30, restauration malgache dès 18h30.",mediaUrls:[],createdAt:new Date().toISOString()},
  {id:14,title:"Soirée d'intégration GS Lille 2026-2027",date:"2026-10-17",location:"Lille",city:"Lille",category:"Soirée",image:"",price:"",organizer:"Gasy Sport Lille",ticketUrl:"https://www.facebook.com/gslille",description:"📌 Date estimée — à confirmer par l'organisateur. La soirée de rentrée de l'association sportive et culturelle malgache de Lille, chaque mi-octobre (éditions 2023 et 2024 confirmées).",mediaUrls:[],createdAt:new Date().toISOString()},
  {id:15,title:"Tournoi de la Solidarité — CSM",date:"2026-10-31",location:"Centre sportif Saint-Exupéry, Villebon-sur-Yvette (91)",city:"Paris",category:"Sport",image:"",price:"",organizer:"Collectif Sport Malagasy",ticketUrl:"https://www.facebook.com/profile.php?id=100064795630232",description:"📌 Date estimée — à confirmer par l'organisateur. Le grand tournoi foot & basket de la diaspora, chaque week-end de la Toussaint à Villebon-sur-Yvette (éditions 2024 et 2025 au même endroit).",mediaUrls:[],createdAt:new Date().toISOString()},
  {id:16,title:"Tournoi de Noël — Ligue Clichy Madagascar",date:"2026-11-28",location:"Clichy / Paris",city:"Paris",category:"Sport",image:"",price:"",organizer:"Ligue Clichy Madagascar",ticketUrl:"https://www.facebook.com/profile.php?id=100063642368550",description:"📌 Date estimée — à confirmer par l'organisateur. Le tournoi de basket de fin d'année de la ligue malgache de Clichy (édition 2025 : 29 nov et 28 déc).",mediaUrls:[],createdAt:new Date().toISOString()},
  {id:17,title:"Madadiaspora Foot — RNS",date:"2026-12-19",location:"Stade Robinson, Corbeil-Essonnes (91)",city:"Paris",category:"Sport",image:"",price:"",organizer:"RNS - CEN",ticketUrl:"https://www.facebook.com/rns.cen",description:"📌 Date estimée — à confirmer par l'organisateur. Le tournoi de foot d'hiver de la RNS au stade Robinson de Corbeil-Essonnes (édition 2025 : 20 déc).",mediaUrls:[],createdAt:new Date().toISOString()},
]

const initialVideos = [
  {id:1,type:"aftermovie",title:"After-movie — Repas Communautaire Lyon 2025",youtubeUrl:"https://www.youtube.com/embed/dQw4w9WgXcQ",thumbnail:"https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400",eventName:"Repas Communautaire Malagasy",eventId:3,date:"2025-03-10",city:"Lyon",description:"Revivez la magie du repas communautaire de Lyon.",isTeaser:false,views:1240},
  {id:2,type:"aftermovie",title:"Teaser — Soirée Malagasy Paris",youtubeUrl:"https://www.youtube.com/embed/dQw4w9WgXcQ",thumbnail:"https://images.unsplash.com/photo-1533317480453-7a4b6ad0a174?w=400",eventName:"Soirée Malagasy Paris",eventId:1,date:"2026-07-12",city:"Paris",description:"Le teaser de la soirée la plus attendue de l'été !",isTeaser:true,views:856},
  {id:3,type:"communaute",title:"La communauté malagasy de Lyon se présente",youtubeUrl:"https://www.youtube.com/embed/dQw4w9WgXcQ",thumbnail:"https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400",eventName:"",eventId:null,date:"2025-06-01",city:"Lyon",description:"Portrait de notre communauté.",isTeaser:false,views:432},
]

const initialGastro = [
  {id:1,name:"Ikala Kara",type:"Restaurant",region:"Provence-Alpes-Côte d'Azur",note:"Restaurant malgache & karaoké, quartier La Plaine",fb:"https://www.facebook.com/Ikalakara",insta:"",contact:"",city:"Marseille",address:"La Plaine, Marseille",phone:"",lat:43.2938,lng:5.3828},
  {id:2,name:"O'Bol d'Or",type:"Restaurant",region:"",note:"Restaurant — spécialités asiatiques & malgaches",fb:"https://www.facebook.com/profile.php?id=61558005182008",insta:"",contact:"",city:"",address:"",phone:"",lat:null,lng:null},
  {id:3,name:"Le Tana",type:"Restaurant",region:"Provence-Alpes-Côte d'Azur",note:"Cuisine malgache & océan Indien — ouvert du mardi au samedi",fb:"https://www.facebook.com/restaurantletana",insta:"",contact:"",city:"Le Tholonet (13)",address:"283 avenue Paul Roubaud, Palette, 13100 Le Tholonet",phone:"",lat:43.5124,lng:5.4880},
  {id:4,name:"Chez Maman Mada",type:"Restaurant",region:"",note:"",fb:"",insta:"https://www.instagram.com/chezmaman_mada",tiktok:"https://www.tiktok.com/@chezmamantt",contact:"Zo Rav. (propriétaire)",city:"",lat:null,lng:null},
  {id:5,name:"La Gourmandise Malgache",type:"Traiteur",region:"",note:"",fb:"https://www.facebook.com/profile.php?id=100076189512327",insta:"",contact:"",city:"",lat:null,lng:null},
  {id:6,name:"Pili Pili Malgache Food",type:"Traiteur",region:"",note:"Recettes traditionnelles de Madagascar pour vos événements",fb:"https://www.facebook.com/pilipilimalgachefood",insta:"",contact:"",city:"",lat:null,lng:null},
  {id:7,name:"Chez Daben",type:"Traiteur",region:"",note:"Traiteur malgache",fb:"https://www.facebook.com/profile.php?id=100067003274574",insta:"",contact:"",city:"",lat:null,lng:null},
  {id:8,name:"Traiteur Franco-Malagasy Paris",type:"Traiteur",region:"Île-de-France",note:"Mariages & événements",fb:"https://www.facebook.com/wenddingtraiteurmalagasy",insta:"",contact:"",city:"Paris",address:"",phone:"+33 6 35 97 42 34",lat:48.8566,lng:2.3522},
  {id:9,name:"Chez Tiana",type:"Traiteur",region:"",note:"Ravitoto & mofo gasy faits maison, salé et sucré",fb:"https://www.facebook.com/Cheztiana",insta:"",contact:"",city:"",lat:null,lng:null},
  {id:10,name:"Naffees Traiteur",type:"Traiteur",region:"",note:"Spécialités indo-pakistanaises & malgaches, halal",fb:"https://www.facebook.com/traiteurevenementielnaffees",insta:"",contact:"",city:"",lat:null,lng:null},
  {id:11,name:"Nini + Vous",type:"Traiteur",region:"Nouvelle-Aquitaine",note:"Chef à domicile, traiteur, livraison — cuisine franco-malgache",fb:"https://www.facebook.com/profile.php?id=100086724786890",insta:"",contact:"",city:"Bordeaux",address:"Bordeaux et sa région",phone:"",lat:44.8378,lng:-0.5792},
  {id:12,name:"La Cuisine de Gabriel",type:"Traiteur",region:"",note:"",fb:"https://www.facebook.com/lacuisinedegabriel",insta:"",contact:"",city:"",lat:null,lng:null},
  {id:13,name:"Malak Traiteur",type:"Traiteur",region:"",note:"",fb:"https://www.facebook.com/profile.php?id=100064014279221",insta:"",contact:"",city:"",lat:null,lng:null},
  {id:14,name:"Au Soleil de Madagascar",type:"Food truck",region:"",note:"Food truck & traiteur",fb:"https://www.facebook.com/AuSoleildeMadagascar",insta:"",contact:"",city:"",lat:null,lng:null},
  {id:15,name:"Harena Sisters",type:"Traiteur",region:"",note:"",fb:"https://www.facebook.com/HarenaSistersTraiteur",insta:"",contact:"",city:"",lat:null,lng:null},
  {id:16,name:"Cuisine Malgache et d'ailleurs",type:"Traiteur",region:"",note:"Communauté de recettes malgaches et du monde",fb:"https://www.facebook.com/EvitraAkohoFaMahaOmby",insta:"",contact:"",city:"",lat:null,lng:null},
  {id:17,name:"Le Rendez-vous Franco-Malgache",type:"Restaurant",region:"Provence-Alpes-Côte d'Azur",note:"Cuisine traditionnelle franco-malgache, produits frais",fb:"https://www.facebook.com/profile.php?id=100092651710205",insta:"",contact:"",city:"L'Isle-sur-la-Sorgue (84)",address:"L'Isle-sur-la-Sorgue, Vaucluse",phone:"+33 7 88 95 46 67",lat:43.9195,lng:5.0512},
  {id:18,name:"Sakafo Street",type:"Food truck",region:"",note:"",fb:"",insta:"https://www.instagram.com/sakafostreet",contact:"Tojo A. (gérant)",city:"",lat:null,lng:null},
]

const initialOrgas = [
  {id:1,name:"RNS — Rencontre Nationale Sportive",type:"Association sportive",city:"National (Vichy)",region:"",followers:"84 000",note:"Le plus grand événement sportif et culturel de la diaspora malagasy, depuis 1975. Organise la RNS de Pâques à Vichy et le Madadiaspora Foot en décembre.",fb:"https://www.facebook.com/rns.cen",insta:"",site:"https://www.rns-cen.com",contact:""},
  {id:2,name:"Collectif Sport Malagasy — CSM",type:"Association sportive",city:"National",region:"",followers:"14 000",note:"Organise le Tournoi de la Solidarité (foot & basket) chaque week-end de la Toussaint à Villebon-sur-Yvette, et un tournoi de printemps.",fb:"https://www.facebook.com/profile.php?id=100064795630232",insta:"",site:"",contact:""},
  {id:3,name:"ASM Paris",type:"Association sportive",city:"Paris",region:"Île-de-France",followers:"7 100",note:"Association Sportive Malgache historique, depuis 1986. Tournoi de l'amitié.",fb:"https://www.facebook.com/profile.php?id=100064645391225",insta:"",site:"",contact:""},
  {id:4,name:"Ligue Clichy Madagascar",type:"Association sportive",city:"Clichy",region:"Île-de-France",followers:"3 800",note:"Ligue basket de la communauté malgache. Tournoi de Noël chaque fin d'année.",fb:"https://www.facebook.com/profile.php?id=100063642368550",insta:"",site:"",contact:""},
  {id:5,name:"Gasy Sport Lille",type:"Association sportive",city:"Lille",region:"Hauts-de-France",followers:"2 100",note:"Association sportive et culturelle malgache du Nord. Soirée d'intégration chaque octobre, garden party l'été.",fb:"https://www.facebook.com/gslille",insta:"",site:"",contact:""},
  {id:6,name:"SPORTIL",type:"Association sportive",city:"Paris",region:"Île-de-France",followers:"655",note:"Journée sportive annuelle organisée par les scouts (tily) de la FPMA Paris, traditionnellement le 8 mai.",fb:"https://www.facebook.com/SportilParis1",insta:"",site:"",contact:""},
  {id:7,name:"Gas'Paname Sport",type:"Association sportive",city:"Paris",region:"Île-de-France",followers:"1 200",note:"Communauté sportive malagasy de Paris : Gaspaname Game, basket inter-lycées de Tana alumni.",fb:"https://www.facebook.com/genialis.mg",insta:"",site:"",contact:""},
  {id:8,name:"Solidarité France Diégo — ASFD",type:"Association",city:"Marseille",region:"Provence-Alpes-Côte d'Azur",followers:"7 000",note:"Promotion de la culture malgache, projets culturels et humanitaires. Prépare le Maoulida de la diaspora du Sud de la France.",fb:"https://www.facebook.com/assosfd",insta:"",site:"",contact:"06 95 85 30 88 · solidaritefrancediego@gmail.com"},
  {id:9,name:"Club Mad'",type:"Association",city:"Lyon",region:"Auvergne-Rhône-Alpes",followers:"814",note:"Association franco-malgache socio-éducative, culturelle et solidaire, reconnue d'utilité publique. Chorale Kalomad. MJC Laennec Mermoz, Lyon 8e.",fb:"https://www.facebook.com/profile.php?id=100064524732458",insta:"",site:"",contact:"06 14 28 74 02"},
  {id:10,name:"Fitia'Havana Toulouse",type:"Association",city:"Toulouse",region:"Occitanie",followers:"889",note:"Association loi 1901 : aide sociale, promotion culturelle et économique franco-malgache.",fb:"https://www.facebook.com/profile.php?id=100072412716681",insta:"",site:"",contact:"fitia.havana@gmail.com"},
  {id:11,name:"Association Malgache Franco-Guyanaise",type:"Association",city:"Rémire-Montjoly (Guyane)",region:"Outre-mer",followers:"895",note:"Association humanitaire et culturelle qui fédère les cultures et finance des actions en Guyane et à Madagascar.",fb:"https://www.facebook.com/AssociationFrancoMalgacheGuyanaise",insta:"",site:"",contact:"m.rattier973@gmail.com"},
  {id:12,name:"ACFM — Association Culturelle Franco-Malgache",type:"Association",city:"France",region:"",followers:"55",note:"Aide aux confrères malgaches dans le besoin, en particulier les enfants.",fb:"https://www.facebook.com/profile.php?id=61550882390310",insta:"",site:"https://association-culturelle-franco-malgache.com",contact:""},
  {id:13,name:"Revy Revy Vacances (Angle 360)",type:"Organisateur",city:"National",region:"",followers:"",note:"Tournées d'artistes malagasy en France : Princio & Njara Marcel à Marseille, Toulouse et Les Ulis (juillet 2026).",fb:"",insta:"",site:"",contact:""},
  {id:14,name:"Que Calor Paris",type:"Organisateur",city:"Paris",region:"Île-de-France",followers:"",note:"Soirées à Paris — 206 Vibes, Kosmo, Midnight 261, Falfa.",fb:"",insta:"https://www.instagram.com/quecalorparis",site:"",contact:""},
  {id:15,name:"Mada Mifety",type:"Organisateur",city:"Paris",region:"Île-de-France",followers:"",note:"Producteur du Grand spectacle d'été (Nono) au Domaine de la Beauvoisière, Avrainville.",fb:"",insta:"",site:"",contact:""},
  {id:16,name:"Malagasy en France 2.0",type:"Média",city:"National",region:"",followers:"44 000",note:"Émission web d'actualités de la diaspora malagasy en France.",fb:"https://www.facebook.com/malagasydiasporanews",insta:"",site:"https://malagasyenfrance.com",contact:""},
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
  {id:27,name:"KOSMO",type:"DJ & artistes",city:"Paris",region:"Île-de-France",followers:"",note:"Anime soirées et journées parisiennes — au line-up de la soirée Que Calor du 24 juillet.",fb:"https://www.facebook.com/profile.php?id=61570846886143",insta:"",site:"",contact:""},
  {id:28,name:"DJ Gouty Madagascar",type:"DJ & artistes",city:"France / Madagascar",region:"",followers:"50 000",note:"DJ et formateur en organisation événementielle.",fb:"https://www.facebook.com/djgouty",insta:"",site:"",contact:""},
  {id:29,name:"Dj DiNA",type:"DJ & artistes",city:"National",region:"",followers:"1 700",note:"DJ et administrateur du groupe Soirée Gasy France Officiel (19 400 membres).",fb:"https://www.facebook.com/dinadeejay",insta:"",site:"",contact:""},
  {id:30,name:"Rodman",type:"DJ & artistes",city:"Paris",region:"Île-de-France",followers:"",note:"DJ et organisateur de soirées dansantes.",fb:"",insta:"",site:"",contact:""},
  {id:31,name:"DJ Malagasy de France (DMF)",type:"DJ & artistes",city:"France",region:"",followers:"734",note:"Association de DJ : promotion et organisation de soirées et d'événements culturels.",fb:"https://www.facebook.com/groups/djmalagasydefrance",insta:"",site:"",contact:""},
  {id:32,name:"Hypemada",type:"Média",city:"National",region:"",followers:"10 000",note:"Collectif, média et association de la diaspora malagasy.",fb:"https://www.facebook.com/hypemada",insta:"",site:"",contact:""},
  {id:33,name:"Soirée Gasy France Officiel",type:"Groupe",city:"National",region:"",followers:"19 400",note:"Réseau d'artistes et DJ malgaches de France, géré par Dj DiNA.",fb:"https://www.facebook.com/groups/soireegasyfrance",insta:"",site:"",contact:""},
  {id:34,name:"Gasy Aty France",type:"Groupe",city:"National",region:"",followers:"13 100",note:"Groupe communautaire très actif.",fb:"https://www.facebook.com/groups/2049048968643577",insta:"",site:"",contact:""},
  {id:35,name:"Gasy Jiaby de France",type:"Groupe",city:"National",region:"",followers:"11 100",note:"Groupe communautaire très actif.",fb:"https://www.facebook.com/groups/1044706243008430",insta:"",site:"",contact:""},
  {id:36,name:"Le Bon Coin Gasy de France",type:"Groupe",city:"National",region:"",followers:"25 600",note:"Groupe d'annonces communautaire.",fb:"https://www.facebook.com/groups/2072223663014016",insta:"",site:"",contact:""},
]

const CAT_COLORS = {Soirée:{bg:"#fde8ec",color:RED},Culture:{bg:"#e6f4ed",color:GREEN},Gastronomie:{bg:"#fff3e0",color:"#e65100"},Sport:{bg:"#e3f2fd",color:"#1565c0"},Religion:{bg:"#fff8e1",color:"#f57f17"},Autre:{bg:"#f5f5f5",color:"#555"}}
const CAT_EMOJI = {Soirée:"🎉",Culture:"🎭",Gastronomie:"🍽️",Sport:"🏆",Religion:"⛪",Autre:"📌"}

// Habillage visuel "Malagasy Events" : placeholder brandé quand pas d'affiche
const BrandedCover = ({event, big}) => (
  <div style={{width:"100%",height:"100%",background:`linear-gradient(135deg, ${RED} 0%, #6e0a16 55%, ${GREEN} 140%)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:big?10:6}}>
    <span style={{fontSize:big?64:44,filter:"drop-shadow(0 4px 12px rgba(0,0,0,.35))"}}>{CAT_EMOJI[event.category]||"🎉"}</span>
    <span style={{color:"rgba(255,255,255,.92)",fontWeight:800,fontSize:big?14:11,letterSpacing:2.5,textTransform:"uppercase"}}>🇲🇬 Malagasy Events</span>
    <span style={{color:"rgba(255,255,255,.65)",fontWeight:700,fontSize:big?12:10}}>{event.city}</span>
  </div>
)
// Liseré aux couleurs du drapeau malagasy
const FlagStripe = () => (
  <div style={{position:"absolute",top:0,left:0,right:0,height:4,display:"flex",zIndex:2}}>
    <div style={{flex:1,background:WHITE}}/><div style={{flex:1,background:RED}}/><div style={{flex:1,background:GREEN}}/>
  </div>
)
const CITIES     = ["Toutes","Paris","Lyon","Marseille","Bordeaux","Lille","Toulouse"]
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
    await supabase.from('profiles').update({categories:selected}).eq('id',user.id)
    onSave(selected)
    setSaving(false)
  }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:16}}>
      <div style={{background:WHITE,borderRadius:28,width:"100%",maxWidth:420,padding:32,boxShadow:"0 32px 80px rgba(0,0,0,0.35)"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <p style={{fontSize:44,margin:"0 0 12px"}}>🇲🇬</p>
          <h2 style={{fontWeight:900,fontSize:22,color:"#111",margin:"0 0 10px"}}>Personnalise ton expérience</h2>
          <p style={{fontSize:14,color:"#888",margin:0,lineHeight:1.5}}>Choisis tes centres d'intérêt — les événements et contenus qui te correspondent seront mis en avant</p>
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
    await supabase.from('profiles').update({categories:selected}).eq('id',user.id)
    onUpdate({...userProfile,categories:selected})
    setSaved(true); setSaving(false)
    setTimeout(()=>setSaved(false),2000)
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
const PAYMENT_LINKS = { boost:"", pro_mensuel:"", pro_annuel:"", premium_annuaire:"" } // ← coller ici les Stripe Payment Links

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
          <h2 style={{color:WHITE,fontWeight:800,fontSize:19,margin:"0 0 4px"}}>Bienvenue en mode Organisateur !</h2>
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
  const myEvents = myOrga ? events.filter(e=>{const org=(e.organizer||"").toLowerCase();const first=myOrga.name.toLowerCase().split(/[ —-]+/).filter(w=>w.length>3)[0];return first&&org.includes(first)}) : []

  useEffect(()=>{ fetchStats() },[])
  const fetchStats = async () => {
    const ids = myEvents.map(e=>e.id)
    const [ints,cmts,rems,fols,actus] = await Promise.all([
      ids.length?supabase.from('event_interests').select('*',{count:'exact',head:true}).in('event_id',ids):{count:0},
      ids.length?supabase.from('comments').select('*',{count:'exact',head:true}).in('event_id',ids):{count:0},
      ids.length?supabase.from('email_reminders').select('*',{count:'exact',head:true}).in('event_id',ids):{count:0},
      supabase.from('follows').select('*',{count:'exact',head:true}).eq('following_id',user.id),
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
        <Cell n={stats?.fols} l="Abonnés à ton compte" e="👥"/>
        <Cell n={stats?.actus} l="Actus publiées" e="📣"/>
      </div>
      <p style={{fontSize:11,color:"#bbb",margin:"12px 0 0",textAlign:"center"}}>📈 Statistiques avancées (vues, clics billetterie, courbes) — bientôt avec le forfait Pro.</p>
    </div>
  )
}

function ProfileModal({ user, userProfile, onClose, onSignOut, onUpdate, orgas = [], events = [], onGoPro }) {
  const [tab,setTab]         = useState("profil")
  const [username,setUsername] = useState(userProfile?.username||"")
  const [avatarUrl,setAvatarUrl] = useState(userProfile?.avatar_url||"")
  const [codePostal,setCodePostal] = useState(userProfile?.code_postal||"")
  const [saving,setSaving]   = useState(false)
  const [saved,setSaved]     = useState(false)
  const [uploading,setUploading] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase.from('profiles').update({ username, avatar_url:avatarUrl, code_postal:codePostal }).eq('id',user.id)
    if (!error) { setSaved(true); onUpdate({...userProfile,username,avatar_url:avatarUrl,code_postal:codePostal}); setTimeout(()=>setSaved(false),2000) }
    setSaving(false)
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
            {avatarUrl ? <img src={avatarUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <span style={{fontSize:28,fontWeight:800,color:RED}}>{initiale}</span>}
          </div>
          <h2 style={{color:WHITE,fontWeight:800,fontSize:18,margin:"0 0 4px"}}>{userProfile?.username||user?.email?.split("@")[0]}</h2>
          <p style={{color:"rgba(255,255,255,0.7)",fontSize:12,margin:0}}>{user?.email}</p>
          {userProfile?.code_postal && <p style={{color:"rgba(255,255,255,0.6)",fontSize:11,margin:"4px 0 0"}}>📍 {userProfile.code_postal}</p>}
          {userProfile?.is_member && <span style={{background:GREEN,color:WHITE,fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:99,display:"inline-block",marginTop:8}}>✓ Membre 2,50€/mois</span>}
        </div>
        <div style={{display:"flex",height:4}}><div style={{flex:1,background:"#eee"}}/><div style={{flex:2,background:RED}}/><div style={{flex:2,background:GREEN}}/></div>
        <div style={{display:"flex",padding:"16px 24px 0"}}>
          {(userProfile?.plan==="organisateur"
            ? [["profil","👤 Mon profil"],["stats","📊 Statistiques"],["compte","⚙️ Compte"]]
            : [["profil","👤 Mon profil"],["interets","🎯 Intérêts"],["compte","⚙️ Compte"]]).map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:"8px 0",border:"none",cursor:"pointer",fontWeight:700,fontSize:13,background:"none",color:tab===k?RED:"#aaa",borderBottom:tab===k?`2px solid ${RED}`:"2px solid transparent"}}>{l}</button>
          ))}
        </div>
        <div style={{padding:24}}>
          {tab==="profil" && (
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div><label style={lbl}>Pseudo</label><input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Ton pseudo" style={inp}/></div>
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
          {tab==="stats" && userProfile?.plan==="organisateur" && (
            <OrgaStatsTab user={user} orgas={orgas} events={events}/>
          )}
          {tab==="compte" && (
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{background:"#f8f8f8",borderRadius:14,padding:16}}>
                <p style={{fontSize:12,fontWeight:700,color:"#999",textTransform:"uppercase",margin:"0 0 8px"}}>Mon pack</p>
                {userProfile?.plan==="pro" ? (
                  <><p style={{fontSize:15,fontWeight:800,margin:"0 0 6px"}}>⭐ Pack Pro — membre premium</p>
                  <ul style={{margin:0,paddingLeft:18,fontSize:12.5,color:"#666",lineHeight:1.7}}>
                    <li>Badge ⭐ Pro doré sur ton profil et tes posts</li>
                    <li>Tes publications <b>mises en avant</b> dans la communauté</li>
                    <li>Tu soutiens Malagasy Events 🇲🇬</li>
                  </ul></>
                ) : userProfile?.plan==="organisateur" ? (
                  <><p style={{fontSize:15,fontWeight:800,margin:"0 0 6px"}}>🎪 Pack Organisateur <span style={{fontSize:11,fontWeight:700,color:GREEN}}>· actif</span></p>
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
                  <p style={{fontSize:12,color:"#999",margin:"0 0 6px",lineHeight:1.5}}>Passe en 🎪 Organisateur ou ⭐ Pro pour publier tes événements directement et gagner en visibilité.</p>
                  <p style={{fontSize:11,color:"#bbb",margin:0}}>Contacte-nous via la Communauté pour activer un pack.</p></>
                )}
              </div>
              <button onClick={()=>{onSignOut();onClose()}} style={{background:"#f5f5f5",color:"#e53935",fontWeight:700,fontSize:14,padding:"12px 0",borderRadius:14,border:"none",cursor:"pointer",marginTop:8}}>Se déconnecter</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── AuthModal ────────────────────────────────────── */
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
      const {data,error} = await supabase.auth.signUp({
        email, password:pw,
        options:{ data:{ username: username||email.split('@')[0], code_postal: codePostal||null } }
      })
      if (error) { setError(error?.message||"Erreur lors de la création du compte") }
      else {
        // Le trigger Supabase crée le profil automatiquement
        // On tente aussi un upsert au cas où (session dispo = confirmation désactivée)
        if (data?.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            username: username||email.split('@')[0],
            code_postal: codePostal||null
          }, { onConflict:'id' })
        }
        onSuccess(true); onClose()
      }
    }
    setLoading(false)
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
    await supabase.from('comments').insert({content:text.trim(),user_id:user.id,...(mediaId?{media_id:mediaId}:{event_id:eventId})})
    setText(""); await fetchComments(); setLoading(false)
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
        <button onClick={()=>{ navigator.clipboard.writeText(`https://malagasy-events.vercel.app/#event-${ev.id}`); setCopied('link') }} style={{width:"100%",background:"#f5f5f5",color:"#333",fontWeight:700,fontSize:13,padding:"10px 0",borderRadius:12,border:"none",cursor:"pointer"}}>
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

/* ── SubmitEventModal (proposer un événement — public) ── */
function SubmitEventModal({ user, userProfile, onEventPublished, onClose }) {
  const empty = {title:"",date:"",city:"",location:"",category:"Soirée",price:"",organizer:"",ticket_url:"",image:"",description:"",submitter_email:user?.email||""}
  const [f,setF] = useState(empty)
  const [sent,setSent] = useState(false)
  const [direct,setDirect] = useState(false) // publié directement (pack organisateur/pro)
  const [saving,setSaving] = useState(false)
  const canDirect = canPublishDirect(userProfile) // Organisateur
  const inp = {border:"1.5px solid #e5e5e5",borderRadius:10,padding:"10px 12px",fontSize:14,outline:"none",width:"100%",boxSizing:"border-box"}
  const submit = async () => {
    if (!f.title.trim()||!f.date) { alert("Titre et date sont obligatoires."); return }
    setSaving(true)
    if (canDirect) {
      // Organisateur : publication directe + automatiquement à la une.
      const payload = {title:f.title,date:f.date,city:f.city,location:f.location,category:f.category,price:f.price,organizer:f.organizer||userProfile?.username||"",ticketUrl:safeUrl(f.ticket_url),image:safeUrl(f.image),description:f.description,mediaUrls:[],featured:true,createdAt:new Date().toISOString()}
      const {data,error} = await supabase.from('events').insert(payload).select().single()
      if (error) { alert("⚠️ "+error.message); setSaving(false); return }
      onEventPublished?.(data); setDirect(true); setSent(true)
    } else {
      const {error} = await supabase.from('event_submissions').insert({...f,ticket_url:safeUrl(f.ticket_url),image:safeUrl(f.image),submitter_id:user?.id||null})
      if (error) { alert("⚠️ "+error.message); setSaving(false); return }
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
              🎪 Pack Organisateur — ton événement sera publié directement, sans validation, et mis à la une.
            </div>
          ) : (
            <p style={{fontSize:12,color:"#999",margin:"0 0 16px"}}>Partage un événement malagasy — on le vérifie et on le publie.</p>
          )}
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <input value={f.title} onChange={e=>setF({...f,title:e.target.value})} placeholder="Nom de l'événement *" style={inp}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <input type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})} style={inp}/>
              <select value={f.category} onChange={e=>setF({...f,category:e.target.value})} style={inp}>
                {["Soirée","Culture","Gastronomie","Sport","Religion","Autre"].map(c=><option key={c} value={c}>{c}</option>)}
              </select>
              <input value={f.city} onChange={e=>setF({...f,city:e.target.value})} placeholder="Ville" style={inp}/>
              <input value={f.price} onChange={e=>setF({...f,price:e.target.value})} placeholder="Prix (ex: 15€)" style={inp}/>
            </div>
            <input value={f.location} onChange={e=>setF({...f,location:e.target.value})} placeholder="Lieu / salle" style={inp}/>
            <input value={f.organizer} onChange={e=>setF({...f,organizer:e.target.value})} placeholder="Organisateur" style={inp}/>
            <input value={f.ticket_url} onChange={e=>setF({...f,ticket_url:e.target.value})} placeholder="Lien billetterie (optionnel)" style={inp}/>
            <input value={f.image} onChange={e=>setF({...f,image:e.target.value})} placeholder="Lien de l'affiche (optionnel)" style={inp}/>
            <textarea value={f.description} onChange={e=>setF({...f,description:e.target.value})} placeholder="Description" rows={3} style={{...inp,resize:"vertical",fontFamily:"system-ui,sans-serif"}}/>
            {!user && <input value={f.submitter_email} onChange={e=>setF({...f,submitter_email:e.target.value})} placeholder="Ton email (pour te recontacter)" style={inp}/>}
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
function FollowButton({ targetUserId, currentUser, onAuthRequired, small }) {
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
      await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', targetUserId)
      setFollowing(false)
    } else {
      await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: targetUserId })
      setFollowing(true)
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

/* ── UserProfileModal ─────────────────────────────── */
function UserProfileModal({ profileId, currentUser, onAuthRequired, onClose, onMessage }) {
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (profileId) fetchAll() }, [profileId])

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: p }, { data: ps }, { count: fc }, { count: fgc }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', profileId).single(),
      supabase.from('posts').select('*').eq('user_id', profileId).order('created_at', { ascending: false }).limit(8),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profileId),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profileId),
    ])
    setProfile(p); setPosts(ps || []); setFollowerCount(fc || 0); setFollowingCount(fgc || 0); setLoading(false)
  }

  const initiale = (profile?.username || "?")[0].toUpperCase()

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 150, padding: 16 }}>
      <div style={{ background: WHITE, borderRadius: 24, width: "100%", maxWidth: 440, maxHeight: "88vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.3)" }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "#bbb" }}>Chargement...</div>
        ) : !profile ? (
          <div style={{ padding: 40, textAlign: "center", color: "#bbb" }}>Profil introuvable</div>
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
              <FollowButton targetUserId={profileId} currentUser={currentUser} onAuthRequired={onAuthRequired} />
              {currentUser && currentUser.id !== profileId && (
                <button onClick={() => { onMessage(profileId, profile.username); onClose() }} style={{ background: "#f5f5f5", color: "#333", fontWeight: 700, fontSize: 13, padding: "8px 16px", borderRadius: 99, border: "none", cursor: "pointer" }}>✉️ Message</button>
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
function PostCard({ post, user, isAdmin, onAuthRequired, onMessage, onProfileClick, onDeleted }) {
  const canDelete = !!user && (user.id===post.user_id || isAdmin)
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
      await supabase.from('post_likes').delete().eq('post_id',post.id).eq('user_id',user.id)
      setLiked(false); setLikesCount(c=>c-1)
    } else {
      await supabase.from('post_likes').insert({post_id:post.id,user_id:user.id})
      setLiked(true); setLikesCount(c=>c+1)
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
    await supabase.from('post_comments').insert({post_id:post.id,user_id:user.id,content:cmtText.trim()})
    setCmtText(""); fetchCmts()
  }

  const u = post.profiles
  const initiale = (u?.username||"?")[0].toUpperCase()

  const isProPost = u?.plan==="pro"
  return (
    <div onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{background:WHITE,borderRadius:20,boxShadow:hover?"0 8px 32px rgba(0,0,0,0.12)":"0 2px 12px rgba(0,0,0,0.07)",transition:"all .2s",marginBottom:16,overflow:"hidden",border:isProPost?"1.5px solid #e6b31e":"none"}}>
      {isProPost && <div style={{background:"linear-gradient(135deg,#b8860b,#e6b31e)",color:WHITE,fontSize:10,fontWeight:800,padding:"4px 16px",letterSpacing:0.5}}>⭐ MEMBRE PRO — mis en avant</div>}
      <div style={{padding:"16px 16px 12px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <div style={{width:42,height:42,borderRadius:"50%",background:RED,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0}}>
            {u?.avatar_url ? <img src={u.avatar_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <span style={{color:WHITE,fontWeight:800,fontSize:16}}>{initiale}</span>}
          </div>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span onClick={e=>{e.stopPropagation();onProfileClick&&onProfileClick(post.user_id,u?.username)}} style={{fontWeight:700,fontSize:14,color:isOfficial(u?.username)?RED:"#111",cursor:"pointer",textDecoration:"underline dotted"}}>{u?.username||"Anonyme"}</span>
              {isOfficial(u?.username) && <span style={{background:RED,color:WHITE,fontSize:9,fontWeight:800,padding:"2px 6px",borderRadius:99}}>✓ OFFICIEL</span>}
              {!isOfficial(u?.username) && <PlanBadge plan={u?.plan}/>}
              {!isOfficial(u?.username) && <FanBadge profile={u}/>}
              {!isOfficial(u?.username) && !PLAN_BADGE[u?.plan] && u?.is_member && <span style={{background:GREEN,color:WHITE,fontSize:9,fontWeight:800,padding:"2px 6px",borderRadius:99}}>MEMBRE</span>}
            </div>
            <span style={{fontSize:11,color:"#bbb"}}>{ago(post.created_at)}</span>
          </div>
          {user && user.id!==post.user_id && (
            <button onClick={()=>onMessage(post.user_id,u?.username)} style={{background:"#f5f5f5",color:"#555",fontWeight:600,fontSize:11,padding:"5px 10px",borderRadius:99,border:"none",cursor:"pointer"}}>✉️ Message</button>
          )}
        </div>
        <p style={{fontSize:15,color:"#222",margin:0,lineHeight:1.5,whiteSpace:"pre-wrap"}}>{post.content}</p>
      </div>
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
    setItems((data||[]).filter(r=>{ const ev=events.find(e=>e.id===r.event_id); return ev && !isPast(ev.date) }))
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
            const ev = events.find(e=>e.id===r.event_id)
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

function CommunityFeed({ user, userProfile, isAdmin, onAuthRequired, onMessage, onProfileClick, onOpenEvent, events }) {
  const [posts,setPosts]         = useState([])
  const [content,setContent]     = useState("")
  const [imageUrl,setImageUrl]   = useState("")
  const [loading,setLoading]     = useState(false)
  const [posting,setPosting]     = useState(false)
  const [feedMode,setFeedMode]   = useState("all") // "all" | "following" | "members"
  const [suggested,setSuggested] = useState([])
  const [members,setMembers]     = useState([])
  const [memberSearch,setMemberSearch] = useState("")
  const [membersLoading,setMembersLoading] = useState(false)
  const isMobile                 = useIsMobile()

  useEffect(()=>{
    if (feedMode==="members") fetchMembers()
    else if (feedMode!=="entraide") fetchPosts()
  },[feedMode, user])
  useEffect(()=>{ if(user) fetchSuggested() },[user])

  // Rattache les profils si la jointure Supabase échoue (colonne/relation manquante)
  const attachProfiles = async rows => {
    const ids = [...new Set(rows.map(r=>r.user_id).filter(Boolean))]
    if (!ids.length) return rows
    const {data:profs} = await supabase.from('profiles').select('*').in('id',ids)
    const map = Object.fromEntries((profs||[]).map(p=>[p.id,p]))
    return rows.map(r=>({...r,profiles:r.profiles||map[r.user_id]||null}))
  }

  const fetchPosts = async () => {
    setLoading(true)
    let ids = null
    if (feedMode==="following" && user) {
      const {data:follows} = await supabase.from('follows').select('following_id').eq('follower_id',user.id)
      ids = (follows||[]).map(f=>f.following_id)
      if (ids.length===0) { setPosts([]); setLoading(false); return }
    }
    let q = supabase.from('posts').select('*,profiles(username,avatar_url,is_member,plan,fan_points,fan_badge)').order('created_at',{ascending:false}).limit(30)
    if (ids) q = supabase.from('posts').select('*,profiles(username,avatar_url,is_member,plan,fan_points,fan_badge)').in('user_id',ids).order('created_at',{ascending:false}).limit(30)
    let {data,error} = await q
    if (error) {
      console.warn("Jointure posts→profiles échouée, repli sans jointure :", error.message)
      let q2 = supabase.from('posts').select('*').order('created_at',{ascending:false}).limit(30)
      if (ids) q2 = supabase.from('posts').select('*').in('user_id',ids).order('created_at',{ascending:false}).limit(30)
      const r = await q2
      if (r.error) console.error("Lecture des posts impossible :", r.error.message)
      data = await attachProfiles(r.data||[])
    }
    setPosts(data||[])
    setLoading(false)
  }

  const fetchMembers = async () => {
    setMembersLoading(true)
    // select('*') = ne casse jamais si une colonne (created_at, email…) n'existe pas
    const {data,error} = await supabase.from('profiles').select('*').limit(500)
    if (error) console.error("Lecture des membres impossible :", error.message)
    const sorted = (data||[]).sort((a,b)=>String(b.created_at||"").localeCompare(String(a.created_at||"")))
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
    setSuggested(data||[])
  }

  const submitPost = async e => {
    e.preventDefault()
    if (!user) { onAuthRequired(); return }
    if (!content.trim()) return
    setPosting(true)
    await supabase.from('posts').insert({user_id:user.id,content:content.trim(),image_url:imageUrl||null})
    setContent(""); setImageUrl(""); fetchPosts(); setPosting(false)
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
              <div style={{width:44,height:44,borderRadius:"50%",background:RED,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,overflow:"hidden"}}>
                {userProfile?.avatar_url ? <img src={userProfile.avatar_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <span style={{color:WHITE,fontWeight:800}}>{initiale}</span>}
              </div>
              <form onSubmit={submitPost} style={{flex:1,display:"flex",flexDirection:"column",gap:10}}>
                <textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="Partage quelque chose avec la communauté 🇲🇬..." rows={3} style={{border:"1.5px solid #eee",borderRadius:14,padding:"10px 14px",fontSize:14,outline:"none",resize:"none",fontFamily:"system-ui,sans-serif",width:"100%",boxSizing:"border-box"}}/>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <input value={imageUrl} onChange={e=>setImageUrl(e.target.value)} placeholder="📷 Lien image (optionnel)" style={{flex:1,border:"1.5px solid #eee",borderRadius:10,padding:"7px 12px",fontSize:12,outline:"none"}}/>
                  <button type="submit" disabled={!content.trim()||posting} style={{background:content.trim()?RED:"#ccc",color:WHITE,fontWeight:700,fontSize:13,padding:"8px 18px",borderRadius:12,border:"none",cursor:content.trim()?"pointer":"not-allowed"}}>
                    {posting?"...":"Publier"}
                  </button>
                </div>
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
            {feedMode==="following" && <button onClick={()=>setFeedMode("all")} style={{background:RED,color:WHITE,fontWeight:700,padding:"8px 20px",borderRadius:99,border:"none",cursor:"pointer",marginTop:8}}>Découvrir des membres</button>}
          </div>
        ) : (
          [...posts].sort((a,b)=>((b.profiles?.plan==='pro')?1:0)-((a.profiles?.plan==='pro')?1:0)).map(p=><PostCard key={p.id} post={p} user={user} isAdmin={isAdmin} onAuthRequired={onAuthRequired} onMessage={onMessage} onProfileClick={onProfileClick} onDeleted={id=>setPosts(list=>list.filter(x=>x.id!==id))}/>)
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

/* ── MessagesModal ────────────────────────────────── */
function MessagesModal({ user, userProfile, onClose, initialRecipientId, initialRecipientName }) {
  const [convList,setConvList]       = useState([])
  const [selectedUserId,setSelected] = useState(initialRecipientId||null)
  const [selectedName,setSelName]    = useState(initialRecipientName||"")
  const [msgs,setMsgs]               = useState([])
  const [text,setText]               = useState("")
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
          setMsgs(prev=>[...prev, m])
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
      .subscribe()
    return ()=>{ supabase.removeChannel(channel) }
  },[user, selectedUserId])

  const fetchConvList = async () => {
    const {data} = await supabase.from('messages').select('sender_id,recipient_id,created_at,read,content').or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`).order('created_at',{ascending:false})
    if (!data) return
    const seen=new Set(); const uniq=[]; const unread={}; const last={}
    data.forEach(m=>{
      const other = m.sender_id===user.id?m.recipient_id:m.sender_id
      if (!seen.has(other)) { seen.add(other); uniq.push(other); last[other]=m }
      if (m.recipient_id===user.id && !m.read) unread[other]=true // message reçu non lu
    })
    if (uniq.length===0) { setConvList([]); return }
    const {data:profiles} = await supabase.from('profiles').select('id,username,avatar_url').in('id',uniq)
    // ordonné par dernier message, avec drapeau "non lu" et aperçu
    const ordered = uniq.map(id=>{
      const p=(profiles||[]).find(x=>x.id===id)||{id,username:"?"}
      return {...p, unread:!!unread[id], preview:last[id]?.content||"", incoming:last[id]?.sender_id===id}
    })
    setConvList(ordered)
  }

  const fetchMsgs = async () => {
    const {data} = await supabase.from('messages').select('*').or(`and(sender_id.eq.${user.id},recipient_id.eq.${selectedUserId}),and(sender_id.eq.${selectedUserId},recipient_id.eq.${user.id})`).order('created_at',{ascending:true})
    setMsgs(data||[])
    // mark as read
    await supabase.from('messages').update({read:true}).eq('recipient_id',user.id).eq('sender_id',selectedUserId)
    fetchConvList() // rafraîchit les gras "non lu"
  }

  const send = async e => {
    e.preventDefault()
    if (!text.trim()||!selectedUserId) return
    await supabase.from('messages').insert({sender_id:user.id,recipient_id:selectedUserId,content:text.trim()})
    setText(""); fetchMsgs(); fetchConvList()
  }

  const searchUsers = async val => {
    setSearch(val)
    if (!val.trim()) { setResults([]); return }
    const {data} = await supabase.from('profiles').select('id,username,avatar_url').ilike('username',`%${val}%`).neq('id',user.id).limit(5)
    setResults(data||[])
  }

  const selectUser = (id,name) => { setSelected(id); setSelName(name); setSearch(""); setResults([]) }

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
                    <div key={r.id} onClick={()=>selectUser(r.id,r.username)} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",cursor:"pointer",borderBottom:"1px solid #f5f5f5"}}>
                      <div style={{width:32,height:32,borderRadius:"50%",background:RED,display:"flex",alignItems:"center",justifyContent:"center",color:WHITE,fontWeight:800,fontSize:12}}>{(r.username||"?")[0].toUpperCase()}</div>
                      <span style={{fontSize:13,fontWeight:600}}>{r.username}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{flex:1,overflowY:"auto"}}>
              {convList.map(c=>(
                <div key={c.id} onClick={()=>selectUser(c.id,c.username)} style={{display:"flex",alignItems:"center",gap:10,padding:"12px",cursor:"pointer",background:selectedUserId===c.id?"#fde8ec":c.unread?"#fff8f9":"transparent",borderBottom:"1px solid #f5f5f5"}}>
                  <div style={{position:"relative",flexShrink:0}}>
                    <div style={{width:38,height:38,borderRadius:"50%",background:RED,display:"flex",alignItems:"center",justifyContent:"center",color:WHITE,fontWeight:800}}>{(c.username||"?")[0].toUpperCase()}</div>
                    {c.unread && <span style={{position:"absolute",top:-1,right:-1,width:11,height:11,borderRadius:"50%",background:GREEN,border:"2px solid #fff"}}/>}
                  </div>
                  <div style={{minWidth:0,flex:1}}>
                    <span style={{fontSize:13,fontWeight:c.unread?800:600,color:c.unread?"#111":(selectedUserId===c.id?RED:"#333")}}>{c.username}</span>
                    {c.preview && <p style={{fontSize:11,margin:"2px 0 0",color:c.unread?"#444":"#aaa",fontWeight:c.unread?700:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.incoming?"":"Toi : "}{c.preview}</p>}
                  </div>
                </div>
              ))}
              {convList.length===0 && !search && (
                <p style={{fontSize:12,color:"#bbb",textAlign:"center",padding:16}}>Cherche un utilisateur pour démarrer une conversation</p>
              )}
            </div>
          </div>
          {/* Messages */}
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
            {selectedUserId ? (
              <>
                <div style={{padding:"12px 16px",borderBottom:"1px solid #f0f0f0",fontWeight:700,fontSize:14,color:"#333"}}>
                  {isMobile && <button onClick={()=>setSelected(null)} style={{background:"none",border:"none",color:RED,fontWeight:700,cursor:"pointer",marginRight:8}}>←</button>}
                  {selectedName}
                </div>
                <div style={{flex:1,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:8}}>
                  {msgs.map(m=>{
                    const mine = m.sender_id===user.id
                    return (
                      <div key={m.id} style={{display:"flex",justifyContent:mine?"flex-end":"flex-start"}}>
                        <div style={{maxWidth:"70%",background:mine?RED:"#f0f0f0",color:mine?WHITE:"#333",borderRadius:mine?"16px 16px 4px 16px":"16px 16px 16px 4px",padding:"9px 14px",fontSize:14}}>
                          {m.content}
                          <div style={{fontSize:10,color:mine?"rgba(255,255,255,0.7)":"#bbb",marginTop:3,textAlign:"right"}}>{ago(m.created_at)}</div>
                        </div>
                      </div>
                    )
                  })}
                  {msgs.length===0 && <p style={{textAlign:"center",color:"#bbb",fontSize:13}}>Dis bonjour 👋</p>}
                  <div ref={msgEnd}/>
                </div>
                <form onSubmit={send} style={{padding:"12px 16px",borderTop:"1px solid #f0f0f0",display:"flex",gap:8}}>
                  <input value={text} onChange={e=>setText(e.target.value)} placeholder="Ton message..." style={{flex:1,border:"1.5px solid #eee",borderRadius:99,padding:"9px 16px",fontSize:13,outline:"none"}}/>
                  <button type="submit" disabled={!text.trim()} style={{background:RED,color:WHITE,fontWeight:700,padding:"9px 18px",borderRadius:99,border:"none",cursor:"pointer",opacity:text.trim()?1:.5}}>Envoyer</button>
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
const GASTRO_COLORS = {"Restaurant":{bg:"#FAECE7",color:"#712B13"},"Traiteur":{bg:"#e6f4ed",color:GREEN},"Food truck":{bg:"#fff3e0",color:"#e65100"}}
const GASTRO_EMOJI  = {"Restaurant":"🍽️","Traiteur":"👨‍🍳","Food truck":"🚚"}
const GASTRO_GRAD   = {"Restaurant":"linear-gradient(135deg,#C8102E,#7a0a1c)","Traiteur":"linear-gradient(135deg,#007A3D,#044d27)","Food truck":"linear-gradient(135deg,#e65100,#9c3a00)"}

const ORGA_COLORS = {"Association sportive":{bg:"#e3f2fd",color:"#1565c0"},"Association":{bg:"#e6f4ed",color:GREEN},"Organisateur":{bg:"#fde8ec",color:RED},"DJ & artistes":{bg:"#FBEAF0",color:"#72243E"},"Média":{bg:"#EEEDFE",color:"#3C3489"},"Groupe":{bg:"#fff3e0",color:"#b35c00"}}
const ORGA_GRAD = {"Association sportive":"linear-gradient(135deg,#1565c0,#0C447C)","Association":"linear-gradient(135deg,#007A3D,#044d27)","Organisateur":"linear-gradient(135deg,#C8102E,#7a0a1c)","DJ & artistes":"linear-gradient(135deg,#72243E,#4B1528)","Média":"linear-gradient(135deg,#3C3489,#26215C)","Groupe":"linear-gradient(135deg,#b35c00,#7a3d00)"}
const ORGA_EMOJI  = {"Association sportive":"🏆","Association":"🤝","Organisateur":"🎪","DJ & artistes":"🎧","Média":"📰","Groupe":"👥"}

function OrgaDetail({ o, isMobile, user, userProfile, isAdmin, events, onOpenEvent, onClose, onUpdated }) {
  const col = ORGA_COLORS[o.type]||{bg:"#f5f5f5",color:"#555"}
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
  const [posting,setPosting] = useState(false)
  useEffect(()=>{
    supabase.from('orga_posts').select('*, profiles(username)').eq('orga_id',o.id).order('created_at',{ascending:false}).limit(20)
      .then(({data})=>setPosts(data||[]))
  },[o.id])
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
  const initials = o.name.split(" ").filter(Boolean).map(w=>w[0]).slice(0,2).join("").toUpperCase()
  const theirEvents = events.filter(e=>{
    const org=(e.organizer||"").toLowerCase(); const first=o.name.toLowerCase().split(/[ —-]+/).filter(w=>w.length>3)[0]
    return first && org.includes(first)
  })
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
        <div style={{position:"relative",height:isMobile?140:170,background:`linear-gradient(135deg, ${RED} 0%, #6e0a16 55%, ${GREEN} 140%)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:4,display:"flex"}}>
            <div style={{flex:1,background:WHITE}}/><div style={{flex:1,background:RED}}/><div style={{flex:1,background:GREEN}}/>
          </div>
          <button onClick={onClose} style={{position:"absolute",top:14,right:14,background:"rgba(0,0,0,0.4)",color:WHITE,fontWeight:800,fontSize:20,width:36,height:36,borderRadius:"50%",border:"none",cursor:"pointer"}}>×</button>
          <div style={{width:60,height:60,borderRadius:"50%",background:WHITE,color:col.color,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:20}}>{initials}</div>
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
              {o.followers && <span style={{fontSize:13,color:"#999"}}>👥 {o.followers} abonnés</span>}
            </div>
            {o.note && <p style={{fontSize:14,color:"#555",lineHeight:1.6,margin:"0 0 16px"}}>{o.note}</p>}
            {o.contact && (
              <div style={{display:"flex",alignItems:"center",gap:10,background:"#f7f7f7",borderRadius:12,padding:"10px 14px",fontSize:13,color:"#333",fontWeight:600,marginBottom:14}}>📞 {o.contact}</div>
            )}
            {(posts.length>0 || canPost || isOwner) && (
              <div style={{marginBottom:16}}>
                <p style={{fontWeight:700,fontSize:13,color:"#444",margin:"0 0 8px"}}>📣 Actus {isPro && <span style={{fontSize:10,fontWeight:800,color:"#b8860b"}}>· espace PRO</span>}</p>
                {canPost && (
                  <div style={{background:"#faf6ec",border:"1.5px solid #e6d9a8",borderRadius:12,padding:12,marginBottom:10}}>
                    <textarea value={postText} onChange={e=>setPostText(e.target.value)} placeholder="Annoncez un événement, une promo, une actualité…" rows={2} style={{...inp,resize:"vertical",fontFamily:"system-ui,sans-serif",marginBottom:8}}/>
                    <div style={{display:"flex",gap:8}}>
                      <input value={postImg} onChange={e=>setPostImg(e.target.value)} placeholder="URL d'image (optionnel)" style={{...inp,flex:1}}/>
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
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                          <span style={{fontSize:12,fontWeight:700,color:col.color}}>{o.name}</span>
                          <span style={{fontSize:11,color:"#aaa"}}>{ago(p.created_at)}</span>
                          {(isAdmin || (user && p.user_id===user.id)) && <button onClick={()=>delPost(p.id)} style={{marginLeft:"auto",background:"none",border:"none",color:"#c00",fontSize:11,cursor:"pointer",fontWeight:700}}>🗑️</button>}
                        </div>
                        <p style={{fontSize:13.5,color:"#222",margin:0,lineHeight:1.5,whiteSpace:"pre-wrap"}}>{p.content}</p>
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
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {theirEvents.map(e=>(
                    <button key={e.id} onClick={()=>{onClose();onOpenEvent(e)}} style={{textAlign:"left",background:"#f8f8f8",border:"none",borderRadius:10,padding:"9px 12px",cursor:"pointer"}}>
                      <span style={{fontSize:13,fontWeight:700,color:"#111"}}>{e.title}</span>
                      <span style={{fontSize:12,color:"#888"}}> — {fmtShort(e.date)} · {e.city}{isPast(e.date)?" (passé)":""}</span>
                    </button>
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
function LieuxPage({ isMobile, page, lieux }) {
  const meta = LIEUX_PAGES[page]||LIEUX_PAGES.eglise
  const cats = meta.cats||[page]
  const items = lieux.filter(l=>cats.includes(l.category))
  const [q,setQ] = useState("")
  const [filter,setFilter] = useState("Tous")
  const [selected,setSelected] = useState(null)

  // Filtres propres, sans doublon : par catégorie (Boutiques/Artisanat) ou par obédience (églises)
  const chips = meta.filterBy==="category"
    ? ["Tous",...cats.filter(c=>items.some(l=>l.category===c))]
    : ["Tous",...[...new Set(items.map(l=>l.denom).filter(Boolean))].sort()]
  const chipLabel = c => c==="Tous" ? "Tous" : (CAT_STYLE[c] ? `${CAT_STYLE[c].emoji} ${CAT_STYLE[c].label}s` : c)
  const matchFilter = l => filter==="Tous" || (meta.filterBy==="category" ? l.category===filter : l.denom===filter)

  const nq = q.trim().toLowerCase()
  const list = items.filter(l=>{
    const qOk = !nq || [l.name,l.city,l.address,l.note,l.denom].some(v=>(v||"").toLowerCase().includes(nq))
    return matchFilter(l) && qOk
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
        <div style={{position:"relative",marginBottom:14}}>
          <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:15,color:"#aaa"}}>🔍</span>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Rechercher par nom ou ville..." style={{width:"100%",border:"1.5px solid #e5e5e5",borderRadius:14,padding:"11px 14px 11px 40px",fontSize:14,outline:"none",boxSizing:"border-box",background:WHITE}}/>
        </div>
        {chips.length>2 && (
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:18}}>
            {chips.map(c=>(
              <button key={c} onClick={()=>setFilter(c)} style={{background:filter===c?RED:WHITE,color:filter===c?WHITE:"#444",fontWeight:700,fontSize:13,padding:"8px 16px",borderRadius:99,border:filter===c?"none":"1px solid #e0e0e0",cursor:"pointer"}}>{chipLabel(c)}</button>
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
              <button onClick={()=>setSelected(null)} style={{position:"absolute",top:14,right:14,background:"rgba(0,0,0,0.4)",color:WHITE,fontWeight:800,fontSize:20,width:36,height:36,borderRadius:"50%",border:"none",cursor:"pointer"}}>×</button>
              <div style={{width:64,height:64,borderRadius:18,background:"rgba(255,255,255,0.95)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32}}>{s.emoji}</div>
              <span style={{color:"rgba(255,255,255,0.9)",fontWeight:800,fontSize:11,letterSpacing:2,textTransform:"uppercase"}}>{s.emoji} {s.label} malagasy</span>
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

function OrgaPage({ isMobile, orgas, events, user, userProfile, isAdmin, onOpenEvent, onOrgaUpdated, gastro = [], lieux = [], onGoto }) {
  const [famille,setFamille] = useState("evenementiel")
  const boutiquesArt = lieux.filter(l=>l.category==="boutique"||l.category==="artisanat")
  const eglises = lieux.filter(l=>l.category==="eglise")
  const FAMILLES = [
    ["evenementiel","🎪 Événementiel", orgas.length],
    ["gastro","🍽️ Gastronomie", gastro.length],
    ["boutiques","🛍️ Boutiques & artisanat", boutiquesArt.length],
    ["eglises","⛪ Églises", eglises.length],
  ]
  const totalPros = orgas.length + gastro.length + lieux.length
  const [filter,setFilter] = useState("Tous")
  const [q,setQ] = useState("")
  const [selected,setSelected] = useState(null)
  const types = ["Tous",...Object.keys(ORGA_COLORS)]
  const nq = q.trim().toLowerCase()
  const base = orgas.filter(o=>{
    const typeOk = filter==="Tous" || o.type===filter
    const qOk = !nq || [o.name,o.city,o.region,o.note].some(v=>(v||"").toLowerCase().includes(nq))
    return typeOk && qOk
  })
  // Épinglés puis fiches Pro en tête de l'annuaire
  const today = new Date().toISOString().slice(0,10)
  const isProOrga = o => o.plan==='pro' && (!o.plan_until||o.plan_until>=today)
  const rank = o => (o.featured?2:0)+(isProOrga(o)?1:0)
  const list = [...base].sort((a,b)=>rank(b)-rank(a))
  const initials = nm => nm.split(" ").filter(Boolean).map(w=>w[0]).slice(0,2).join("").toUpperCase()

  return (
    <div style={{maxWidth:900,margin:"0 auto",padding:isMobile?"20px 16px 60px":"32px 24px 80px"}}>
      <h2 style={{fontWeight:800,fontSize:isMobile?22:28,color:"#111",margin:"0 0 4px"}}>🎪 Organisateurs & associations</h2>
      <p style={{color:"#666",fontSize:14,margin:"0 0 16px"}}>La base des pros de la communauté malagasy en France — <b>{totalPros} structures recensées</b>. Ta structure manque ? Crée ton compte et réclame ta fiche !</p>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:18,background:WHITE,borderRadius:16,padding:8,boxShadow:"0 2px 10px rgba(0,0,0,0.06)"}}>
        {FAMILLES.map(([k,l,c])=>(
          <button key={k} onClick={()=>setFamille(k)} style={{flex:isMobile?"1 1 45%":1,background:famille===k?RED:"transparent",color:famille===k?WHITE:"#555",fontWeight:700,fontSize:12.5,padding:"10px 8px",borderRadius:12,border:"none",cursor:"pointer"}}>
            {l} <span style={{opacity:.7}}>· {c}</span>
          </button>
        ))}
      </div>

      {famille!=="evenementiel" && (()=>{
        const fam = famille==="gastro"
          ? {items:gastro, page:"gastro", label:"Gastronomie", emoji:g=>GASTRO_EMOJI[g.type]||"🍽️", grad:g=>GASTRO_GRAD[g.type]||"linear-gradient(135deg,#C8102E,#7a0a1c)", sub:g=>g.type+(g.city?" · "+g.city:"")}
          : famille==="boutiques"
          ? {items:boutiquesArt, page:"boutiques", label:"Boutiques & artisanat", emoji:l=>l.category==="artisanat"?"🧵":"🛍️", grad:l=>l.category==="artisanat"?"linear-gradient(135deg,#007A3D,#044d27)":"linear-gradient(135deg,#7a0a1c,#4a0611)", sub:l=>(l.denom||l.category)+(l.city?" · "+l.city:"")}
          : {items:eglises, page:"eglises", label:"Églises", emoji:()=>"⛪", grad:()=>"linear-gradient(135deg,#1565c0,#0C447C)", sub:l=>(l.denom||"")+(l.city?" · "+l.city:"")}
        return (
          <div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill, minmax(250px, 1fr))",gap:12,marginBottom:16}}>
              {fam.items.map(it=>(
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

      {famille==="evenementiel" && (<>
      <div style={{position:"relative",marginBottom:14}}>
        <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:15,color:"#aaa"}}>🔍</span>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Rechercher un organisateur, une association, une ville..." style={{width:"100%",border:"1.5px solid #e5e5e5",borderRadius:14,padding:"11px 14px 11px 40px",fontSize:14,outline:"none",boxSizing:"border-box",background:WHITE}}/>
      </div>

      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:18}}>
        {types.map(t=>(
          <button key={t} onClick={()=>setFilter(t)} style={{background:filter===t?RED:WHITE,color:filter===t?WHITE:"#444",fontWeight:700,fontSize:13,padding:"8px 16px",borderRadius:99,border:filter===t?"none":"1px solid #e0e0e0",cursor:"pointer"}}>
            {t==="Tous"?"Tous":`${ORGA_EMOJI[t]||""} ${t}`}
          </button>
        ))}
      </div>
      {list.length===0 && <p style={{color:"#bbb",fontSize:13,textAlign:"center",padding:"30px 0"}}>Aucun résultat pour « {q} »</p>}

      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill, minmax(270px, 1fr))",gap:14}}>
        {list.map(o=>{
          const col = ORGA_COLORS[o.type]||{bg:"#f5f5f5",color:"#555"}
          const grad = ORGA_GRAD[o.type]||"linear-gradient(135deg,#555,#333)"
          const isPro = o.plan==='pro' && (!o.plan_until || o.plan_until >= new Date().toISOString().slice(0,10))
          const count = events.filter(e=>{const org=(e.organizer||"").toLowerCase();const first=o.name.toLowerCase().split(/[ —-]+/).filter(w=>w.length>3)[0];return first&&org.includes(first)}).length
          return (
            <div key={o.id} onClick={()=>setSelected(o)} style={{background:WHITE,borderRadius:18,boxShadow:o.featured?"0 4px 18px rgba(184,134,11,0.3)":"0 3px 14px rgba(0,0,0,0.07)",border:o.featured?"1.5px solid #e6b31e":"1px solid #f0f0f0",overflow:"hidden",cursor:"pointer",display:"flex",flexDirection:"column"}}>
              <div style={{height:70,background:grad,position:"relative",display:"flex",alignItems:"center",padding:"0 16px"}}>
                <div style={{width:46,height:46,borderRadius:14,background:"rgba(255,255,255,0.92)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{ORGA_EMOJI[o.type]||"🎪"}</div>
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

      {selected && <OrgaDetail o={selected} isMobile={isMobile} user={user} userProfile={userProfile} isAdmin={isAdmin} events={events} onOpenEvent={onOpenEvent} onClose={()=>setSelected(null)} onUpdated={u=>{onOrgaUpdated(u);setSelected(u)}}/>}
    </div>
  )
}

function GastroDetail({ g, isMobile, onClose }) {
  const col = GASTRO_COLORS[g.type]||{bg:"#f5f5f5",color:"#555"}
  const initials = g.name.split(" ").filter(Boolean).map(w=>w[0]).slice(0,2).join("").toUpperCase()
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"flex-start",justifyContent:"center",zIndex:80,overflowY:"auto",padding:16}}>
      <div style={{background:WHITE,borderRadius:24,width:"100%",maxWidth:560,margin:"auto",boxShadow:"0 24px 80px rgba(0,0,0,0.3)",overflow:"hidden"}}>
        <div style={{position:"relative",height:isMobile?150:190,background:`linear-gradient(135deg, ${RED} 0%, #6e0a16 55%, ${GREEN} 140%)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:4,display:"flex"}}>
            <div style={{flex:1,background:WHITE}}/><div style={{flex:1,background:RED}}/><div style={{flex:1,background:GREEN}}/>
          </div>
          <button onClick={onClose} style={{position:"absolute",top:14,right:14,background:"rgba(0,0,0,0.4)",color:WHITE,fontWeight:800,fontSize:20,width:36,height:36,borderRadius:"50%",border:"none",cursor:"pointer"}}>×</button>
          <div style={{width:64,height:64,borderRadius:"50%",background:WHITE,color:col.color,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:22}}>{initials}</div>
          <span style={{color:"rgba(255,255,255,0.9)",fontWeight:800,fontSize:11,letterSpacing:2.5,textTransform:"uppercase"}}>🇲🇬 Gastronomie Malagasy</span>
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
            {g.fb && <a href={safeUrl(g.fb)} target="_blank" rel="noreferrer" style={{flex:1,minWidth:120,textAlign:"center",background:"#1565c0",color:WHITE,fontSize:13,fontWeight:700,padding:"11px 16px",borderRadius:12,textDecoration:"none"}}>📘 Facebook</a>}
            {g.insta && <a href={safeUrl(g.insta)} target="_blank" rel="noreferrer" style={{flex:1,minWidth:120,textAlign:"center",background:"#c2185b",color:WHITE,fontSize:13,fontWeight:700,padding:"11px 16px",borderRadius:12,textDecoration:"none"}}>📸 Instagram</a>}
            {g.tiktok && <a href={safeUrl(g.tiktok)} target="_blank" rel="noreferrer" style={{flex:1,minWidth:120,textAlign:"center",background:"#111",color:WHITE,fontSize:13,fontWeight:700,padding:"11px 16px",borderRadius:12,textDecoration:"none"}}>🎵 TikTok</a>}
          </div>
        </div>
      </div>
    </div>
  )
}

function GastroPage({ isMobile, gastro = initialGastro }) {
  const [filter,setFilter] = useState("Tous")
  const [regionFilter,setRegionFilter] = useState("Toutes")
  const [selected,setSelected] = useState(null)
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const types = ["Tous","Restaurant","Traiteur","Food truck"]
  const regions = ["Toutes",...[...new Set(gastro.map(g=>g.region).filter(Boolean))].sort(),"À localiser"]
  const list = gastro.filter(g=>{
    const typeOk   = filter==="Tous" || g.type===filter
    const regionOk = regionFilter==="Toutes" || (regionFilter==="À localiser" ? !g.region : g.region===regionFilter)
    return typeOk && regionOk
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
      <p style={{color:"#666",fontSize:14,margin:"0 0 20px"}}>Restaurants, traiteurs et food trucks de la communauté — {gastro.length} adresses</p>

      {/* Carte */}
      <div style={{position:"relative",borderRadius:20,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.08)",marginBottom:8}}>
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
            {r==="À localiser"?"❓ À localiser":r==="Toutes"?"Toutes":`📍 ${r}`}
          </button>
        ))}
      </div>
      {list.length===0 && (
        <div style={{textAlign:"center",padding:"32px 24px",background:WHITE,borderRadius:16,color:"#bbb",marginBottom:14}}>
          <p style={{fontWeight:700,margin:0}}>Aucune adresse pour ces filtres</p>
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
              {evs.length>(isMobile?1:2) && <span style={{fontSize:9,color:"#bbb",fontWeight:700}}>+{evs.length-(isMobile?1:2)}</span>}
            </div>
          )
        })}
      </div>
      <p style={{fontSize:11,color:"#bbb",textAlign:"center",marginTop:12}}>📅 Mis à jour automatiquement avec les événements du site</p>
    </div>
  )
}

function EventCard({ event, onSelect, user, onAuthRequired, isAdmin, onDelete }) {
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

  useEffect(()=>{
    fetchCount()
    if (user) { checkFav(); checkInterest() }
  },[user])

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
    if (fav) { await supabase.from('favorites').delete().eq('event_id',event.id).eq('user_id',user.id); setFav(false) }
    else { await supabase.from('favorites').insert({event_id:event.id,user_id:user.id}); setFav(true) }
  }

  const toggleInterest = async e => {
    e.stopPropagation()
    if (!user) { onAuthRequired(); return }
    if (interested) { await supabase.from('event_interests').delete().eq('event_id',event.id).eq('user_id',user.id); setInterested(false); setCount(c=>c-1) }
    else { await supabase.from('event_interests').insert({event_id:event.id,user_id:user.id}); setInterested(true); setCount(c=>c+1) }
  }

  return (
    <>
      <div onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
        style={{background:WHITE,borderRadius:20,overflow:"hidden",boxShadow:hover?"0 12px 40px rgba(0,0,0,0.15)":"0 2px 12px rgba(0,0,0,0.08)",transform:hover?"translateY(-4px)":"none",transition:"all .25s",cursor:"pointer",display:"flex",flexDirection:"column"}}>

        {/* Image */}
        <div onClick={()=>onSelect(event)} style={{position:"relative",height:180,overflow:"hidden"}}>
          {event.image
            ? <img src={event.image} alt="" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"top",transition:"transform .3s",transform:hover?"scale(1.05)":"scale(1)"}}/>
            : <BrandedCover event={event}/>}
          <FlagStripe/>
          <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,0.45) 0%,transparent 60%), linear-gradient(120deg,rgba(200,16,46,0.12) 0%,transparent 45%,rgba(0,122,61,0.12) 100%)"}}/>
          {/* Badges top-left */}
          <div style={{position:"absolute",top:10,left:10,display:"flex",flexDirection:"column",gap:4}}>
            {isNew(event.createdAt) && <span style={{background:"#ff6b00",color:WHITE,fontSize:10,fontWeight:800,padding:"3px 8px",borderRadius:99}}>🆕 NOUVEAU</span>}
            {cd && <span style={{background:cd.hot?RED:"rgba(0,0,0,0.6)",color:WHITE,fontSize:10,fontWeight:800,padding:"3px 8px",borderRadius:99}}>{cd.text}</span>}
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
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{background:event.price==="Gratuit"?"#e6f4ed":"#fde8ec",color:event.price==="Gratuit"?GREEN:RED,fontWeight:700,fontSize:12,padding:"3px 10px",borderRadius:99}}>{event.price||"Prix non renseigné"}</span>
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
          {event.ticketUrl && (
            <a href={safeUrl(event.ticketUrl)} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{background:RED,color:WHITE,fontWeight:700,fontSize:11,padding:"6px 12px",borderRadius:99,textDecoration:"none"}}>🎟️ Billets</a>
          )}
        </div>
        {isAdmin && (
          <div style={{padding:"0 16px 12px",display:"flex",gap:8}}>
            <button onClick={e=>{e.stopPropagation();onDelete&&onDelete(event.id)}} style={{background:"#fde8ec",color:RED,fontWeight:700,fontSize:11,padding:"5px 12px",borderRadius:99,border:"none",cursor:"pointer"}}>🗑️ Supprimer</button>
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

function EntraideSection({ event, user, onAuthRequired }) {
  const [items,setItems]             = useState([])
  const [unavailable,setUnavailable] = useState(false)
  const [catFilter,setCatFilter]     = useState("tous")
  const [showForm,setShowForm]       = useState(false)
  const [saving,setSaving]           = useState(false)
  const [form,setForm]               = useState({category:"trajet",type:"propose",city:"",places:1,note:""})

  useEffect(()=>{ fetchItems() },[])

  const fetchItems = async () => {
    let {data,error} = await supabase.from('entraide').select('*,profiles(username)').eq('event_id',event.id).order('created_at',{ascending:false})
    if (error) {
      const retry = await supabase.from('entraide').select('*').eq('event_id',event.id).order('created_at',{ascending:false})
      if (retry.error) { setUnavailable(true); return }
      data = retry.data
    }
    setItems(data||[])
  }

  const submit = async e => {
    e.preventDefault()
    if (!user) { onAuthRequired(); return }
    if (!form.city.trim()) return
    setSaving(true)
    const {error} = await supabase.from('entraide').insert({event_id:event.id,user_id:user.id,category:form.category,type:form.type,city:form.city.trim(),places:form.places,note:form.note.trim()})
    if (!error) { setForm({category:"trajet",type:"propose",city:"",places:1,note:""}); setShowForm(false); await fetchItems() }
    setSaving(false)
  }

  const remove = async id => { await supabase.from('entraide').delete().eq('id',id).eq('user_id',user.id); await fetchItems() }

  if (unavailable) return <p style={{fontSize:13,color:"#999",textAlign:"center",padding:"24px 0"}}>🤝 Le module entraide arrive très bientôt !</p>

  const shown = catFilter==="tous" ? items : items.filter(i=>i.category===catFilter)

  return (
    <div>
      <div style={{display:"flex",gap:6,marginBottom:14}}>
        {[["tous","Tous"],["trajet","🚗 Trajets"],["hebergement","🛏️ Hébergements"]].map(([k,l])=>(
          <button key={k} onClick={()=>setCatFilter(k)} style={{background:catFilter===k?"#333":WHITE,color:catFilter===k?WHITE:"#555",fontWeight:700,fontSize:12,padding:"6px 12px",borderRadius:99,border:catFilter===k?"none":"1px solid #e0e0e0",cursor:"pointer"}}>{l}</button>
        ))}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:14}}>
        {shown.map(r=>{
          const cat = ENTRAIDE_CATS[r.category]||ENTRAIDE_CATS.trajet
          return (
            <div key={r.id} style={{display:"flex",alignItems:"center",gap:12,background:"#f8f8f8",borderRadius:14,padding:"12px 14px"}}>
              <span style={{fontSize:20}}>{r.type==="propose"?cat.emoji:"🙋"}</span>
              <div style={{minWidth:0,flex:1}}>
                <p style={{fontSize:13,fontWeight:700,color:"#111",margin:0}}>
                  {r.profiles?.username||"Un membre"} {r.type==="propose"?"propose":"cherche"} · {cat.label.toLowerCase()} · {r.places} {cat.placeLbl}{r.places>1?"s":""}
                </p>
                <p style={{fontSize:12,color:"#777",margin:0}}>{r.category==="trajet"?"Depuis":"À"} {r.city}{r.note?` · ${r.note}`:""}</p>
              </div>
              <span style={{fontSize:11,fontWeight:700,background:r.type==="propose"?"#e6f4ed":"#FAECE7",color:r.type==="propose"?GREEN:"#712B13",padding:"3px 10px",borderRadius:99,whiteSpace:"nowrap"}}>{r.type==="propose"?"Propose":"Cherche"}</span>
              {user && r.user_id===user.id && <button onClick={()=>remove(r.id)} style={{background:"none",border:"none",color:"#bbb",cursor:"pointer",fontSize:14}}>🗑️</button>}
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
            <button type="submit" disabled={saving} style={{background:GREEN,color:WHITE,fontWeight:700,fontSize:13,padding:"9px 18px",borderRadius:99,border:"none",cursor:"pointer"}}>{saving?"...":"Publier"}</button>
            <button type="button" onClick={()=>setShowForm(false)} style={{background:"none",color:"#888",fontWeight:700,fontSize:13,padding:"9px 12px",border:"none",cursor:"pointer"}}>Annuler</button>
          </div>
          <p style={{fontSize:11,color:"#aaa",margin:0}}>💡 Organisez les détails dans le fil « Qui y va ? » — évitez de publier votre numéro en clair.</p>
        </form>
      )}
    </div>
  )
}

function EventDetail({ event, onClose, user, onAuthRequired, isAdmin }) {
  const [showShare,setShowShare]   = useState(false)
  const [showReminder,setReminder] = useState(false)
  const [interested,setInterested] = useState(false)
  const [fav,setFav]               = useState(false)
  const [count,setCount]           = useState(0)
  const [tab,setTab]               = useState("infos")
  const isMobile                   = useIsMobile()
  const isYoutube = url => url&&(url.includes('youtube')||url.includes('youtu.be'))

  useEffect(()=>{
    fetchCount()
    if (user) { checkFav(); checkInterest() }
  },[user])

  const fetchCount = async () => { const {count:c} = await supabase.from('event_interests').select('*',{count:'exact',head:true}).eq('event_id',event.id); setCount(c||0) }
  const checkFav = async () => { const {data} = await supabase.from('favorites').select('id').eq('event_id',event.id).eq('user_id',user.id).maybeSingle(); setFav(!!data) }
  const checkInterest = async () => { const {data} = await supabase.from('event_interests').select('id').eq('event_id',event.id).eq('user_id',user.id).maybeSingle(); setInterested(!!data) }

  const toggleFav = async () => {
    if (!user) { onAuthRequired(); return }
    if (fav) { await supabase.from('favorites').delete().eq('event_id',event.id).eq('user_id',user.id); setFav(false) }
    else { await supabase.from('favorites').insert({event_id:event.id,user_id:user.id}); setFav(true) }
  }

  const toggleInterest = async () => {
    if (!user) { onAuthRequired(); return }
    if (interested) { await supabase.from('event_interests').delete().eq('event_id',event.id).eq('user_id',user.id); setInterested(false); setCount(c=>c-1) }
    else { await supabase.from('event_interests').insert({event_id:event.id,user_id:user.id}); setInterested(true); setCount(c=>c+1) }
  }

  return (
    <>
      <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"flex-start",justifyContent:"center",zIndex:80,overflowY:"auto",padding:"16px"}}>
        <div style={{background:WHITE,borderRadius:24,width:"100%",maxWidth:680,margin:"auto",boxShadow:"0 24px 80px rgba(0,0,0,0.3)",overflow:"hidden"}}>
          {/* Hero image */}
          <div style={{position:"relative",height:isMobile?200:300}}>
            {event.image
              ? <img src={event.image} alt="" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"top"}}/>
              : <BrandedCover event={event} big/>}
            <FlagStripe/>
            <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,0.6) 0%,transparent 50%), linear-gradient(120deg,rgba(200,16,46,0.12) 0%,transparent 45%,rgba(0,122,61,0.12) 100%)"}}/>
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

            {tab==="people" && <EventPeople event={event} user={user} onAuthRequired={onAuthRequired} interested={interested} toggleInterest={toggleInterest} count={count}/>}
            {tab==="rides" && <EntraideSection event={event} user={user} onAuthRequired={onAuthRequired}/>}

            {tab==="infos" && (<>
            {/* Info grid */}
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,marginBottom:20}}>
              {[
                {emoji:"📅",label:"Date",val:fmtDate(event.date)},
                {emoji:"📍",label:"Lieu",val:event.location},
                {emoji:"👤",label:"Organisateur",val:event.organizer},
                {emoji:"💰",label:"Prix",val:event.price||"Non renseigné"},
              ].map(({emoji,label,val})=>(
                <div key={label} style={{background:"#f8f8f8",borderRadius:14,padding:"12px 14px"}}>
                  <p style={{fontSize:11,fontWeight:700,color:"#999",textTransform:"uppercase",margin:"0 0 2px"}}>{emoji} {label}</p>
                  <p style={{fontSize:14,fontWeight:600,color:"#333",margin:0}}>{val}</p>
                </div>
              ))}
            </div>

            {count>0 && <p style={{fontSize:13,color:"#888",marginBottom:16}}>👀 {count} personne{count>1?"s":""} intéressée{count>1?"s":""}</p>}

            {/* Description */}
            {event.description && <p style={{fontSize:14,color:"#555",lineHeight:1.6,marginBottom:20}}>{event.description}</p>}

            {/* Map */}
            <div style={{borderRadius:16,overflow:"hidden",marginBottom:20,height:200}}>
              <iframe title="map" src={`https://maps.google.com/maps?q=${encodeURIComponent(event.location)}&output=embed`} style={{width:"100%",height:"100%",border:"none"}}/>
            </div>

            {/* Media */}
            {event.mediaUrls?.length>0 && (
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
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:20}}>
              <button onClick={toggleInterest} style={{background:interested?"#e6f4ed":RED,color:interested?GREEN:WHITE,fontWeight:700,fontSize:13,padding:"10px 18px",borderRadius:12,border:"none",cursor:"pointer"}}>
                {interested?"✓ Intéressé(e)":"👀 Je suis intéressé(e)"}
              </button>
              <button onClick={()=>downloadICS(event)} style={{background:"#f5f5f5",color:"#333",fontWeight:700,fontSize:13,padding:"10px 14px",borderRadius:12,border:"none",cursor:"pointer"}}>📅 Calendrier</button>
              {!isPast(event.date) && <button onClick={()=>setReminder(true)} style={{background:"#f5f5f5",color:"#333",fontWeight:700,fontSize:13,padding:"10px 14px",borderRadius:12,border:"none",cursor:"pointer"}}>🔔 Rappel</button>}
              <button onClick={()=>setShowShare(true)} style={{background:"#f5f5f5",color:"#333",fontWeight:700,fontSize:13,padding:"10px 14px",borderRadius:12,border:"none",cursor:"pointer"}}>📤 Partager</button>
              {event.ticketUrl && <a href={safeUrl(event.ticketUrl)} target="_blank" rel="noreferrer" style={{background:GREEN,color:WHITE,fontWeight:700,fontSize:13,padding:"10px 18px",borderRadius:12,textDecoration:"none"}}>🎟️ Acheter mes billets</a>}
            </div>
            </>)}
          </div>
        </div>
      </div>
      {showShare && <ShareMenu ev={event} onClose={()=>setShowShare(false)}/>}
      {showReminder && <ReminderModal ev={event} onClose={()=>setReminder(false)}/>}
    </>
  )
}

/* ── AdminPanel ───────────────────────────────────── */
function AdminPanel({ events, setEvents, videos, setVideos, gastro, setGastro, orgas, setOrgas, lieux, setLieux, onClose }) {
  const GASTRO_EMPTY = {name:"",type:"Restaurant",region:"",city:"",address:"",phone:"",fb:"",insta:"",tiktok:"",contact:"",note:"",lat:null,lng:null,owner_username:"",plan:"free"}
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
  const [bannerText,setBannerText] = useState("")
  const [bannerSaved,setBannerSaved] = useState(false)
  const [editId,setEditId]     = useState(null)
  const [editForm,setEditForm] = useState({})
  const [showVForm,setShowVForm] = useState(false)
  const [vForm,setVForm]       = useState({title:"",youtubeUrl:"",thumbnail:"",city:"",date:"",description:"",isTeaser:false,type:"aftermovie",views:0})

  useEffect(()=>{ loadTab(tab) },[tab])

  const loadTab = async t => {
    if (t==="orgas") loadClaims()
    if (t==="dashboard") {
      const [
        {count:members},{count:posts},{count:cmts},{count:interests},
        {count:messages},{count:follows},{count:rems}
      ] = await Promise.all([
        supabase.from('profiles').select('*',{count:'exact',head:true}),
        supabase.from('posts').select('*',{count:'exact',head:true}),
        supabase.from('post_comments').select('*',{count:'exact',head:true}),
        supabase.from('event_interests').select('*',{count:'exact',head:true}),
        supabase.from('messages').select('*',{count:'exact',head:true}),
        supabase.from('follows').select('*',{count:'exact',head:true}),
        supabase.from('email_reminders').select('*',{count:'exact',head:true}),
      ])
      setStats({members,posts,cmts,interests,messages,follows,rems,evts:events.length})
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
    } else if (t==="banner") {
      const {data} = await supabase.from('site_settings').select('value').eq('key','banner').maybeSingle()
      setBannerText(data?.value||"")
    }
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
    const payload = {title:s.title,date:s.date,city:s.city,location:s.location,category:s.category,price:s.price,organizer:s.organizer,ticketUrl:s.ticket_url,image:s.image,description:s.description,mediaUrls:[],createdAt:new Date().toISOString()}
    const {data,error} = await supabase.from('events').insert(payload).select().single()
    if (error) { alert("⚠️ "+error.message); return }
    setEvents(e=>[...e,data])
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
    setEvents(list=>list.map(x=>x.id===ev.id?{...x,featured:val}:x))
    await adminSave(supabase.from('events').update({featured:val}).eq('id',ev.id))
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

  const banUser   = async (id,banned) => { await supabase.from('profiles').update({is_banned:!banned}).eq('id',id); setUsers(u=>u.map(p=>p.id===id?{...p,is_banned:!banned}:p)) }
  const delPost   = async id => { await supabase.from('posts').delete().eq('id',id); setAllPosts(p=>p.filter(x=>x.id!==id)) }
  const delCmt    = async id => { await supabase.from('post_comments').delete().eq('id',id); setAllCmts(c=>c.filter(x=>x.id!==id)) }
  const delEvent  = async id => { setEvents(e=>e.filter(x=>x.id!==id)); await adminSave(supabase.from('events').delete().eq('id',id)) }
  const delVideo  = async id => { setVideos(v=>v.filter(x=>x.id!==id)); await adminSave(supabase.from('videos').delete().eq('id',id)) }
  const saveEvent = async () => {
    const payload = {...editForm}; delete payload.id
    if (editId==="new") {
      const {data,error} = await supabase.from('events').insert({...payload,createdAt:new Date().toISOString()}).select().single()
      if (error) { alert("⚠️ Ajout local seulement ("+error.message+")"); setEvents(e=>[...e,{...payload,id:Date.now()}]) }
      else setEvents(e=>[...e,data])
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

  const TABS = [{id:"dashboard",l:"📊 Dashboard"},{id:"revenus",l:"💰 Forfaits"},{id:"submissions",l:"📥 Soumissions"},{id:"reports",l:"🚩 Signalements"},{id:"banner",l:"📢 À la une"},{id:"users",l:"👥 Membres"},{id:"events",l:"📅 Événements"},{id:"gastro",l:"🍽️ Gastro"},{id:"orgas",l:"🎪 Orgas"},{id:"lieux",l:"⛪ Lieux"},{id:"posts",l:"📝 Posts"},{id:"videos",l:"🎬 Vidéos"},{id:"comments",l:"💬 Commentaires"},{id:"entraide",l:"🤝 Entraide"},{id:"actus",l:"📣 Actus orgas"},{id:"reminders",l:"🔔 Rappels"}]

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
      <div style={{background:RED,padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <h2 style={{color:WHITE,fontWeight:800,fontSize:18,margin:0}}>🔓 Administration — Malagasy Events</h2>
        <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",color:WHITE,fontWeight:800,fontSize:20,padding:"2px 12px",borderRadius:99,border:"none",cursor:"pointer"}}>×</button>
      </div>
      {/* Tabs */}
      <div style={{display:"flex",background:WHITE,borderBottom:"2px solid #f0f0f0",overflowX:"auto",flexShrink:0}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"12px 16px",border:"none",cursor:"pointer",fontWeight:700,fontSize:12,background:"none",color:tab===t.id?RED:"#888",borderBottom:tab===t.id?`3px solid ${RED}`:"3px solid transparent",whiteSpace:"nowrap"}}>
            {t.l}
          </button>
        ))}
      </div>
      {/* Content */}
      <div style={{flex:1,overflowY:"auto",padding:24}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>

          {/* DASHBOARD */}
          {tab==="dashboard" && (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:16}}>
              <StatCard n={stats.members} l="Membres" emoji="👥"/>
              <StatCard n={stats.evts} l="Événements" emoji="📅"/>
              <StatCard n={stats.posts} l="Posts" emoji="📝"/>
              <StatCard n={stats.cmts} l="Commentaires" emoji="💬"/>
              <StatCard n={stats.interests} l="Intérêts" emoji="👀"/>
              <StatCard n={stats.messages} l="Messages" emoji="✉️"/>
              <StatCard n={stats.follows} l="Abonnements" emoji="🔗"/>
              <StatCard n={stats.rems} l="Rappels" emoji="🔔"/>
              <StatCard n={gastro.length} l="Gastronomie" emoji="🍽️"/>
              <StatCard n={orgas.length} l="Organisateurs" emoji="🎪"/>
              <StatCard n={lieux.length} l="Lieux & boutiques" emoji="🛍️"/>
              <StatCard n={videos.length} l="Vidéos" emoji="🎬"/>
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
                  <div style={{flex:1,minWidth:0}}><p style={{fontWeight:700,fontSize:13,margin:0}}>{e.title}</p><p style={{fontSize:11,color:"#bbb",margin:0}}>{fmtShort(e.date)} · {e.city}</p></div>
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
                  <input value={editForm.image||""} onChange={e=>setEditForm({...editForm,image:e.target.value})} placeholder="URL affiche/image" style={inp}/>
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
                      <input value={editForm.image||""} onChange={e=>setEditForm({...editForm,image:e.target.value})} placeholder="URL image" style={inp}/>
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
export default function App() {
  const [events,setEvents]             = useState(initialEvents)
  const [videos,setVideos]             = useState(initialVideos)
  const [gastro,setGastro]             = useState(initialGastro)
  const [orgas,setOrgas]               = useState(initialOrgas)
  const [lieux,setLieux]               = useState([])
  const [user,setUser]                 = useState(null)
  const [userProfile,setUserProfile]   = useState(null)
  const [showAuth,setShowAuth]         = useState(false)
  const [showProfile,setShowProfile]   = useState(false)
  const [showMessages,setShowMessages] = useState(false)
  const [msgTarget,setMsgTarget]       = useState({id:null,name:""})
  const [page,setPage]                 = useState("home") // home | aftermovies | community
  const [mobileMenu,setMobileMenu]     = useState(false)
  const [unreadMsgs,setUnreadMsgs]     = useState(0)
  const [communityStats,setCStats]     = useState({members:0,events:0})
  const [cityFilter,setCityFilter]     = useState("Toutes")
  const [catFilter,setCatFilter]       = useState("Toutes")
  const [search,setSearch]             = useState("")
  const [showForm,setShowForm]         = useState(false)
  const [form,setForm]                 = useState(EMPTY_FORM)
  const [mediaInput,setMediaInput]     = useState("")
  const [banner,setBanner]             = useState("")
  const [showSubmit,setShowSubmit]     = useState(false)
  const [homeView,setHomeView]         = useState("list") // "list" | "calendar"
  const [showPast,setShowPast]         = useState(false)
  const [isAdmin,setIsAdmin]           = useState(false)
  const [showLogin,setShowLogin]       = useState(false) // modal "ce compte n'est pas admin"
  const [logoClicks,setLogoClicks]     = useState(0)
  const [selectedEvent,setSelectedEvent] = useState(null)
  const [showOnboarding,setOnboarding] = useState(!localStorage.getItem('mev_visited'))
  const [showInterestOnboarding,setShowInterestOnboarding] = useState(false)
  const [showLoginIntent,setShowLoginIntent]               = useState(false)
  const [sessionCats,setSessionCats]                       = useState([]) // filtre temporaire de session
  const [showAdmin,setShowAdmin]       = useState(false)
  const [viewingProfile,setViewingProfile] = useState(null) // {id, name}
  const [pendingSlug,setPendingSlug]   = useState(null)
  const isMobile                       = useIsMobile()
  const compactNav                     = useIsMobile(1024) // barre repliée en menu tant qu'il n'y a pas la place pour tous les onglets

  /* ── Admin = compte Supabase officiel connecté (la sécurité réelle est côté serveur, via RLS) ── */
  useEffect(()=>{ setIsAdmin(userProfile?.username===ADMIN_USERNAME) },[userProfile])

  /* ── SEO : routing par URL, méta, données structurées ── */
  useEffect(()=>{
    const applyRoute = () => {
      const path = window.location.pathname
      if (path.startsWith("/evenement/")) { setPage("home"); setPendingSlug(decodeURIComponent(path.split("/")[2]||"")) }
      else { const k = Object.keys(PAGE_PATHS).find(k=>PAGE_PATHS[k]===path); setPage(k||"home"); setSelectedEvent(null) }
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

  useEffect(()=>{ // URL + méta par page
    if (selectedEvent) return
    const path = PAGE_PATHS[page]||"/"
    if (window.location.pathname!==path) window.history.pushState({},"",path)
    const [t,d] = PAGE_META[page]||PAGE_META.home
    setMeta(t,d)
  },[page,selectedEvent])

  useEffect(()=>{ // URL + méta + JSON-LD de l'événement ouvert
    if (selectedEvent) {
      const path = "/evenement/"+slugify(selectedEvent.title)
      if (window.location.pathname!==path) window.history.pushState({},"",path)
      setMeta(`${selectedEvent.title} — ${fmtShort(selectedEvent.date)} · ${selectedEvent.city} | Malagasy Events`, (selectedEvent.description||selectedEvent.title).slice(0,160))
      setJsonLd("ld-event", {"@context":"https://schema.org", ...eventJsonLd(selectedEvent)})
    } else setJsonLd("ld-event", null)
  },[selectedEvent])

  useEffect(()=>{ // Données structurées Organisation + Site (une fois)
    setJsonLd("ld-org", {"@context":"https://schema.org","@type":"Organization",
      name:"Malagasy Events", url:SITE_URL, logo:SITE_URL+"/og-image.png",
      description:"L'agenda des événements de la communauté malagasy en France."})
    setJsonLd("ld-website", {"@context":"https://schema.org","@type":"WebSite",
      name:"Malagasy Events", url:SITE_URL,
      potentialAction:{"@type":"SearchAction", target:SITE_URL+"/?q={search_term_string}", "query-input":"required name=search_term_string"}})
  },[])

  useEffect(()=>{ // JSON-LD listes (événements à venir + annuaire gastro)
    const upcomingLd = events.filter(e=>!isPast(e.date))
    setJsonLd("ld-events", upcomingLd.length ? {"@context":"https://schema.org","@type":"ItemList",
      itemListElement: upcomingLd.map((e,i)=>({"@type":"ListItem",position:i+1,item:eventJsonLd(e)}))} : null)
    setJsonLd("ld-gastro", gastro.length ? {"@context":"https://schema.org","@type":"ItemList",
      itemListElement: gastro.map((g,i)=>({"@type":"ListItem",position:i+1,item:{
        "@type": g.type==="Restaurant"?"Restaurant":"FoodEstablishment", name:g.name, servesCuisine:"Malgache",
        ...(g.address?{address:{"@type":"PostalAddress",streetAddress:g.address,addressCountry:"FR"}}:{}),
        ...(g.phone?{telephone:g.phone}:{}), ...(g.fb?{sameAs:[g.fb,g.insta].filter(Boolean)}:{}),
        ...(g.lat?{geo:{"@type":"GeoCoordinates",latitude:g.lat,longitude:g.lng}}:{}),
      }}))} : null)
  },[events,gastro])

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{ setUser(session?.user??null); if(session?.user) fetchProfile(session.user.id) })
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_e,session)=>{ setUser(session?.user??null); if(session?.user) fetchProfile(session.user.id); else setUserProfile(null) })
    fetchStats()
    loadDb()
    return()=>subscription.unsubscribe()
  },[])

  useEffect(()=>{ if(user) fetchUnread() },[user])

  const loadDb = async () => {
    const [ev,ga,vi] = await Promise.all([
      supabase.from('events').select('*'),
      supabase.from('gastro').select('*').order('name'),
      supabase.from('videos').select('*').order('id'),
    ])
    if (!ev.error && ev.data?.length) setEvents(ev.data)
    if (!ga.error && ga.data?.length) setGastro(ga.data)
    const og = await supabase.from('organisateurs').select('*').order('id')
    if (!og.error && og.data?.length) setOrgas(og.data)
    if (!vi.error && vi.data?.length) setVideos(vi.data)
    const bn = await supabase.from('site_settings').select('value').eq('key','banner').maybeSingle()
    if (bn.data?.value) setBanner(bn.data.value)
    const lx = await supabase.from('lieux').select('*').order('id')
    if (!lx.error && lx.data) setLieux(lx.data)
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
    const {count} = await supabase.from('messages').select('*',{count:'exact',head:true}).eq('recipient_id',user.id).eq('read',false)
    setUnreadMsgs(count||0)
  }

  const handleSignOut = async () => { await supabase.auth.signOut(); setUser(null); setUserProfile(null) }

  const handleLogoClick = () => { const n=logoClicks+1; setLogoClicks(n); if(n>=3){ setLogoClicks(0); if(isAdmin) setShowAdmin(true); else if(user) setShowLogin(true); else setShowAuth(true) } }

  const userCats = userProfile?.categories||[]

  const applyFilters = list => {
    const q = search.toLowerCase()
    const activeCats = catFilter==="PourToi" ? (sessionCats.length>0 ? sessionCats : userCats) : null
    return list.filter(e=>{
      const cityOk = cityFilter==="Toutes"||e.city===cityFilter
      const catOk  = activeCats ? activeCats.includes(e.category) : (catFilter==="Toutes"||e.category===catFilter)
      const qOk    = !q||e.title.toLowerCase().includes(q)||e.location.toLowerCase().includes(q)||(e.organizer||"").toLowerCase().includes(q)
      return cityOk&&catOk&&qOk
    })
  }

  const upcoming = applyFilters(events.filter(e=>!isPast(e.date))).sort((a,b)=>new Date(a.date)-new Date(b.date))
  const past     = applyFilters(events.filter(e=>isPast(e.date))).sort((a,b)=>new Date(b.date)-new Date(a.date))

  const handleSubmit = async e => {
    e.preventDefault()
    const payload = {...form, createdAt:new Date().toISOString()}
    delete payload.id
    const {data,error} = await supabase.from('events').insert(payload).select().single()
    if (error) {
      alert("⚠️ Événement ajouté localement seulement (" + error.message + ").\nConnecte-toi avec le compte officiel pour le rendre permanent.")
      setEvents([...events,{...payload,id:Date.now()}])
    } else setEvents([...events,data])
    setForm(EMPTY_FORM); setMediaInput(""); setShowForm(false)
  }

  const addMedia = () => { if(mediaInput.trim()){setForm({...form,mediaUrls:[...(form.mediaUrls||[]),mediaInput.trim()]});setMediaInput("")} }
  const removeMedia = i => setForm({...form,mediaUrls:form.mediaUrls.filter((_,idx)=>idx!==i)})
  const deleteEvent = async id => { setEvents(ev=>ev.filter(e=>e.id!==id)); await adminSave(supabase.from('events').delete().eq('id',id)) }

  const openMsg = (recipientId, recipientName) => { setMsgTarget({id:recipientId,name:recipientName}); setShowMessages(true) }

  const FilterBtn = ({label,active,onClick}) => (
    <button onClick={onClick} style={{padding:"5px 14px",borderRadius:99,fontSize:13,fontWeight:600,cursor:"pointer",border:"none",background:active?RED:WHITE,color:active?WHITE:"#555",boxShadow:active?`0 2px 8px ${RED}55`:"0 1px 4px rgba(0,0,0,0.08)",whiteSpace:"nowrap"}}>
      {label}
    </button>
  )

  const inp = {width:"100%",border:"1.5px solid #e5e5e5",borderRadius:12,padding:"9px 12px",fontSize:13,outline:"none",boxSizing:"border-box"}
  const lbl = {fontSize:13,fontWeight:600,color:"#444",display:"block",marginBottom:6}

  // After-movies et Communauté réservés aux membres connectés
  const navItems = [
    {key:"home",label:"🏠 Accueil"},
    ...(user ? [{key:"aftermovies",label:"🎬 After-movies"}] : []),
    {key:"gastro",label:"🍽️ Gastronomie"},
    {key:"orgas",label:"🎪 Organisateurs"},
    {key:"eglises",label:"⛪ Églises"},
    {key:"boutiques",label:"🛍️ Boutiques & artisanat"},
    ...(user ? [{key:"community",label:"👥 Communauté"}] : []),
    {key:"pro",label:"💎 Pro"},
  ]

  const dismissOnboarding = () => { localStorage.setItem('mev_visited','1'); setOnboarding(false) }

  return (
    <div style={{minHeight:"100vh",background:"#f6f6f6",fontFamily:"system-ui,sans-serif"}}>

      {/* ── BANDEAU D'ANNONCE ── */}
      {banner && (
        <div style={{background:"#111",color:WHITE,padding:"9px 16px",fontSize:13,fontWeight:700,textAlign:"center",lineHeight:1.4}}>{banner}</div>
      )}

      {/* ── HEADER ── */}
      <header style={{background:RED,padding:isMobile?"12px 16px":"14px 24px",boxShadow:"0 2px 12px rgba(0,0,0,0.15)",position:"sticky",top:0,zIndex:60}}>
        <div style={{maxWidth:1120,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
          <div onClick={handleLogoClick} style={{cursor:"default",minWidth:0,flexShrink:1}}>
            <h1 style={{color:WHITE,fontWeight:800,fontSize:isMobile?17:22,margin:0,whiteSpace:"nowrap"}}>🇲🇬 Malagasy Events</h1>
            {!compactNav && <p style={{color:"rgba(255,255,255,0.75)",fontSize:12,margin:"2px 0 0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>La communauté malagasy en France</p>}
          </div>

          {/* Nav desktop */}
          {!compactNav && (
            <div style={{display:"flex",gap:2,flexShrink:0}}>
              {navItems.map(n=>(
                <button key={n.key} onClick={()=>setPage(n.key)} style={{background:page===n.key?"rgba(255,255,255,0.25)":"transparent",color:WHITE,fontWeight:700,fontSize:13,padding:"8px 12px",borderRadius:10,border:"none",cursor:"pointer",whiteSpace:"nowrap"}}>
                  {n.label}
                </button>
              ))}
            </div>
          )}

          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {isAdmin && (
              <button onClick={()=>setShowAdmin(true)} style={{background:WHITE,color:RED,fontWeight:700,fontSize:12,padding:"8px 14px",borderRadius:12,border:"none",cursor:"pointer"}}>🔓 Admin</button>
            )}
            {user && (
              <button onClick={()=>setShowMessages(true)} style={{background:"rgba(255,255,255,0.15)",color:WHITE,fontWeight:700,fontSize:13,padding:"7px 10px",borderRadius:99,border:"none",cursor:"pointer",position:"relative"}}>
                💬
                {unreadMsgs>0 && <span style={{position:"absolute",top:-4,right:-4,background:"#ff3b30",color:WHITE,fontSize:9,fontWeight:800,width:16,height:16,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>{unreadMsgs}</span>}
              </button>
            )}
            {user ? (
              <div onClick={()=>setShowProfile(true)} style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.15)",borderRadius:99,padding:"6px 10px 6px 6px",cursor:"pointer"}}>
                <div style={{width:26,height:26,borderRadius:"50%",background:WHITE,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
                  {userProfile?.avatar_url ? <img src={userProfile.avatar_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <span style={{color:RED,fontWeight:800,fontSize:12}}>{(userProfile?.username||user.email)[0].toUpperCase()}</span>}
                </div>
                {!isMobile && <span style={{color:WHITE,fontSize:12,fontWeight:600}}>{userProfile?.username||user.email.split("@")[0]}</span>}
                {userProfile?.is_member && <span style={{background:GREEN,color:WHITE,fontSize:8,fontWeight:800,padding:"2px 5px",borderRadius:99}}>M</span>}
                <span style={{color:"rgba(255,255,255,0.6)",fontSize:11}}>⚙️</span>
              </div>
            ) : (
              <button onClick={()=>setShowAuth(true)} style={{background:WHITE,color:RED,fontWeight:700,fontSize:12,padding:"8px 14px",borderRadius:99,border:"none",cursor:"pointer"}}>Se connecter</button>
            )}
            {/* Hamburger mobile */}
            {compactNav && (
              <button onClick={()=>setMobileMenu(m=>!m)} style={{background:"rgba(255,255,255,0.15)",color:WHITE,fontWeight:800,fontSize:18,padding:"6px 10px",borderRadius:10,border:"none",cursor:"pointer"}}>☰</button>
            )}
          </div>
        </div>

        {/* Mobile nav dropdown */}
        {compactNav && mobileMenu && (
          <div style={{maxWidth:1120,margin:"12px auto 0",display:"flex",flexDirection:"column",gap:4}}>
            {navItems.map(n=>(
              <button key={n.key} onClick={()=>{setPage(n.key);setMobileMenu(false)}} style={{background:page===n.key?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.1)",color:WHITE,fontWeight:700,fontSize:14,padding:"12px 16px",borderRadius:12,border:"none",cursor:"pointer",textAlign:"left"}}>
                {n.label}
              </button>
            ))}
            {isAdmin && (
              <button onClick={()=>{setShowAdmin(true);setMobileMenu(false)}} style={{background:"rgba(255,255,255,0.2)",color:WHITE,fontWeight:700,fontSize:14,padding:"12px 16px",borderRadius:12,border:"none",cursor:"pointer",textAlign:"left"}}>🔓 Administration</button>
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
      {showOnboarding && page==="home" && (
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
        <GastroPage isMobile={isMobile} gastro={gastro}/>
      )}

      {page==="pro" && (
        <ProPage isMobile={isMobile} user={user} onAuthRequired={()=>setShowAuth(true)}/>
      )}

      {page==="orgas" && (
        <OrgaPage isMobile={isMobile} orgas={orgas} events={events} user={user} userProfile={userProfile} isAdmin={isAdmin} onOpenEvent={ev=>setSelectedEvent(ev)} onOrgaUpdated={u=>setOrgas(list=>list.map(x=>x.id===u.id?{...x,...u}:x))} gastro={gastro} lieux={lieux} onGoto={k=>setPage(k)}/>
      )}

      {page==="eglises" && (
        <LieuxPage isMobile={isMobile} page="eglise" lieux={lieux}/>
      )}

      {(page==="boutiques"||page==="artisanat") && (
        <LieuxPage isMobile={isMobile} page="shopping" lieux={lieux}/>
      )}

      {page==="community" && (
        !user ? <LoginGate title="👥 Communauté réservée aux membres" text="Connecte-toi pour échanger, publier et rencontrer la communauté malagasy." onLogin={()=>setShowAuth(true)}/> :
        <div style={{maxWidth:900,margin:"0 auto"}}>
          <div style={{padding:isMobile?"16px 0 0":"32px 0 0",textAlign:"center",paddingBottom:0}}>
            <h2 style={{fontWeight:900,fontSize:isMobile?20:28,color:"#111",margin:"0 0 4px"}}>👥 Communauté Malagasy</h2>
            <p style={{fontSize:14,color:"#888",margin:"0 0 20px"}}>Échangez, partagez, et rencontrez d'autres membres 🇲🇬</p>
          </div>
          <CommunityFeed user={user} userProfile={userProfile} isAdmin={isAdmin} onAuthRequired={()=>setShowAuth(true)} onMessage={openMsg} onProfileClick={(id,name)=>setViewingProfile({id,name})} onOpenEvent={ev=>setSelectedEvent(ev)} events={events}/>
        </div>
      )}

      {page==="home" && (
        <>
          {/* HERO */}
          <div style={{background:"linear-gradient(135deg,#C8102E,#a00d24)",padding:isMobile?"32px 16px":"48px 24px",textAlign:"center"}}>
            <h2 style={{color:WHITE,fontWeight:900,fontSize:isMobile?22:32,margin:"0 0 8px"}}>Ne rate plus aucun événement 🎪</h2>
            <p style={{color:"rgba(255,255,255,0.8)",fontSize:isMobile?13:16,margin:"0 0 24px"}}>La communauté malagasy de France réunie en un seul endroit</p>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un événement, une ville..."
              style={{maxWidth:420,width:"100%",padding:"12px 20px",borderRadius:99,border:"none",fontSize:14,outline:"none",boxShadow:"0 4px 16px rgba(0,0,0,0.15)"}}/>
            {!showOnboarding && (
              <div style={{display:"flex",justifyContent:"center",gap:isMobile?10:20,marginTop:18,flexWrap:"wrap"}}>
                <span style={{color:"rgba(255,255,255,0.9)",fontSize:13,fontWeight:600}}>📅 Events vérifiés</span>
                <span style={{color:"rgba(255,255,255,0.9)",fontSize:13,fontWeight:600}}>🤝 Partout en France</span>
                <span style={{color:"rgba(255,255,255,0.9)",fontSize:13,fontWeight:600}}>📤 Partage en 1 clic</span>
              </div>
            )}
          </div>

          {/* FILTRES */}
          <div style={{maxWidth:900,margin:"0 auto",padding:isMobile?"16px 12px 0":"24px 24px 0"}}>
            <div style={{marginBottom:12}}>
              <p style={{fontSize:11,fontWeight:700,color:"#999",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Ville</p>
              <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
                {CITIES.map(c=><FilterBtn key={c} label={c} active={cityFilter===c} onClick={()=>setCityFilter(c)}/>)}
              </div>
            </div>
            <div>
              <p style={{fontSize:11,fontWeight:700,color:"#999",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Catégorie</p>
              <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
                {userCats.length>0 && (
                  <FilterBtn label="🎯 Pour toi" active={catFilter==="PourToi"} onClick={()=>setCatFilter("PourToi")}/>
                )}
                {CATEGORIES.map(c=><FilterBtn key={c} label={c} active={catFilter===c} onClick={()=>setCatFilter(c)}/>)}
              </div>
            </div>
          </div>

          {/* ACCÈS RAPIDE AUX ANNUAIRES */}
          <div style={{maxWidth:900,margin:"0 auto",padding:isMobile?"16px 12px 0":"24px 24px 0"}}>
            <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:4}}>
              {[["eglises","⛪","Églises","#185FA5","#eef4fc"],["gastro","🍽️","Gastronomie","#e65100","#fff3e0"],["boutiques","🛍️","Boutiques & artisanat","#7a243e","#fbeaf0"]].map(([k,emo,lab,c,bg])=>(
                <button key={k} onClick={()=>setPage(k)} style={{flexShrink:0,display:"flex",alignItems:"center",gap:8,background:bg,color:c,fontWeight:800,fontSize:13,padding:"10px 16px",borderRadius:14,border:"none",cursor:"pointer"}}>
                  <span style={{fontSize:18}}>{emo}</span> {lab} <span style={{opacity:0.6}}>→</span>
                </button>
              ))}
            </div>
          </div>

          {/* EVENTS À VENIR */}
          <div style={{maxWidth:900,margin:"0 auto",padding:isMobile?"16px 12px":"24px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:16,flexWrap:"wrap"}}>
              <h2 style={{fontWeight:800,fontSize:isMobile?18:22,color:"#111",margin:0}}>📅 Événements à venir <span style={{fontSize:14,color:"#aaa",fontWeight:500}}>({upcoming.length})</span></h2>
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
                          <EventCard event={ev} onSelect={setSelectedEvent} user={user} onAuthRequired={()=>setShowAuth(true)} isAdmin={isAdmin} onDelete={deleteEvent}/>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {rest.length>0 && (
                  <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
                    {rest.map(ev=>(
                      <EventCard key={ev.id} event={ev} onSelect={setSelectedEvent} user={user} onAuthRequired={()=>setShowAuth(true)} isAdmin={isAdmin} onDelete={deleteEvent}/>
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
                  <EventCard key={ev.id} event={ev} onSelect={setSelectedEvent} user={user} onAuthRequired={()=>setShowAuth(true)} isAdmin={isAdmin} onDelete={deleteEvent}/>
                ))}
              </div>
            )}
          </div>
          )}
        </>
      )}

      {/* ── FOOTER ── */}
      {page==="home" && (
        <footer style={{background:RED,padding:"20px 24px",textAlign:"center"}}>
          <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:8}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:WHITE}}/><div style={{width:8,height:8,borderRadius:"50%",background:WHITE}}/><div style={{width:8,height:8,borderRadius:"50%",background:GREEN}}/>
          </div>
          <p style={{color:WHITE,fontWeight:700,fontSize:14,margin:0}}>🇲🇬 Malagasy Events France</p>
          <p style={{color:"rgba(255,255,255,0.65)",fontSize:12,margin:"4px 0 0"}}>La plateforme de la communauté malagasy en France</p>
        </footer>
      )}

      {/* ── MODALS ── */}
      {selectedEvent && (
        <EventDetail event={selectedEvent} onClose={()=>setSelectedEvent(null)} user={user} onAuthRequired={()=>setShowAuth(true)} isAdmin={isAdmin}/>
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

      {showSubmit && <SubmitEventModal user={user} userProfile={userProfile} onEventPublished={ev=>setEvents(list=>[...list,ev])} onClose={()=>setShowSubmit(false)}/>}

      {/* Bouton flottant : proposer un événement */}
      {(page==="home"||page==="community") && !showAdmin && (
        <button onClick={()=>setShowSubmit(true)} title="Proposer un événement" style={{position:"fixed",right:isMobile?16:24,bottom:isMobile?16:24,zIndex:55,background:RED,color:WHITE,fontWeight:800,fontSize:14,padding:isMobile?"14px 16px":"14px 22px",borderRadius:99,border:"none",cursor:"pointer",boxShadow:"0 6px 20px rgba(200,16,46,0.4)"}}>➕ {isMobile?"":"Proposer un event"}</button>
      )}

      {viewingProfile && <UserProfileModal profileId={viewingProfile.id} currentUser={user} onAuthRequired={()=>setShowAuth(true)} onClose={()=>setViewingProfile(null)} onMessage={openMsg}/>}

      {showProfile && user && (
        <ProfileModal user={user} userProfile={userProfile} onClose={()=>setShowProfile(false)} onSignOut={handleSignOut} onUpdate={up=>setUserProfile(up)} orgas={orgas} events={events} onGoPro={()=>setPage('pro')}/>
      )}

      {user && userProfile?.plan==="organisateur" && !orgas.some(o=>o.owner_id===user.id) && !localStorage.getItem('orga_onboard_'+user.id) && (
        <OrgaOnboarding user={user} orgas={orgas} setOrgas={setOrgas} onClose={()=>setUserProfile(p=>({...p}))}/>
      )}

      {showMessages && user && (
        <MessagesModal user={user} userProfile={userProfile} onClose={()=>{setShowMessages(false);fetchUnread()}} initialRecipientId={msgTarget.id} initialRecipientName={msgTarget.name}/>
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
              <div><label style={lbl}>Image (URL)</label><input type="url" value={form.image} onChange={e=>setForm({...form,image:e.target.value})} placeholder="https://..." style={inp}/></div>
              <div><label style={lbl}>Lien billetterie</label><input type="url" value={form.ticketUrl} onChange={e=>setForm({...form,ticketUrl:e.target.value})} placeholder="https://helloasso.com/..." style={inp}/></div>
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