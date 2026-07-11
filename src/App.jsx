import { useState, useEffect, useRef } from "react"
import { supabase } from './supabase'

const RED = "#C8102E", GREEN = "#007A3D", WHITE = "#FFFFFF"
const ADMIN_PASSWORD = "malagasy2026"
const OFFICIAL_USERNAME = "Malagasy_events_admin"
const isOfficial = u => u === OFFICIAL_USERNAME

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

function useIsMobile() {
  const [m,setM] = useState(window.innerWidth<768)
  useEffect(()=>{ const h=()=>setM(window.innerWidth<768); window.addEventListener('resize',h); return()=>window.removeEventListener('resize',h) },[])
  return m
}

const EMPTY_FORM = {title:'',date:'',location:'',city:'Paris',category:'Soirée',price:'',organizer:'',ticketUrl:'',image:'',description:'',mediaUrls:[],createdAt:new Date().toISOString()}

const initialEvents = [
  {id:1,title:"Soirée Malagasy Paris",date:"2026-07-12",location:"Paris 11ème",city:"Paris",category:"Soirée",image:"",price:"15€",organizer:"Mafana Vibes",ticketUrl:"https://helloasso.com",description:"Une soirée inoubliable au cœur de Paris pour célébrer la culture malagasy. DJ, danses traditionnelles, cocktails et ambiance chaleureuse garantis !",mediaUrls:[],createdAt:new Date().toISOString()},
  {id:2,title:"Hira Gasy Île-de-France",date:"2026-07-20",location:"Créteil",city:"Paris",category:"Culture",image:"https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400",price:"10€",organizer:"Association Soa",ticketUrl:"",description:"Le Hira Gasy est l'art oratoire traditionnel de Madagascar. Venez découvrir chants, poésies et sagesses ancestrales portés par des artistes passionnés.",mediaUrls:[],createdAt:new Date().toISOString()},
  {id:3,title:"Repas Communautaire Malagasy",date:"2025-03-10",location:"Lyon",city:"Lyon",category:"Gastronomie",image:"https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400",price:"Gratuit",organizer:"Malagasy Lyon",ticketUrl:"",description:"Retrouvez la communauté malagasy de Lyon autour de plats traditionnels : romazava, ravitoto, lasopy... Un moment de partage et de convivialité.",mediaUrls:["https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400","https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400"],createdAt:"2025-03-01T00:00:00.000Z"},
  {id:4,title:"Princio & Njara Marcel — Revy Revy Vacances",date:"2026-07-18",location:"Florida Palace",city:"Marseille",category:"Soirée",image:"https://madatsara.com/uploads/medias/image-6a4c8d808767b.jpg",price:"",organizer:"Revy Revy Vacances",ticketUrl:"https://www.facebook.com/photo/?fbid=122106136563370277&set=pcb.122106136827370277",description:"Princio et Njara Marcel en live au Florida Palace de Marseille ! Revy Revy Vacances — ambiance gasy garantie. À partir de 21h.",mediaUrls:[],createdAt:new Date().toISOString()},
  {id:5,title:"Que Calor — 206 Vibes, Kosmo, Midnight 261, Falfa",date:"2026-07-24",location:"Que Calor Paris",city:"Paris",category:"Soirée",image:"",price:"",organizer:"Que Calor Paris",ticketUrl:"",description:"Soirée Que Calor à Paris avec 206 Vibes, Kosmo, Midnight 261 et Falfa aux platines. Horaire à confirmer — suivez l'Instagram de Que Calor Paris.",mediaUrls:[],createdAt:new Date().toISOString()},
  {id:6,title:"Princio & Njara Marcel — Revy Revy Vacances",date:"2026-07-24",location:"Salle climatisée Xeraco",city:"Toulouse",category:"Soirée",image:"",price:"",organizer:"Revy Revy Vacances",ticketUrl:"",description:"Princio et Njara Marcel en live à Toulouse, salle climatisée Xeraco. Revy Revy Vacances — à partir de 21h.",mediaUrls:[],createdAt:new Date().toISOString()},
  {id:7,title:"Princio & Njara Marcel — Samedi joli faradoboka",date:"2026-07-25",location:"Sport Indoor, 8 av. de Scandinavie, Les Ulis (91)",city:"Paris",category:"Soirée",image:"https://madatsara.com/uploads/medias/image-6a4c8d40a13da.jpg",price:"",organizer:"Revy Revy Vacances",ticketUrl:"",description:"Princio et Njara Marcel en live aux Ulis pour clôturer la tournée Revy Revy Vacances en Île-de-France. À partir de 21h.",mediaUrls:[],createdAt:new Date().toISOString()},
  {id:8,title:"Dîner solidaire malgache — Bodo & Fenoamby",date:"2026-07-11",location:"Espace Dan Ar Braz, Quimper",city:"Quimper",category:"Gastronomie",image:"https://madatsara.com/uploads/medias/image-69ebc57377ff6.jpg",price:"",organizer:"Collectif solidaire",ticketUrl:"https://madatsara.com/evenement_diner-solidaire-malgache-avec-bodo-fenoamby-espace-dan-ar-braz-quimper.html",description:"Dîner solidaire malgache animé par Bodo et Fenoamby à Quimper. Cuisine traditionnelle et concert au profit d'actions solidaires pour Madagascar.",mediaUrls:[],createdAt:new Date().toISOString()},
  {id:9,title:"Nonoh — Grand spectacle d'été (1ère édition)",date:"2026-07-13",location:"Domaine de Beauvoisière, Avrainville (91)",city:"Paris",category:"Soirée",image:"https://madatsara.com/uploads/medias/image-6a28834de4129.jpg",price:"",organizer:"Nonoh",ticketUrl:"https://madatsara.com/evenement_nonoh-grand-spectacle-dete-1ere-edition-domaine-de-beauvoisiere-avrainville.html",description:"Nonoh présente la 1ère édition de son grand spectacle d'été au Domaine de Beauvoisière à Avrainville, en Essonne. Veille de fête nationale !",mediaUrls:[],createdAt:new Date().toISOString()},
  {id:10,title:"Hajazz en cabaret",date:"2026-08-13",location:"La Grande Rouge, La Chapelle-Naude (71)",city:"La Chapelle-Naude",category:"Soirée",image:"https://madatsara.com/uploads/medias/image-6a4fe73f740d4.jpg",price:"",organizer:"La Grande Rouge",ticketUrl:"https://madatsara.com/evenement_hajazz-cabaret-la-grande-rouge-la-chapelle-naude.html",description:"Hajazz en cabaret à La Grande Rouge (Saône-et-Loire). Jazz et mélodies malgaches dans un cadre intimiste.",mediaUrls:[],createdAt:new Date().toISOString()},
  {id:11,title:"Shao Boana en showcase",date:"2026-08-15",location:"La Lagune, base de loisirs, Jonzac (17)",city:"Jonzac",category:"Soirée",image:"https://madatsara.com/uploads/medias/Shao-Boana-Showcase-La-Lagune-base-de-loisirs-Jonzac-69bab805a4d96.jpg",price:"",organizer:"La Lagune",ticketUrl:"https://madatsara.com/evenement_shao-boana-showcase-la-lagune-base-de-loisirs-jonzac.html",description:"Shao Boana en showcase à la base de loisirs La Lagune de Jonzac, en Charente-Maritime. Ambiance tropicale du 15 août !",mediaUrls:[],createdAt:new Date().toISOString()},
  {id:12,title:"Feo Gasy en concert",date:"2026-09-04",location:"Maison pour tous Melina Mercouri, Montpellier",city:"Montpellier",category:"Culture",image:"https://madatsara.com/uploads/medias/image-6a4d5ab6d0a00.jpg",price:"",organizer:"Maison pour tous Melina Mercouri",ticketUrl:"https://madatsara.com/evenement_feo-gasy-en-concert-maison-pour-tous-melina-mercouri-montpellier.html",description:"Le groupe Feo Gasy en concert à Montpellier : polyphonies et musique traditionnelle malgache.",mediaUrls:[],createdAt:new Date().toISOString()},
  {id:13,title:"Rija Ramanantoanina en concert",date:"2026-10-17",location:"Espace Magnan, Nice",city:"Nice",category:"Culture",image:"https://madatsara.com/uploads/medias/image-6a52334735617.jpg",price:"",organizer:"Espace Magnan",ticketUrl:"https://madatsara.com/evenement_rija-ramanantoanina-concert-espace-magnan-nice.html",description:"Rija Ramanantoanina, voix emblématique de la chanson malgache, en concert à l'Espace Magnan de Nice.",mediaUrls:[],createdAt:new Date().toISOString()},
]

