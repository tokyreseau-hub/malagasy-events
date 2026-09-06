import { useCallback, useEffect, useMemo, useState } from "react"
import { supabase } from "./supabase"

const RED="#C8102E",GREEN="#007A3D",WHITE="#FFFFFF"
const DEFAULT_CATEGORIES=[
  {id:"fallback-cours",name:"Cours et apprentissage",slug:"cours-apprentissage",emoji:"🎓"},
  {id:"fallback-emploi",name:"Emploi et services",slug:"emploi-services",emoji:"💼"},
  {id:"fallback-logement",name:"Logement",slug:"logement",emoji:"🏠"},
  {id:"fallback-covoiturage",name:"Covoiturage",slug:"covoiturage",emoji:"🚗"},
  {id:"fallback-vente",name:"Vente et don",slug:"vente-don",emoji:"🛍️"},
  {id:"fallback-entraide",name:"Entraide",slug:"entraide",emoji:"🤝"},
  {id:"fallback-autres",name:"Autres demandes",slug:"autres-demandes",emoji:"📌"},
]
const CATEGORY_EMOJI={"cours-apprentissage":"🎓","emploi-services":"💼",logement:"🏠",covoiturage:"🚗","vente-don":"🛍️",entraide:"🤝","autres-demandes":"📌"}
const STATUS={pending:["En attente","#fff3e0","#a34f00"],changes_requested:["À modifier","#fff3e0","#a34f00"],approved:["Publiée","#eaf6ef",GREEN],rejected:["Refusée","#fde8ec",RED],closed:["Clôturée","#f1f1f1","#666"],expired:["Expirée","#f1f1f1","#666"],removed:["Retirée","#fde8ec",RED]}
const emptyForm={kind:"cherche",title:"",description:"",categoryChoice:"",proposedCategory:"",city:"",department:"",priceLabel:"",files:[],existingImages:[]}
const inputStyle={width:"100%",boxSizing:"border-box",border:"1.5px solid #e4e4e4",borderRadius:12,padding:"11px 13px",fontSize:14,outline:"none",background:WHITE}
const labelStyle={display:"block",fontSize:12,fontWeight:800,color:"#555",marginBottom:6}
const slugifyCategory=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,70)
const formatDate=value=>value?new Date(value).toLocaleDateString("fr-FR",{day:"numeric",month:"short",year:"numeric"}):"—"

function StatusBadge({status}){
  const [label,bg,color]=STATUS[status]||[status,"#f1f1f1","#666"]
  return <span style={{background:bg,color,fontSize:10,fontWeight:900,padding:"4px 8px",borderRadius:99,whiteSpace:"nowrap"}}>{label}</span>
}

async function uploadPhotos(files,userId){
  const urls=[]
  for(const [index,file] of files.entries()){
    if(!file.type.startsWith("image/")) throw new Error("Choisis uniquement des images.")
    if(file.size>5*1024*1024) throw new Error("Chaque photo doit faire moins de 5 Mo.")
    const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")
    const path=`${userId}/classifieds/${Date.now()}-${index}.${ext||"jpg"}`
    const {error}=await supabase.storage.from("avatars").upload(path,file,{upsert:false,cacheControl:"3600"})
    if(error) throw new Error(error.message)
    urls.push(supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl)
  }
  return urls
}

