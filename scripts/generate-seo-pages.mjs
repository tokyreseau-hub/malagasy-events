import fs from 'node:fs/promises'
import path from 'node:path'
import { supabase } from '../src/supabase.js'

const SITE='https://www.malagasy-events.com'
const DIST=path.resolve('dist')
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const slug=v=>String(v??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')
const clean=v=>String(v??'').replace(/\s+/g,' ').trim()
const iso=new Date().toISOString().slice(0,10)

const base=await fs.readFile(path.join(DIST,'index.html'),'utf8')
const query=async table=>{ try{const {data,error}=await supabase.from(table).select('*'); if(error) throw error; return data||[]}catch(e){console.warn(`SEO: ${table} indisponible (${e.message})`);return[]} }
const [gastro,orgas,lieux,events]=await Promise.all(['gastro','organisateurs','lieux','events'].map(query))

const typeFor=e=>e.kind==='restaurant'?'Restaurant':e.kind==='boutique'?'Store':e.kind==='eglise'?'Church':'Organization'
const entityPath=e=>({restaurant:'restaurant',professionnel:'professionnel',sportif:'sportif',eglise:'eglise',boutique:'boutique',artisan:'artisan'}[e.kind])
const entityUrl=e=>`/${entityPath(e)}/${slug(e.name)}`
const labelFor=e=>({restaurant:'Restaurant ou traiteur malgache',professionnel:'Professionnel ou association malagasy',sportif:'Club sportif malagasy',eglise:'Église malagasy',boutique:'Boutique malgache',artisan:'Artisanat malgache'}[e.kind])

const entities=[
  ...gastro.map(x=>({...x,kind:'restaurant'})),
  ...orgas.map(x=>({...x,kind:String(x.type||'').toLowerCase().includes('sport')?'sportif':'professionnel'})),
  ...lieux.filter(x=>['eglise','boutique','artisanat'].includes(x.category)).map(x=>({...x,kind:x.category==='artisanat'?'artisan':x.category})),
].filter(x=>x.name)

function metadata(html,{title,description,url,jsonLd,body}){
  const canonical=SITE+url
  html=html.replace(/<title>.*?<\/title>/s,`<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/,`<meta name="description" content="${esc(description)}" />`)
    .replace(/<link rel="canonical" href="[^"]*"\s*\/?>/,`<link rel="canonical" href="${canonical}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/?>/,`<meta property="og:title" content="${esc(title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/?>/,`<meta property="og:description" content="${esc(description)}" />`)
    .replace(/<meta property="og:url" content="[^"]*"\s*\/?>/,`<meta property="og:url" content="${canonical}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*"\s*\/?>/,`<meta name="twitter:title" content="${esc(title)}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*"\s*\/?>/,`<meta name="twitter:description" content="${esc(description)}" />`)
  const ld=JSON.stringify(jsonLd).replace(/</g,'\\u003c')
  html=html.replace('</head>',`<script type="application/ld+json">${ld}</script></head>`)
  html=html.replace('<div id="root"></div>',`<div id="root"><main class="seo-snapshot" style="max-width:980px;margin:40px auto;padding:0 20px;font-family:Arial,sans-serif;color:#222"><a href="/" style="color:#C8102E;font-weight:700">Malagasy Events</a>${body}</main></div>`)
  return html
}
async function write(url,html){const dir=path.join(DIST,url.replace(/^\//,''));await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,'index.html'),html)}

const categoryDefs=[
  {url:'/gastronomie',title:'Restaurants malgaches en France : adresses et traiteurs | Malagasy Events',desc:'Trouvez un restaurant malgache, un traiteur ou un food truck malagasy en France : noms, villes, adresses et contacts.',items:entities.filter(x=>x.kind==='restaurant')},
  {url:'/organisateurs',title:'Professionnels et associations malagasy en France | Malagasy Events',desc:'Annuaire des professionnels, associations, médias et organisateurs malagasy présents en France.',items:entities.filter(x=>x.kind==='professionnel')},
  {url:'/sportifs',title:'Clubs et associations sportives malagasy en France | Malagasy Events',desc:'Retrouvez les clubs, tournois et associations sportives de la communauté malagasy en France.',items:entities.filter(x=>x.kind==='sportif')},
  {url:'/tournois',title:'Tournois sportifs malagasy en France | Malagasy Events',desc:'Suivez les calendriers, résultats, classements et équipes des compétitions sportives malagasy en France, dont la Ligue Clichy Madagascar.',items:[]},
  {url:'/eglises',title:'Églises et communautés chrétiennes malagasy en France | Malagasy Events',desc:'Annuaire des églises, paroisses et communautés chrétiennes malagasy en France.',items:entities.filter(x=>x.kind==='eglise')},
  {url:'/boutiques',title:'Boutiques malgaches et épiceries de Madagascar en France | Malagasy Events',desc:'Trouvez des boutiques, épiceries et produits malgaches en France.',items:entities.filter(x=>x.kind==='boutique')},
  {url:'/artisanat',title:'Artisans et créations malgaches en France | Malagasy Events',desc:'Découvrez les artisans malagasy, le raphia, la vannerie, les bijoux et les créations de Madagascar en France.',items:entities.filter(x=>x.kind==='artisan')},
]

for(const c of categoryDefs){
  const body=`<h1>${esc(c.title.split('|')[0].trim())}</h1><p>${esc(c.desc)}</p><ul>${c.items.map(x=>`<li><a href="${entityUrl(x)}">${esc(x.name)}</a>${x.city?` — ${esc(x.city)}`:''}${x.note?`<p>${esc(clean(x.note))}</p>`:''}</li>`).join('')}</ul>`
  const ld={'@context':'https://schema.org','@type':'ItemList',name:c.title,itemListElement:c.items.map((x,i)=>({'@type':'ListItem',position:i+1,url:SITE+entityUrl(x),name:x.name}))}
  await write(c.url,metadata(base,{title:c.title,description:c.desc,url:c.url,jsonLd:ld,body}))
}

for(const e of entities){
  const label=labelFor(e), url=entityUrl(e), place=e.city?` à ${e.city}`:''
  const title=`${e.name}${place} | ${label}`.slice(0,65)
  const description=clean(`${e.name}${place}. ${e.note||`${label} référencé dans l'annuaire Malagasy Events.`}`).slice(0,160)
  const jsonLd={'@context':'https://schema.org','@type':typeFor(e),name:e.name,url:SITE+url,description:e.note||undefined,servesCuisine:e.kind==='restaurant'?'Malgache':undefined,telephone:e.phone||undefined,address:(e.address||e.city)?{'@type':'PostalAddress',streetAddress:e.address||undefined,addressLocality:e.city||undefined,addressRegion:e.region||undefined,addressCountry:'FR'}:undefined,geo:e.lat&&e.lng?{'@type':'GeoCoordinates',latitude:e.lat,longitude:e.lng}:undefined,sameAs:[e.site,e.fb,e.insta].filter(Boolean)}
  const body=`<nav><a href="${e.kind==='restaurant'?'/gastronomie':e.kind==='sportif'?'/sportifs':e.kind==='eglise'?'/eglises':e.kind==='boutique'?'/boutiques':e.kind==='artisan'?'/artisanat':'/organisateurs'}">← Annuaire</a></nav><article><p>${esc(label)}</p><h1>${esc(e.name)}</h1>${e.city?`<p><strong>Ville :</strong> ${esc(e.city)}</p>`:''}${e.address?`<p><strong>Adresse :</strong> ${esc(e.address)}</p>`:''}${e.phone?`<p><strong>Téléphone :</strong> ${esc(e.phone)}</p>`:''}${e.note?`<p>${esc(clean(e.note))}</p>`:''}</article>`
  await write(url,metadata(base,{title,description,url,jsonLd,body}))
}

const eventUrls=events.filter(x=>x.title).map(x=>`/evenement/${slug(x.title)}`)
const staticUrls=['/','/gastronomie','/organisateurs','/sportifs','/tournois','/eglises','/boutiques','/artisanat','/diaspora-malgache-france','/guide-france','/a-propos','/contact','/faq']
const urls=[...new Set([...staticUrls,...categoryDefs.map(x=>x.url),...entities.map(entityUrl),...eventUrls])]
const sitemap=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u=>`  <url><loc>${SITE}${u}</loc><lastmod>${iso}</lastmod><changefreq>${u==='/'?'daily':'weekly'}</changefreq></url>`).join('\n')}\n</urlset>\n`
await fs.writeFile(path.join(DIST,'sitemap.xml'),sitemap)
console.log(`SEO: ${categoryDefs.length} annuaires et ${entities.length} fiches générés.`)