const initialVideos = [
  {id:1,type:"aftermovie",title:"After-movie — Repas Communautaire Lyon 2025",youtubeUrl:"https://www.youtube.com/embed/dQw4w9WgXcQ",thumbnail:"https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400",eventName:"Repas Communautaire Malagasy",eventId:3,date:"2025-03-10",city:"Lyon",description:"Revivez la magie du repas communautaire de Lyon.",isTeaser:false,views:1240},
  {id:2,type:"aftermovie",title:"Teaser — Soirée Malagasy Paris",youtubeUrl:"https://www.youtube.com/embed/dQw4w9WgXcQ",thumbnail:"https://images.unsplash.com/photo-1533317480453-7a4b6ad0a174?w=400",eventName:"Soirée Malagasy Paris",eventId:1,date:"2026-07-12",city:"Paris",description:"Le teaser de la soirée la plus attendue de l'été !",isTeaser:true,views:856},
  {id:3,type:"communaute",title:"La communauté malagasy de Lyon se présente",youtubeUrl:"https://www.youtube.com/embed/dQw4w9WgXcQ",thumbnail:"https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400",eventName:"",eventId:null,date:"2025-06-01",city:"Lyon",description:"Portrait de notre communauté.",isTeaser:false,views:432},
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
function ProfileModal({ user, userProfile, onClose, onSignOut, onUpdate }) {
  const [tab,setTab]         = useState("profil")
  const [username,setUsername] = useState(userProfile?.username||"")
  const [avatarUrl,setAvatarUrl] = useState(userProfile?.avatar_url||"")
  const [codePostal,setCodePostal] = useState(userProfile?.code_postal||"")
  const [saving,setSaving]   = useState(false)
  const [saved,setSaved]     = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase.from('profiles').update({ username, avatar_url:avatarUrl, code_postal:codePostal }).eq('id',user.id)
    if (!error) { setSaved(true); onUpdate({...userProfile,username,avatar_url:avatarUrl,code_postal:codePostal}); setTimeout(()=>setSaved(false),2000) }
    setSaving(false)
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
          {[["profil","👤 Mon profil"],["interets","🎯 Intérêts"],["compte","⚙️ Compte"]].map(([k,l])=>(
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
                <label style={{...lbl,marginTop:6}}>Ou coller une URL photo perso</label>
                <input value={AVATARS.includes(avatarUrl)?"":avatarUrl} onChange={e=>setAvatarUrl(e.target.value)} placeholder="https://ma-photo.com/moi.jpg" style={inp}/>
                {avatarUrl && !AVATARS.includes(avatarUrl) && <img src={avatarUrl} alt="" style={{width:48,height:48,borderRadius:"50%",objectFit:"cover",marginTop:8}}/>}
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
          {tab==="interets" && (
            <InterestTabContent user={user} userProfile={userProfile} onUpdate={onUpdate}/>
          )}
          {tab==="compte" && (
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{background:"#f8f8f8",borderRadius:14,padding:16}}>
                <p style={{fontSize:12,fontWeight:700,color:"#999",textTransform:"uppercase",margin:"0 0 8px"}}>Plan actuel</p>
                {userProfile?.is_member ? (
                  <><p style={{fontSize:15,fontWeight:700,color:GREEN,margin:"0 0 4px"}}>✓ Plan Membre — 2,50€/mois</p><p style={{fontSize:12,color:"#999",margin:0}}>Accès prioritaire, badge, contenu exclusif</p></>
                ) : (
                  <><p style={{fontSize:15,fontWeight:700,color:"#555",margin:"0 0 8px"}}>Plan Gratuit</p>
                  <button style={{background:RED,color:WHITE,fontWeight:700,fontSize:13,padding:"10px 0",borderRadius:12,border:"none",cursor:"pointer",width:"100%"}}>Passer à 2,50€/mois →</button>
                  <p style={{fontSize:11,color:"#bbb",textAlign:"center",marginTop:6}}>Badge membre, accès prioritaire, contenu exclusif</p></>
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
    let q = supabase.from('comments').select('*,profiles(username,is_member)').order('created_at',{ascending:true})
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
                {!isOfficial(c.profiles?.username) && c.profiles?.is_member && <span style={{background:GREEN,color:WHITE,fontSize:8,fontWeight:800,padding:"1px 5px",borderRadius:99}}>MEMBRE</span>}
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

/* ── ReminderModal ────────────────────────────────── */
function ReminderModal({ ev, user, onClose }) {
  const types = [
    {id:"pre_sale",   label:"Ouverture pré-vente"},
    {id:"ticket_open",label:"Billetterie ouverte"},
    {id:"j7",         label:"7 jours avant l'event"},
    {id:"j1",         label:"La veille"},
    {id:"day_of",     label:"Le jour J"},
  ]
  const [selected,setSelected] = useState([])
  const [saved,setSaved]       = useState(false)
  const [saving,setSaving]     = useState(false)

  const toggle = id => setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id])

  const save = async () => {
    if (!selected.length) return
    setSaving(true)
    await supabase.from('email_reminders').upsert({user_id:user.id,event_id:ev.id,event_title:ev.title,event_date:ev.date,email:user.email,types:selected},{onConflict:'user_id,event_id'})
    setSaved(true); setSaving(false)
  }

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16}}>
      <div style={{background:WHITE,borderRadius:20,padding:24,width:"100%",maxWidth:360,boxShadow:"0 16px 48px rgba(0,0,0,0.25)"}}>
        <h3 style={{fontWeight:800,fontSize:16,margin:"0 0 6px",textAlign:"center"}}>🔔 Rappels par email</h3>
        <p style={{fontSize:12,color:"#999",textAlign:"center",margin:"0 0 20px"}}>{ev.title}</p>
        {saved ? (
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <p style={{fontSize:32,margin:"0 0 8px"}}>✅</p>
            <p style={{fontWeight:700,color:GREEN}}>Rappels enregistrés !</p>
            <p style={{fontSize:12,color:"#999"}}>Tu recevras un email à {user.email}</p>
            <button onClick={onClose} style={{background:GREEN,color:WHITE,fontWeight:700,padding:"10px 24px",borderRadius:12,border:"none",cursor:"pointer",marginTop:12}}>Parfait</button>
          </div>
        ) : (
          <>
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
              {types.map(t=>(
                <label key={t.id} style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer",background:selected.includes(t.id)?"#fde8ec":"#f8f8f8",borderRadius:12,padding:"12px 14px",border:selected.includes(t.id)?`1.5px solid ${RED}`:"1.5px solid transparent"}}>
                  <input type="checkbox" checked={selected.includes(t.id)} onChange={()=>toggle(t.id)} style={{accentColor:RED,width:16,height:16}}/>
                  <span style={{fontSize:14,fontWeight:600,color:selected.includes(t.id)?RED:"#333"}}>{t.label}</span>
                </label>
              ))}
            </div>
            <button onClick={save} disabled={!selected.length||saving} style={{width:"100%",background:selected.length?RED:"#ccc",color:WHITE,fontWeight:700,fontSize:14,padding:"12px 0",borderRadius:12,border:"none",cursor:selected.length?"pointer":"not-allowed"}}>
              {saving?"...":"Activer les rappels"}
            </button>
            <button onClick={onClose} style={{width:"100%",background:"none",border:"none",color:"#aaa",fontSize:13,cursor:"pointer",marginTop:8}}>Annuler</button>
          </>
        )}
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
function PostCard({ post, user, onAuthRequired, onMessage, onProfileClick, onDelete }) {
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
    const {data} = await supabase.from('post_comments').select('*,profiles(username,is_member)').eq('post_id',post.id).order('created_at',{ascending:true})
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

  return (
    <div onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{background:WHITE,borderRadius:20,boxShadow:hover?"0 8px 32px rgba(0,0,0,0.12)":"0 2px 12px rgba(0,0,0,0.07)",transition:"all .2s",marginBottom:16,overflow:"hidden"}}>
      <div style={{padding:"16px 16px 12px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <div style={{width:42,height:42,borderRadius:"50%",background:RED,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0}}>
            {u?.avatar_url ? <img src={u.avatar_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <span style={{color:WHITE,fontWeight:800,fontSize:16}}>{initiale}</span>}
          </div>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span onClick={e=>{e.stopPropagation();onProfileClick&&onProfileClick(post.user_id,u?.username)}} style={{fontWeight:700,fontSize:14,color:isOfficial(u?.username)?RED:"#111",cursor:"pointer",textDecoration:"underline dotted"}}>{u?.username||"Anonyme"}</span>
              {isOfficial(u?.username) && <span style={{background:RED,color:WHITE,fontSize:9,fontWeight:800,padding:"2px 6px",borderRadius:99}}>✓ OFFICIEL</span>}
              {!isOfficial(u?.username) && u?.is_member && <span style={{background:GREEN,color:WHITE,fontSize:9,fontWeight:800,padding:"2px 6px",borderRadius:99}}>MEMBRE</span>}
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
function CommunityFeed({ user, userProfile, onAuthRequired, onMessage, onProfileClick }) {
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
    else fetchPosts()
  },[feedMode, user])
  useEffect(()=>{ if(user) fetchSuggested() },[user])

  const fetchPosts = async () => {
    setLoading(true)
    if (feedMode==="following" && user) {
      const {data:follows} = await supabase.from('follows').select('following_id').eq('follower_id',user.id)
      const ids = (follows||[]).map(f=>f.following_id)
      if (ids.length===0) { setPosts([]); setLoading(false); return }
      const {data} = await supabase.from('posts').select('*,profiles(username,avatar_url,is_member)').in('user_id',ids).order('created_at',{ascending:false}).limit(30)
      setPosts(data||[])
    } else {
      const {data} = await supabase.from('posts').select('*,profiles(username,avatar_url,is_member)').order('created_at',{ascending:false}).limit(30)
      setPosts(data||[])
    }
    setLoading(false)
  }

  const fetchMembers = async () => {
    setMembersLoading(true)
    const {data} = await supabase.from('profiles').select('id,username,avatar_url,is_member,code_postal,created_at').order('created_at',{ascending:false}).limit(100)
    setMembers(data||[]); setMembersLoading(false)
  }

  const filteredMembers = memberSearch.trim()
    ? members.filter(m => (m.username||"").toLowerCase().replace(/_/g," ").includes(memberSearch.toLowerCase().replace(/_/g," ")))
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
          {[["all","🌍 Tous"],["following","👥 Abonnements"],["members","🔍 Membres"]].map(([k,l])=>(
            <button key={k} onClick={()=>setFeedMode(k)} style={{flex:1,padding:"9px 0",borderRadius:10,border:"none",cursor:"pointer",fontWeight:700,fontSize:13,background:feedMode===k?RED:"transparent",color:feedMode===k?WHITE:"#888"}}>
              {l}
            </button>
          ))}
        </div>

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
                        {!isOfficial(m.username) && m.is_member && <span style={{background:GREEN,color:WHITE,fontSize:9,fontWeight:800,padding:"2px 6px",borderRadius:99}}>MEMBRE</span>}
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

        {/* Compose */}
        {feedMode!=="members" && (user ? (
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
        {feedMode!=="members" && (loading ? (
          <div style={{textAlign:"center",padding:40,color:"#bbb"}}>Chargement...</div>
        ) : posts.length===0 ? (
          <div style={{textAlign:"center",padding:60,background:WHITE,borderRadius:20}}>
            <p style={{fontSize:40,margin:"0 0 12px"}}>{feedMode==="following"?"😔":"🌺"}</p>
            <p style={{fontWeight:700,color:"#333"}}>{feedMode==="following"?"Abonne-toi à des membres pour voir leurs posts !":"Sois le premier à poster !"}</p>
            {feedMode==="following" && <button onClick={()=>setFeedMode("all")} style={{background:RED,color:WHITE,fontWeight:700,padding:"8px 20px",borderRadius:99,border:"none",cursor:"pointer",marginTop:8}}>Découvrir des membres</button>}
          </div>
        ) : (
          posts.map(p=><PostCard key={p.id} post={p} user={user} onAuthRequired={onAuthRequired} onMessage={onMessage} onProfileClick={onProfileClick}/>)
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
    // Demande permission notifications navigateur
    if ('Notification' in window && Notification.permission==='default') {
      Notification.requestPermission()
    }
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
    const {data} = await supabase.from('messages').select('sender_id,recipient_id,created_at').or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`).order('created_at',{ascending:false})
    if (!data) return
    const seen=new Set(); const uniq=[]
    data.forEach(m=>{ const other=m.sender_id===user.id?m.recipient_id:m.sender_id; if(!seen.has(other)){seen.add(other);uniq.push(other)} })
    if (uniq.length===0) { setConvList([]); return }
    const {data:profiles} = await supabase.from('profiles').select('id,username,avatar_url').in('id',uniq)
    setConvList(profiles||[])
  }

  const fetchMsgs = async () => {
    const {data} = await supabase.from('messages').select('*').or(`and(sender_id.eq.${user.id},recipient_id.eq.${selectedUserId}),and(sender_id.eq.${selectedUserId},recipient_id.eq.${user.id})`).order('created_at',{ascending:true})
    setMsgs(data||[])
    // mark as read
    await supabase.from('messages').update({read:true}).eq('recipient_id',user.id).eq('sender_id',selectedUserId)
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
                <div key={c.id} onClick={()=>selectUser(c.id,c.username)} style={{display:"flex",alignItems:"center",gap:10,padding:"12px",cursor:"pointer",background:selectedUserId===c.id?"#fde8ec":"transparent",borderBottom:"1px solid #f5f5f5"}}>
                  <div style={{width:38,height:38,borderRadius:"50%",background:RED,display:"flex",alignItems:"center",justifyContent:"center",color:WHITE,fontWeight:800,flexShrink:0}}>{(c.username||"?")[0].toUpperCase()}</div>
                  <span style={{fontSize:13,fontWeight:600,color:selectedUserId===c.id?RED:"#333"}}>{c.username}</span>
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
  })

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
            <div key={v.id} onClick={()=>setPlaying(v)} style={{background:"#1a1a1a",borderRadius:16,overflow:"hidden",cursor:"pointer"}}>
              <div style={{position:"relative"}}>
                <img src={v.thumbnail} alt="" style={{width:"100%",height:160,objectFit:"cover",display:"block"}}/>
                <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.3)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <div style={{width:44,height:44,borderRadius:"50%",background:"rgba(255,255,255,0.85)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>▶</div>
                </div>
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
            <a href={event.ticketUrl} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{background:RED,color:WHITE,fontWeight:700,fontSize:11,padding:"6px 12px",borderRadius:99,textDecoration:"none"}}>🎟️ Billets</a>
          )}
        </div>
        {isAdmin && (
          <div style={{padding:"0 16px 12px",display:"flex",gap:8}}>
            <button onClick={e=>{e.stopPropagation();onDelete&&onDelete(event.id)}} style={{background:"#fde8ec",color:RED,fontWeight:700,fontSize:11,padding:"5px 12px",borderRadius:99,border:"none",cursor:"pointer"}}>🗑️ Supprimer</button>
          </div>
        )}
      </div>

      {showShare && <ShareMenu ev={event} onClose={()=>setShowShare(false)}/>}
      {showReminder && user && <ReminderModal ev={event} user={user} onClose={()=>setReminder(false)}/>}
      {showReminder && !user && (onAuthRequired(), setReminder(false))}
    </>
  )
}

/* ── EventDetail ──────────────────────────────────── */
function EventDetail({ event, onClose, user, onAuthRequired, isAdmin }) {
  const [showShare,setShowShare]   = useState(false)
  const [showReminder,setReminder] = useState(false)
  const [interested,setInterested] = useState(false)
  const [fav,setFav]               = useState(false)
  const [count,setCount]           = useState(0)
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
              {event.ticketUrl && <a href={event.ticketUrl} target="_blank" rel="noreferrer" style={{background:GREEN,color:WHITE,fontWeight:700,fontSize:13,padding:"10px 18px",borderRadius:12,textDecoration:"none"}}>🎟️ Acheter mes billets</a>}
            </div>

            <CommentSection eventId={event.id} user={user} onAuthRequired={onAuthRequired}/>
          </div>
        </div>
      </div>
      {showShare && <ShareMenu ev={event} onClose={()=>setShowShare(false)}/>}
      {showReminder && user && <ReminderModal ev={event} user={user} onClose={()=>setReminder(false)}/>}
    </>
  )
}

/* ── AdminPanel ───────────────────────────────────── */
function AdminPanel({ events, setEvents, videos, setVideos, onClose }) {
  const [tab,setTab]           = useState("dashboard")
  const [stats,setStats]       = useState({})
  const [users,setUsers]       = useState([])
  const [userSearch,setUserSearch] = useState("")
  const [allPosts,setAllPosts] = useState([])
  const [allCmts,setAllCmts]   = useState([])
  const [reminders,setReminders] = useState([])
  const [editId,setEditId]     = useState(null)
  const [editForm,setEditForm] = useState({})
  const [showVForm,setShowVForm] = useState(false)
  const [vForm,setVForm]       = useState({title:"",youtubeUrl:"",thumbnail:"",city:"",date:"",description:"",isTeaser:false,type:"aftermovie",views:0})

  useEffect(()=>{ loadTab(tab) },[tab])

  const loadTab = async t => {
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
    } else if (t==="reminders") {
      const {data} = await supabase.from('email_reminders').select('*').order('created_at',{ascending:false}).limit(200)
      setReminders(data||[])
    }
  }

  const banUser   = async (id,banned) => { await supabase.from('profiles').update({is_banned:!banned}).eq('id',id); setUsers(u=>u.map(p=>p.id===id?{...p,is_banned:!banned}:p)) }
  const delPost   = async id => { await supabase.from('posts').delete().eq('id',id); setAllPosts(p=>p.filter(x=>x.id!==id)) }
  const delCmt    = async id => { await supabase.from('post_comments').delete().eq('id',id); setAllCmts(c=>c.filter(x=>x.id!==id)) }
  const delEvent  = id => setEvents(e=>e.filter(x=>x.id!==id))
  const delVideo  = id => setVideos(v=>v.filter(x=>x.id!==id))
  const saveEvent = () => { setEvents(e=>e.map(x=>x.id===editId?{...editForm,id:editId}:x)); setEditId(null) }
  const addVideo  = () => { setVideos(v=>[...v,{...vForm,id:Date.now()}]); setVForm({title:"",youtubeUrl:"",thumbnail:"",city:"",date:"",description:"",isTeaser:false,type:"aftermovie",views:0}); setShowVForm(false) }

  const filtered  = users.filter(u=>!userSearch||(u.username||"").toLowerCase().includes(userSearch.toLowerCase())||(u.email||"").toLowerCase().includes(userSearch.toLowerCase()))

  const TABS = [{id:"dashboard",l:"📊 Dashboard"},{id:"users",l:"👥 Membres"},{id:"events",l:"📅 Événements"},{id:"posts",l:"📝 Posts"},{id:"videos",l:"🎬 Vidéos"},{id:"comments",l:"💬 Commentaires"},{id:"reminders",l:"🔔 Rappels"}]

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
                  {u.is_member && <span style={{background:GREEN,color:WHITE,fontSize:9,fontWeight:800,padding:"2px 6px",borderRadius:99,flexShrink:0}}>MEMBRE</span>}
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
                        <button onClick={()=>{setEditId(ev.id);setEditForm({...ev})}} style={{background:"#f0f0f0",color:"#333",fontWeight:700,fontSize:11,padding:"5px 12px",borderRadius:99,border:"none",cursor:"pointer"}}>✏️ Éditer</button>
                        {delBtn(()=>delEvent(ev.id))}
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
  const [showPast,setShowPast]         = useState(false)
  const [isAdmin,setIsAdmin]           = useState(false)
  const [showLogin,setShowLogin]       = useState(false)
  const [pwInput,setPwInput]           = useState("")
  const [pwError,setPwError]           = useState(false)
  const [logoClicks,setLogoClicks]     = useState(0)
  const [selectedEvent,setSelectedEvent] = useState(null)
  const [showOnboarding,setOnboarding] = useState(!localStorage.getItem('mev_visited'))
  const [showInterestOnboarding,setShowInterestOnboarding] = useState(false)
  const [showLoginIntent,setShowLoginIntent]               = useState(false)
  const [sessionCats,setSessionCats]                       = useState([]) // filtre temporaire de session
  const [showAdmin,setShowAdmin]       = useState(false)
  const [viewingProfile,setViewingProfile] = useState(null) // {id, name}
  const isMobile                       = useIsMobile()

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{ setUser(session?.user??null); if(session?.user) fetchProfile(session.user.id) })
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_e,session)=>{ setUser(session?.user??null); if(session?.user) fetchProfile(session.user.id); else setUserProfile(null) })
    fetchStats()
    return()=>subscription.unsubscribe()
  },[])

  useEffect(()=>{ if(user) fetchUnread() },[user])

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

  const handleLogoClick = () => { const n=logoClicks+1; setLogoClicks(n); if(n>=3){setShowLogin(true);setLogoClicks(0)} }
  const handleLogin = e => { e.preventDefault(); if(pwInput===ADMIN_PASSWORD){setIsAdmin(true);setShowLogin(false);setPwInput("");setPwError(false)}else{setPwError(true);setPwInput("")} }

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

  const handleSubmit = e => {
    e.preventDefault()
    setEvents([...events,{...form,id:Date.now(),createdAt:new Date().toISOString()}])
    setForm(EMPTY_FORM); setMediaInput(""); setShowForm(false)
  }

  const addMedia = () => { if(mediaInput.trim()){setForm({...form,mediaUrls:[...(form.mediaUrls||[]),mediaInput.trim()]});setMediaInput("")} }
  const removeMedia = i => setForm({...form,mediaUrls:form.mediaUrls.filter((_,idx)=>idx!==i)})
  const deleteEvent = id => setEvents(ev=>ev.filter(e=>e.id!==id))

  const openMsg = (recipientId, recipientName) => { setMsgTarget({id:recipientId,name:recipientName}); setShowMessages(true) }

  const FilterBtn = ({label,active,onClick}) => (
    <button onClick={onClick} style={{padding:"5px 14px",borderRadius:99,fontSize:13,fontWeight:600,cursor:"pointer",border:"none",background:active?RED:WHITE,color:active?WHITE:"#555",boxShadow:active?`0 2px 8px ${RED}55`:"0 1px 4px rgba(0,0,0,0.08)",whiteSpace:"nowrap"}}>
      {label}
    </button>
  )

  const inp = {width:"100%",border:"1.5px solid #e5e5e5",borderRadius:12,padding:"9px 12px",fontSize:13,outline:"none",boxSizing:"border-box"}
  const lbl = {fontSize:13,fontWeight:600,color:"#444",display:"block",marginBottom:6}

  const navItems = [
    {key:"home",label:"🏠 Accueil"},
    {key:"aftermovies",label:"🎬 After-movies"},
    {key:"community",label:"👥 Communauté"},
  ]

  const dismissOnboarding = () => { localStorage.setItem('mev_visited','1'); setOnboarding(false) }

  return (
    <div style={{minHeight:"100vh",background:"#f6f6f6",fontFamily:"system-ui,sans-serif"}}>

      {/* ── HEADER ── */}
      <header style={{background:RED,padding:isMobile?"12px 16px":"14px 24px",boxShadow:"0 2px 12px rgba(0,0,0,0.15)",position:"sticky",top:0,zIndex:60}}>
        <div style={{maxWidth:900,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
          <div onClick={handleLogoClick} style={{cursor:"default",minWidth:0}}>
            <h1 style={{color:WHITE,fontWeight:800,fontSize:isMobile?17:22,margin:0,whiteSpace:"nowrap"}}>🇲🇬 Malagasy Events</h1>
            {!isMobile && <p style={{color:"rgba(255,255,255,0.75)",fontSize:12,margin:"2px 0 0"}}>La communauté malagasy en France</p>}
          </div>

          {/* Nav desktop */}
          {!isMobile && (
            <div style={{display:"flex",gap:4}}>
              {navItems.map(n=>(
                <button key={n.key} onClick={()=>setPage(n.key)} style={{background:page===n.key?"rgba(255,255,255,0.25)":"transparent",color:WHITE,fontWeight:700,fontSize:13,padding:"8px 14px",borderRadius:10,border:"none",cursor:"pointer"}}>
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
            {isMobile && (
              <button onClick={()=>setMobileMenu(m=>!m)} style={{background:"rgba(255,255,255,0.15)",color:WHITE,fontWeight:800,fontSize:18,padding:"6px 10px",borderRadius:10,border:"none",cursor:"pointer"}}>☰</button>
            )}
          </div>
        </div>

        {/* Mobile nav dropdown */}
        {isMobile && mobileMenu && (
          <div style={{maxWidth:900,margin:"12px auto 0",display:"flex",flexDirection:"column",gap:4}}>
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
        <div style={{background:"linear-gradient(135deg,#007A3D,#00a351)",padding:isMobile?"20px 16px":"28px 24px"}}>
          <div style={{maxWidth:900,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16}}>
            <div>
              <h2 style={{color:WHITE,fontWeight:900,fontSize:isMobile?18:24,margin:"0 0 6px"}}>🇲🇬 Bienvenue sur Malagasy Events !</h2>
              <p style={{color:"rgba(255,255,255,0.85)",fontSize:14,margin:"0 0 12px"}}>La plateforme qui recense tous les événements malagasy en France — soirées, culture, gastronomie, sport et plus encore.</p>
              <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                <span style={{color:"rgba(255,255,255,0.9)",fontSize:13}}>✅ Gratuit & sans inscription</span>
                <span style={{color:"rgba(255,255,255,0.9)",fontSize:13}}>📅 Events vérifiés</span>
                <span style={{color:"rgba(255,255,255,0.9)",fontSize:13}}>📤 Partageable en 1 clic</span>
              </div>
            </div>
            <div style={{display:"flex",gap:12,alignItems:"center"}}>
              <div style={{textAlign:"center"}}>
                <p style={{color:WHITE,fontWeight:900,fontSize:28,margin:0}}>{communityStats.members}</p>
                <p style={{color:"rgba(255,255,255,0.7)",fontSize:11,margin:0}}>Membres</p>
              </div>
              <div style={{textAlign:"center"}}>
                <p style={{color:WHITE,fontWeight:900,fontSize:28,margin:0}}>{events.length}</p>
                <p style={{color:"rgba(255,255,255,0.7)",fontSize:11,margin:0}}>Events</p>
              </div>
              <button onClick={dismissOnboarding} style={{background:"rgba(255,255,255,0.2)",color:WHITE,fontWeight:700,fontSize:12,padding:"8px 16px",borderRadius:99,border:"none",cursor:"pointer"}}>
                OK, j'ai compris ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PAGES ── */}
      {page==="aftermovies" && (
        <AfterMoviePage videos={videos} events={events} user={user} userProfile={userProfile} onAuthRequired={()=>setShowAuth(true)} onBack={()=>setPage("home")}/>
      )}

      {page==="community" && (
        <div style={{maxWidth:900,margin:"0 auto"}}>
          <div style={{padding:isMobile?"16px 0 0":"32px 0 0",textAlign:"center",paddingBottom:0}}>
            <h2 style={{fontWeight:900,fontSize:isMobile?20:28,color:"#111",margin:"0 0 4px"}}>👥 Communauté Malagasy</h2>
            <p style={{fontSize:14,color:"#888",margin:"0 0 20px"}}>Échangez, partagez, et rencontrez d'autres membres 🇲🇬</p>
          </div>
          <CommunityFeed user={user} userProfile={userProfile} onAuthRequired={()=>setShowAuth(true)} onMessage={openMsg} onProfileClick={(id,name)=>setViewingProfile({id,name})}/>
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
              <div style={{display:"flex",justifyContent:"center",gap:24,marginTop:20,flexWrap:"wrap"}}>
                <span style={{color:"rgba(255,255,255,0.8)",fontSize:13}}>👥 {communityStats.members} membres</span>
                <span style={{color:"rgba(255,255,255,0.8)",fontSize:13}}>📅 {events.length} events</span>
                <span style={{color:"rgba(255,255,255,0.8)",fontSize:13}}>📍 {[...new Set(events.map(e=>e.city))].length} villes</span>
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

          {/* EVENTS À VENIR */}
          <div style={{maxWidth:900,margin:"0 auto",padding:isMobile?"16px 12px":"24px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <h2 style={{fontWeight:800,fontSize:isMobile?18:22,color:"#111",margin:0}}>📅 Événements à venir <span style={{fontSize:14,color:"#aaa",fontWeight:500}}>({upcoming.length})</span></h2>
            </div>
            {upcoming.length===0 ? (
              <div style={{textAlign:"center",padding:"48px 24px",background:WHITE,borderRadius:20,color:"#bbb"}}>
                <p style={{fontSize:32,margin:"0 0 8px"}}>🌺</p>
                <p style={{fontWeight:700}}>Aucun événement à venir pour ces filtres</p>
              </div>
            ) : (
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
                {upcoming.map(ev=>(
                  <EventCard key={ev.id} event={ev} onSelect={setSelectedEvent} user={user} onAuthRequired={()=>setShowAuth(true)} isAdmin={isAdmin} onDelete={deleteEvent}/>
                ))}
              </div>
            )}
          </div>

          {/* EVENTS PASSÉS */}
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

      {showAdmin && <AdminPanel events={events} setEvents={setEvents} videos={videos} setVideos={setVideos} onClose={()=>setShowAdmin(false)}/>}

      {viewingProfile && <UserProfileModal profileId={viewingProfile.id} currentUser={user} onAuthRequired={()=>setShowAuth(true)} onClose={()=>setViewingProfile(null)} onMessage={openMsg}/>}

      {showProfile && user && (
        <ProfileModal user={user} userProfile={userProfile} onClose={()=>setShowProfile(false)} onSignOut={handleSignOut} onUpdate={up=>setUserProfile(up)}/>
      )}

      {showMessages && user && (
        <MessagesModal user={user} userProfile={userProfile} onClose={()=>{setShowMessages(false);fetchUnread()}} initialRecipientId={msgTarget.id} initialRecipientName={msgTarget.name}/>
      )}

      {/* Admin login */}
      {showLogin && (
        <div onClick={e=>e.target===e.currentTarget&&setShowLogin(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:16}}>
          <div style={{background:WHITE,borderRadius:20,width:"100%",maxWidth:360,padding:32,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{textAlign:"center",marginBottom:24}}><p style={{fontSize:32,margin:"0 0 8px"}}>🔐</p><h2 style={{fontWeight:800,fontSize:18,color:"#111",margin:0}}>Accès administrateur</h2></div>
            <form onSubmit={handleLogin} style={{display:"flex",flexDirection:"column",gap:12}}>
              <input type="password" autoFocus value={pwInput} onChange={e=>{setPwInput(e.target.value);setPwError(false)}} placeholder="Mot de passe"
                style={{border:`1.5px solid ${pwError?RED:"#e5e5e5"}`,borderRadius:12,padding:"11px 14px",fontSize:14,outline:"none",textAlign:"center"}}/>
              {pwError && <p style={{color:RED,fontSize:12,textAlign:"center",margin:0}}>Mot de passe incorrect</p>}
              <button type="submit" style={{background:RED,color:WHITE,fontWeight:700,fontSize:14,padding:"12px 0",borderRadius:12,border:"none",cursor:"pointer"}}>Se connecter</button>
              <button type="button" onClick={()=>setShowLogin(false)} style={{background:"none",border:"none",color:"#aaa",fontSize:13,cursor:"pointer"}}>Annuler</button>
            </form>
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