function ClassifiedForm({categories,user,initial,onCancel,onSaved,databaseReady}){
  const [form,setForm]=useState(()=>initial?{
    kind:initial.kind,title:initial.title,description:initial.description,
    categoryChoice:initial.category_id?String(initial.category_id):"__new__",
    proposedCategory:initial.proposed_category||"",city:initial.city,department:initial.department||"",
    priceLabel:initial.price_label||"",files:[],existingImages:initial.images||[],
  }:{...emptyForm})
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState("")
  const set=(key,value)=>setForm(current=>({...current,[key]:value}))
  const submit=async event=>{
    event.preventDefault();setError("")
    if(!databaseReady){setError("Le lot Supabase Petites annonces doit être installé avant le premier envoi.");return}
    if(!form.categoryChoice){setError("Choisis une catégorie ou propose-en une nouvelle.");return}
    if(form.categoryChoice==="__new__"&&form.proposedCategory.trim().length<2){setError("Écris le nom de la catégorie proposée.");return}
    setSaving(true)
    try{
      const added=await uploadPhotos(form.files,user.id)
      const payload={
        user_id:user.id,kind:form.kind,title:form.title.trim(),description:form.description.trim(),
        category_id:form.categoryChoice==="__new__"?null:Number(form.categoryChoice),
        proposed_category:form.categoryChoice==="__new__"?form.proposedCategory.trim():null,
        city:form.city.trim(),department:form.department.trim(),price_label:form.priceLabel.trim(),
        images:[...form.existingImages,...added].slice(0,3),contact_method:"messages",
      }
      const query=initial
        ? supabase.from("classifieds").update(payload).eq("id",initial.id).select("*").single()
        : supabase.from("classifieds").insert(payload).select("*").single()
      const {data,error:saveError}=await query
      if(saveError) throw new Error(saveError.message)
      onSaved(data,!!initial)
    }catch(saveError){setError(saveError.message||"Envoi impossible.")}
    finally{setSaving(false)}
  }
  const imageCount=form.existingImages.length+form.files.length
  return <form onSubmit={submit} style={{background:WHITE,borderRadius:22,padding:20,boxShadow:"0 8px 30px rgba(0,0,0,.10)",marginBottom:22}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:18}}><div><h3 style={{fontSize:19,margin:0}}>{initial?"Modifier mon annonce":"Publier une petite annonce"}</h3><p style={{fontSize:12,color:"#888",margin:"4px 0 0"}}>Elle sera vérifiée par l’équipe avant sa publication.</p></div><button type="button" onClick={onCancel} aria-label="Fermer" style={{border:"none",background:"#f2f2f2",borderRadius:99,width:34,height:34,fontSize:18,cursor:"pointer"}}>×</button></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:14}}>
      <label><span style={labelStyle}>Type d’annonce *</span><select value={form.kind} onChange={e=>set("kind",e.target.value)} style={inputStyle}><option value="cherche">🔍 Je cherche</option><option value="propose">📣 Je propose</option></select></label>
      <label><span style={labelStyle}>Catégorie *</span><select value={form.categoryChoice} onChange={e=>set("categoryChoice",e.target.value)} style={inputStyle} required><option value="">Choisir…</option>{categories.map(category=><option key={category.id} value={category.id}>{CATEGORY_EMOJI[category.slug]||"📌"} {category.name}</option>)}<option value="__new__">➕ Proposer une nouvelle catégorie</option></select></label>
    </div>
    {form.categoryChoice==="__new__"&&<label style={{display:"block",marginTop:14}}><span style={labelStyle}>Nom de la nouvelle catégorie *</span><input value={form.proposedCategory} onChange={e=>set("proposedCategory",e.target.value)} maxLength={80} placeholder="Ex. Garde d’enfants, traduction…" style={inputStyle} required/></label>}
    <label style={{display:"block",marginTop:14}}><span style={labelStyle}>Titre *</span><input value={form.title} onChange={e=>set("title",e.target.value)} minLength={5} maxLength={120} placeholder="Ex. Recherche professeur de malgache à Lyon" style={inputStyle} required/></label>
    <label style={{display:"block",marginTop:14}}><span style={labelStyle}>Description complète *</span><textarea value={form.description} onChange={e=>set("description",e.target.value)} minLength={20} maxLength={4000} rows={5} placeholder="Explique précisément ce que tu cherches ou proposes…" style={{...inputStyle,resize:"vertical",fontFamily:"system-ui,sans-serif"}} required/><span style={{display:"block",textAlign:"right",fontSize:10,color:"#aaa",marginTop:3}}>{form.description.length}/4000</span></label>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14,marginTop:14}}>
      <label><span style={labelStyle}>Ville ou zone *</span><input value={form.city} onChange={e=>set("city",e.target.value)} maxLength={120} placeholder="Lyon, Paris, à distance…" style={inputStyle} required/></label>
      <label><span style={labelStyle}>Département</span><input value={form.department} onChange={e=>set("department",e.target.value)} maxLength={80} placeholder="Ex. Rhône (69)" style={inputStyle}/></label>
      <label><span style={labelStyle}>Budget ou tarif</span><input value={form.priceLabel} onChange={e=>set("priceLabel",e.target.value)} maxLength={100} placeholder="Ex. 20 €/h, à discuter, gratuit" style={inputStyle}/></label>
    </div>
    <label style={{display:"block",marginTop:14}}><span style={labelStyle}>Photos facultatives — maximum 3</span><input type="file" accept="image/*" multiple disabled={imageCount>=3} onChange={e=>set("files",Array.from(e.target.files||[]).slice(0,Math.max(0,3-form.existingImages.length)))} style={{...inputStyle,padding:8}}/></label>
    {imageCount>0&&<div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>{form.existingImages.map((url,index)=><div key={url} style={{position:"relative"}}><img src={url} alt="" style={{width:76,height:62,objectFit:"cover",borderRadius:10}}/><button type="button" onClick={()=>set("existingImages",form.existingImages.filter((_,i)=>i!==index))} style={{position:"absolute",right:-5,top:-5,border:"none",background:RED,color:WHITE,borderRadius:99,width:20,height:20,cursor:"pointer"}}>×</button></div>)}{form.files.map(file=><span key={file.name} style={{fontSize:11,background:"#f2f2f2",padding:"7px 9px",borderRadius:9}}>{file.name}</span>)}</div>}
    <div style={{background:"#f4f8f5",border:"1px solid #dceadf",borderRadius:12,padding:"10px 12px",fontSize:12,color:"#49604f",marginTop:16}}>🔒 Le contact se fait par la messagerie Malagasy Events. Ton téléphone et ton adresse email ne seront pas affichés publiquement.</div>
    {error&&<p role="alert" style={{color:RED,fontSize:12,fontWeight:700,margin:"12px 0 0"}}>⚠️ {error}</p>}
    <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:18,flexWrap:"wrap"}}><button type="button" onClick={onCancel} style={{border:"none",background:"#f1f1f1",borderRadius:99,padding:"10px 16px",fontWeight:800,cursor:"pointer"}}>Annuler</button><button disabled={saving} style={{border:"none",background:GREEN,color:WHITE,borderRadius:99,padding:"10px 18px",fontWeight:900,cursor:"pointer",opacity:saving?.6:1}}>{saving?"Envoi…":initial?"Enregistrer et renvoyer":"Envoyer pour validation"}</button></div>
  </form>
}

function ClassifiedCard({ad,user,onMessage,onProfileClick,onEdit,onClose}){
  const category=ad.classified_categories
  const profile=ad.profiles||{}
  const mine=user?.id===ad.user_id
  return <article style={{background:WHITE,borderRadius:20,overflow:"hidden",boxShadow:"0 4px 18px rgba(0,0,0,.08)",border:"1px solid #eee",display:"flex",flexDirection:"column"}}>
    {ad.images?.[0]&&<img src={ad.images[0]} alt="" style={{width:"100%",height:180,objectFit:"cover"}}/>}
    <div style={{padding:17,display:"flex",flexDirection:"column",gap:10,flex:1}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}><span style={{fontSize:10,fontWeight:900,letterSpacing:.6,color:ad.kind==="cherche"?RED:GREEN}}>{ad.kind==="cherche"?"🔍 JE CHERCHE":"📣 JE PROPOSE"}</span>{mine&&<StatusBadge status={ad.status}/>}</div>
      <h3 style={{fontSize:18,lineHeight:1.25,margin:0,color:"#202020"}}>{ad.title}</h3>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}><span style={{fontSize:11,background:"#f3f3f3",padding:"5px 8px",borderRadius:99}}>{CATEGORY_EMOJI[category?.slug]||"📌"} {category?.name||ad.proposed_category||"À classer"}</span><span style={{fontSize:11,background:"#f3f3f3",padding:"5px 8px",borderRadius:99}}>📍 {ad.city}{ad.department?` · ${ad.department}`:""}</span>{ad.price_label&&<span style={{fontSize:11,background:"#fff6db",color:"#725600",padding:"5px 8px",borderRadius:99}}>💶 {ad.price_label}</span>}</div>
      <p style={{fontSize:13,color:"#555",lineHeight:1.55,whiteSpace:"pre-wrap",margin:0,flex:1}}>{ad.description}</p>
      {ad.moderation_note&&mine&&ad.status!=="approved"&&<div style={{fontSize:12,color:ad.status==="rejected"?RED:"#9a5d00",background:ad.status==="rejected"?"#fff1f3":"#fff8e8",borderRadius:10,padding:"9px 10px"}}><b>Message de la modération :</b> {ad.moderation_note}</div>}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,borderTop:"1px solid #f1f1f1",paddingTop:11,flexWrap:"wrap"}}><button onClick={()=>onProfileClick?.(ad.user_id,profile.username)} style={{border:"none",background:"none",padding:0,fontSize:11,color:"#777",fontWeight:700,cursor:"pointer"}}>@{profile.username||"membre"} · {formatDate(ad.published_at||ad.submitted_at)}</button><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{mine&&["pending","changes_requested","approved"].includes(ad.status)&&<button onClick={()=>onEdit(ad)} style={{border:"none",background:"#f1f1f1",borderRadius:99,padding:"7px 10px",fontSize:11,fontWeight:800,cursor:"pointer"}}>✏️ Modifier</button>}{mine&&!["closed","rejected","removed","expired"].includes(ad.status)&&<button onClick={()=>onClose(ad)} style={{border:"none",background:"#fde8ec",color:RED,borderRadius:99,padding:"7px 10px",fontSize:11,fontWeight:800,cursor:"pointer"}}>Clôturer</button>}{!mine&&<button onClick={()=>onMessage(ad.user_id,profile.username)} style={{border:"none",background:GREEN,color:WHITE,borderRadius:99,padding:"8px 11px",fontSize:11,fontWeight:900,cursor:"pointer"}}>✉️ Envoyer un message</button>}</div></div>
    </div>
  </article>
}

export function ClassifiedsPage({user,onAuthRequired,onMessage,onProfileClick}){
  const [categories,setCategories]=useState(DEFAULT_CATEGORIES)
  const [ads,setAds]=useState([])
  const [loading,setLoading]=useState(true)
  const [databaseReady,setDatabaseReady]=useState(true)
  const [loadError,setLoadError]=useState("")
  const [search,setSearch]=useState("")
  const [kind,setKind]=useState("all")
  const [category,setCategory]=useState("all")
  const [mineOnly,setMineOnly]=useState(false)
  const [showForm,setShowForm]=useState(false)
  const [editing,setEditing]=useState(null)
  const [notice,setNotice]=useState("")
  const load=useCallback(async()=>{
    setLoading(true);setLoadError("")
    const categoryResult=await supabase.from("classified_categories").select("id,name,slug,active").eq("active",true).order("name")
    if(categoryResult.error){setDatabaseReady(false);setCategories(DEFAULT_CATEGORIES);setAds([]);setLoading(false);return}
    setDatabaseReady(true);setCategories(categoryResult.data||[])
    let query=supabase.from("classifieds").select("*,classified_categories(id,name,slug),profiles!classifieds_user_id_fkey(id,username,avatar_url,plan,is_member,created_at)").order("submitted_at",{ascending:false}).limit(100)
    const {data,error}=await query
    if(error){setLoadError("Impossible de charger les petites annonces.");setAds([])}else setAds(data||[])
    setLoading(false)
  },[])
  useEffect(()=>{const timer=window.setTimeout(()=>{void load()},0);return()=>window.clearTimeout(timer)},[load,user?.id])
  const visible=useMemo(()=>ads.filter(ad=>{
    if(mineOnly&&ad.user_id!==user?.id)return false
    if(!mineOnly&&ad.status!=="approved")return false
    if(kind!=="all"&&ad.kind!==kind)return false
    if(category!=="all"&&String(ad.category_id)!==String(category))return false
    const haystack=`${ad.title} ${ad.description} ${ad.city} ${ad.department} ${ad.classified_categories?.name||ad.proposed_category||""}`.toLowerCase()
    return haystack.includes(search.trim().toLowerCase())
  }),[ads,mineOnly,user?.id,kind,category,search])
  const requestPublish=()=>{if(!user){onAuthRequired();return}setEditing(null);setShowForm(true);setNotice("");window.scrollTo({top:0,behavior:"smooth"})}
  const saveDone=(saved,wasEdit)=>{setShowForm(false);setEditing(null);setNotice(wasEdit?"Ton annonce a été renvoyée à la modération.":"Annonce envoyée ! L’admin vient d’être notifié.");load();setMineOnly(true)}
  const closeAd=async ad=>{if(!window.confirm("Clôturer cette annonce ? Elle ne sera plus visible publiquement."))return;const {error}=await supabase.from("classifieds").update({status:"closed"}).eq("id",ad.id);if(error)alert("⚠️ "+error.message);else{setNotice("Annonce clôturée.");load()}}
  const messageAuthor=(id,name)=>{if(!user){onAuthRequired();return}onMessage(id,name)}
  return <main style={{maxWidth:1180,margin:"0 auto",padding:"30px 16px 80px"}}>
    <section style={{background:"linear-gradient(125deg,#8f0e22,#C8102E 45%,#007A3D 125%)",borderRadius:26,padding:"30px 24px",color:WHITE,boxShadow:"0 10px 30px rgba(0,0,0,.14)",marginBottom:22}}><div style={{maxWidth:760}}><p style={{fontSize:11,fontWeight:900,letterSpacing:1.5,margin:"0 0 7px"}}>ENTRAIDE · SERVICES · OPPORTUNITÉS</p><h2 style={{fontSize:34,lineHeight:1.05,margin:"0 0 10px"}}>📌 Petites annonces</h2><p style={{fontSize:15,lineHeight:1.55,margin:"0 0 20px",color:"rgba(255,255,255,.9)"}}>Trouvez un cours, un service, un logement, un covoiturage ou proposez votre aide à la communauté malagasy.</p><button onClick={requestPublish} style={{background:WHITE,color:RED,border:"none",borderRadius:99,padding:"12px 18px",fontSize:13,fontWeight:900,cursor:"pointer"}}>＋ Publier une annonce gratuitement</button></div></section>
    {!databaseReady&&<div style={{background:"#fff8e8",border:"1px solid #eed89c",color:"#6b5419",borderRadius:14,padding:"12px 14px",fontSize:12,marginBottom:18}}>🧩 L’interface est prête. Le lot Supabase isolé doit encore être installé pour enregistrer les annonces.</div>}
    {notice&&<div role="status" style={{background:"#eaf6ef",border:"1px solid #cfe5d5",color:GREEN,borderRadius:14,padding:"12px 14px",fontSize:13,fontWeight:800,marginBottom:18}}>{notice}</div>}
    {showForm&&<ClassifiedForm categories={categories} user={user} initial={editing} databaseReady={databaseReady} onCancel={()=>{setShowForm(false);setEditing(null)}} onSaved={saveDone}/>}    
    <section style={{background:WHITE,borderRadius:18,padding:14,boxShadow:"0 3px 14px rgba(0,0,0,.06)",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:9,marginBottom:14}}><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher une annonce, une ville…" style={inputStyle}/><select value={kind} onChange={e=>setKind(e.target.value)} style={inputStyle}><option value="all">Tous les types</option><option value="cherche">Je cherche</option><option value="propose">Je propose</option></select><select value={category} onChange={e=>setCategory(e.target.value)} style={inputStyle}><option value="all">Toutes les catégories</option>{categories.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></section>
    {user&&<div style={{display:"flex",gap:8,marginBottom:18}}><button onClick={()=>setMineOnly(false)} style={{border:"none",borderRadius:99,padding:"8px 12px",fontSize:12,fontWeight:800,cursor:"pointer",background:mineOnly?"#f1f1f1":GREEN,color:mineOnly?"#555":WHITE}}>Annonces publiées</button><button onClick={()=>setMineOnly(true)} style={{border:"none",borderRadius:99,padding:"8px 12px",fontSize:12,fontWeight:800,cursor:"pointer",background:mineOnly?GREEN:"#f1f1f1",color:mineOnly?WHITE:"#555"}}>Mes annonces</button></div>}
    {loading?<p style={{textAlign:"center",color:"#999",padding:40}}>Chargement des annonces…</p>:loadError?<div style={{textAlign:"center",padding:35}}><p style={{color:RED,fontWeight:700}}>{loadError}</p><button onClick={load} style={{border:"none",background:RED,color:WHITE,borderRadius:99,padding:"9px 14px",fontWeight:800,cursor:"pointer"}}>Réessayer</button></div>:visible.length===0?<div style={{background:WHITE,borderRadius:18,padding:"42px 20px",textAlign:"center",boxShadow:"0 3px 14px rgba(0,0,0,.06)"}}><p style={{fontSize:34,margin:"0 0 8px"}}>📌</p><p style={{fontWeight:900,margin:0}}>{mineOnly?"Tu n’as pas encore soumis d’annonce.":"Aucune annonce ne correspond à ta recherche."}</p><button onClick={requestPublish} style={{marginTop:14,border:"none",background:GREEN,color:WHITE,borderRadius:99,padding:"9px 14px",fontWeight:800,cursor:"pointer"}}>Publier la première annonce</button></div>:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:16}}>{visible.map(ad=><ClassifiedCard key={ad.id} ad={ad} user={user} onMessage={messageAuthor} onProfileClick={onProfileClick} onEdit={item=>{setEditing(item);setShowForm(true);window.scrollTo({top:0,behavior:"smooth"})}} onClose={closeAd}/>)}</div>}
  </main>
}

export function ClassifiedsAdmin(){
  const [items,setItems]=useState([])
  const [categories,setCategories]=useState([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState("")
  const [notes,setNotes]=useState({})
  const [chosenCategories,setChosenCategories]=useState({})
  const [busyId,setBusyId]=useState(null)
  const load=useCallback(async()=>{
    setLoading(true);setError("")
    const [adsResult,categoriesResult]=await Promise.all([
      supabase.from("classifieds").select("*,classified_categories(id,name,slug),profiles!classifieds_user_id_fkey(id,username,email,avatar_url,plan,is_member,created_at)").order("submitted_at",{ascending:false}).limit(300),
      supabase.from("classified_categories").select("*").order("name"),
    ])
    if(adsResult.error){setError(adsResult.error.message);setItems([])}else setItems(adsResult.data||[])
    setCategories(categoriesResult.data||[]);setLoading(false)
  },[])
  useEffect(()=>{const timer=window.setTimeout(()=>{void load()},0);return()=>window.clearTimeout(timer)},[load])
  const uniqueSlug=async name=>{
    const base=slugifyCategory(name)||"nouvelle-categorie"
    const {data}=await supabase.from("classified_categories").select("slug").like("slug",`${base}%`)
    const used=new Set((data||[]).map(row=>row.slug));if(!used.has(base))return base
    let index=2;while(used.has(`${base}-${index}`))index+=1;return `${base}-${index}`
  }
  const moderate=async(item,status)=>{
    const note=(notes[item.id]||"").trim()
    if(["changes_requested","rejected","removed"].includes(status)&&note.length<5){alert("Ajoute un motif précis pour l’auteur.");return}
    setBusyId(item.id)
    try{
      let categoryId=item.category_id
      const chosen=chosenCategories[item.id]
      if(chosen)categoryId=Number(chosen)
      if(status==="approved"&&!categoryId&&item.proposed_category){
        const existing=categories.find(category=>category.name.toLowerCase()===item.proposed_category.trim().toLowerCase())
        if(existing)categoryId=existing.id
        else{
          const slug=await uniqueSlug(item.proposed_category)
          const {data,error:createError}=await supabase.from("classified_categories").insert({name:item.proposed_category.trim(),slug,active:true,approved_at:new Date().toISOString()}).select().single()
          if(createError)throw createError
          categoryId=data.id
        }
      }
      if(status==="approved"&&!categoryId)throw new Error("Choisis ou crée une catégorie avant de publier.")
      const payload={status,moderation_note:note,category_id:categoryId||item.category_id,proposed_category:categoryId?null:item.proposed_category}
      const {error:updateError}=await supabase.from("classifieds").update(payload).eq("id",item.id)
      if(updateError)throw updateError
      await load()
    }catch(actionError){alert("⚠️ "+(actionError.message||"Action impossible"))}
    finally{setBusyId(null)}
  }
  if(loading)return <p style={{textAlign:"center",color:"#999",padding:30}}>Chargement des annonces…</p>
  if(error)return <div style={{background:"#fff1f3",color:RED,borderRadius:12,padding:14,fontSize:12}}>⚠️ {error}<br/><b>Le lot Supabase Petites annonces n’est peut-être pas encore installé.</b></div>
  return <div><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:14,flexWrap:"wrap"}}><div><h3 style={{margin:0}}>📌 Petites annonces</h3><p style={{fontSize:12,color:"#888",margin:"4px 0 0"}}>{items.filter(item=>item.status==="pending").length} annonce(s) en attente · {items.length} au total</p></div><button onClick={load} style={{border:"none",background:"#f1f1f1",borderRadius:99,padding:"8px 12px",fontWeight:800,cursor:"pointer"}}>↻ Actualiser</button></div>
    {items.length===0?<p style={{background:WHITE,borderRadius:14,padding:30,textAlign:"center",color:"#999"}}>Aucune petite annonce.</p>:items.map(item=>{const profile=item.profiles||{};const proposed=!item.category_id&&item.proposed_category;return <article key={item.id} style={{background:WHITE,borderRadius:18,padding:16,marginBottom:14,boxShadow:"0 3px 14px rgba(0,0,0,.07)",borderLeft:`5px solid ${item.status==="pending"?"#e6a700":item.status==="approved"?GREEN:item.status==="rejected"||item.status==="removed"?RED:"#bbb"}`}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"flex-start",flexWrap:"wrap"}}><div><div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}><StatusBadge status={item.status}/><b style={{fontSize:15}}>{item.title}</b></div><p style={{fontSize:11,color:"#999",margin:"5px 0 0"}}>Soumise le {new Date(item.submitted_at).toLocaleString("fr-FR")}</p></div><span style={{fontSize:11,fontWeight:900,color:item.kind==="cherche"?RED:GREEN}}>{item.kind==="cherche"?"🔍 JE CHERCHE":"📣 JE PROPOSE"}</span></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:10,marginTop:13}}><div style={{background:"#f7f7f7",borderRadius:12,padding:11,fontSize:12,lineHeight:1.6}}><b>Auteur</b><br/>@{profile.username||"?"}<br/>{profile.email||"Email non disponible"}<br/>Compte créé : {formatDate(profile.created_at)}<br/>Formule : {profile.plan||"gratuit"} · {profile.is_member?"membre":"compte inscrit"}</div><div style={{background:"#f7f7f7",borderRadius:12,padding:11,fontSize:12,lineHeight:1.6}}><b>Informations</b><br/>📍 {item.city}{item.department?` · ${item.department}`:""}<br/>💶 {item.price_label||"Non renseigné"}<br/>Contact : messagerie interne<br/>Expiration : {item.expires_at?formatDate(item.expires_at):"après validation"}</div><div style={{background:proposed?"#fff8e8":"#f7f7f7",borderRadius:12,padding:11,fontSize:12,lineHeight:1.6}}><b>Catégorie</b><br/>{item.classified_categories?.name||"Nouvelle proposition"}{proposed&&<><br/><strong style={{color:"#9a5d00"}}>« {item.proposed_category} »</strong><br/><span>Accepter cette catégorie ou rattacher l’annonce :</span><select value={chosenCategories[item.id]||""} onChange={event=>setChosenCategories(current=>({...current,[item.id]:event.target.value}))} style={{...inputStyle,padding:"7px 9px",fontSize:11,marginTop:5}}><option value="">Créer « {item.proposed_category} »</option>{categories.filter(category=>category.active).map(category=><option key={category.id} value={category.id}>{category.name}</option>)}</select></>}</div></div>
      <p style={{fontSize:13,lineHeight:1.55,whiteSpace:"pre-wrap",color:"#333",margin:"13px 0"}}>{item.description}</p>
      {item.images?.length>0&&<div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>{item.images.map(url=><a key={url} href={url} target="_blank" rel="noreferrer"><img src={url} alt="Pièce jointe" style={{width:90,height:70,objectFit:"cover",borderRadius:10}}/></a>)}</div>}
      <textarea value={notes[item.id]??item.moderation_note??""} onChange={event=>setNotes(current=>({...current,[item.id]:event.target.value}))} placeholder="Motif ou message adressé à l’auteur…" rows={2} style={{...inputStyle,resize:"vertical",fontFamily:"system-ui,sans-serif",fontSize:12}}/>
      <div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:10}}><button disabled={busyId===item.id} onClick={()=>moderate(item,"approved")} style={{border:"none",background:GREEN,color:WHITE,borderRadius:99,padding:"8px 12px",fontSize:11,fontWeight:900,cursor:"pointer"}}>✓ Accepter et publier</button><button disabled={busyId===item.id} onClick={()=>moderate(item,"changes_requested")} style={{border:"none",background:"#fff3e0",color:"#9a5d00",borderRadius:99,padding:"8px 12px",fontSize:11,fontWeight:900,cursor:"pointer"}}>✏️ Demander une modification</button><button disabled={busyId===item.id} onClick={()=>moderate(item,"rejected")} style={{border:"none",background:"#fde8ec",color:RED,borderRadius:99,padding:"8px 12px",fontSize:11,fontWeight:900,cursor:"pointer"}}>Refuser</button>{item.status==="approved"&&<button disabled={busyId===item.id} onClick={()=>moderate(item,"removed")} style={{border:"none",background:"#222",color:WHITE,borderRadius:99,padding:"8px 12px",fontSize:11,fontWeight:900,cursor:"pointer"}}>Retirer</button>}</div>
    </article>})}
  </div>
}
