import { useState } from "react"

const RED   = "#C8102E"
const GREEN = "#007A3D"
const WHITE = "#FFFFFF"

const ADMIN_PASSWORD = "malagasy2026"

const today = new Date()
today.setHours(0, 0, 0, 0)

const initialEvents = [
  {
    id: 1,
    title: "Soirée Malagasy Paris",
    date: "2026-07-12",
    location: "Paris 11ème",
    city: "Paris",
    category: "Soirée",
    image: "https://images.unsplash.com/photo-1533317480453-7a4b6ad0a174?w=400",
    price: "15€",
    organizer: "Mafana Vibes",
    ticketUrl: "https://helloasso.com",
    mediaUrls: [],
  },
  {
    id: 2,
    title: "Hira Gasy Île-de-France",
    date: "2026-07-20",
    location: "Créteil",
    city: "Paris",
    category: "Culture",
    image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400",
    price: "10€",
    organizer: "Association Soa",
    ticketUrl: "",
    mediaUrls: [],
  },
  {
    id: 3,
    title: "Repas Communautaire Malgache",
    date: "2025-03-10",
    location: "Lyon",
    city: "Lyon",
    category: "Gastronomie",
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400",
    price: "Gratuit",
    organizer: "Malagasy Lyon",
    ticketUrl: "",
    mediaUrls: [
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400",
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400",
    ],
  },
]

const CATEGORY_COLORS = {
  Soirée:      { bg: "#fde8ec", color: RED },
  Culture:     { bg: "#e6f4ed", color: GREEN },
  Gastronomie: { bg: "#fff3e0", color: "#e65100" },
  Sport:       { bg: "#e3f2fd", color: "#1565c0" },
  Religion:    { bg: "#fff8e1", color: "#f57f17" },
  Autre:       { bg: "#f5f5f5", color: "#555" },
}

const CITIES     = ["Toutes", "Paris", "Lyon", "Marseille", "Bordeaux", "Lille", "Toulouse"]
const CATEGORIES = ["Toutes", "Soirée", "Culture", "Gastronomie", "Sport", "Religion", "Autre"]

const EMPTY_FORM = {
  title: "", date: "", location: "", city: "Paris",
  category: "Soirée", price: "", organizer: "", ticketUrl: "",
  image: "https://images.unsplash.com/photo-1533317480453-7a4b6ad0a174?w=400",
  mediaUrls: [],
}

const isPast = (dateStr) => new Date(dateStr) < today

/* ── Galerie média ───────────────────────────────── */
function MediaGallery({ urls }) {
  const [selected, setSelected] = useState(null)
  if (!urls || urls.length === 0) return null

  const isVideo = (url) => url.match(/\.(mp4|webm|ogg|mov)$/i) || url.includes("youtube") || url.includes("youtu.be")

  return (
    <div style={{ marginTop: 12 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
        📸 Photos & vidéos
      </p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {urls.map((url, i) => (
          <div key={i} onClick={() => setSelected(url)} style={{ cursor: "pointer", width: 64, height: 64, borderRadius: 10, overflow: "hidden", position: "relative" }}>
            {isVideo(url) ? (
              <div style={{ width: "100%", height: "100%", background: "#111", display: "flex", alignItems: "center", justifyContent: "center", color: WHITE, fontSize: 22 }}>▶</div>
            ) : (
              <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 24 }}>
          {isVideo(selected) ? (
            selected.includes("youtube") || selected.includes("youtu.be") ? (
              <iframe src={selected.replace("watch?v=", "embed/")} width="800" height="450" style={{ maxWidth: "100%", borderRadius: 12, border: "none" }} allowFullScreen />
            ) : (
              <video src={selected} controls autoPlay style={{ maxWidth: "100%", maxHeight: "80vh", borderRadius: 12 }} />
            )
          ) : (
            <img src={selected} alt="" style={{ maxWidth: "100%", maxHeight: "80vh", borderRadius: 12, objectFit: "contain" }} />
          )}
          <button onClick={() => setSelected(null)} style={{ position: "absolute", top: 16, right: 20, background: "none", border: "none", color: WHITE, fontSize: 32, cursor: "pointer" }}>×</button>
        </div>
      )}
    </div>
  )
}

/* ── Carte événement ─────────────────────────────── */
function EventCard({ event, past }) {
  const [reminded, setReminded]   = useState(false)
  const [toast, setToast]         = useState(false)
  const [expanded, setExpanded]   = useState(false)
  const cat = CATEGORY_COLORS[event.category] || CATEGORY_COLORS.Autre

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })

  const handleRemind = () => {
    if (!reminded) { setToast(true); setTimeout(() => setToast(false), 2500) }
    setReminded(!reminded)
  }

  return (
    <div style={{
      background: WHITE, borderRadius: 20, overflow: "hidden", display: "flex", flexDirection: "column",
      boxShadow: past ? "0 1px 6px rgba(0,0,0,0.06)" : "0 2px 12px rgba(0,0,0,0.09)",
      opacity: past ? 0.75 : 1,
      transition: "transform .2s, box-shadow .2s"
    }}
      onMouseEnter={e => { if (!past) { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.14)" } }}
      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = past ? "0 1px 6px rgba(0,0,0,0.06)" : "0 2px 12px rgba(0,0,0,0.09)" }}>

      {/* Image */}
      <div style={{ position: "relative" }}>
        <img src={event.image} alt={event.title} style={{ width: "100%", height: 180, objectFit: "cover", display: "block", filter: past ? "grayscale(40%)" : "none" }} />
        {past && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ background: "rgba(0,0,0,0.6)", color: WHITE, fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 99 }}>Terminé</span>
          </div>
        )}
      </div>

      {/* Contenu */}
      <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", height: 3, borderRadius: 99, overflow: "hidden", marginBottom: 12 }}>
          <div style={{ flex: 1, background: "#eee" }} />
          <div style={{ flex: 1, background: RED }} />
          <div style={{ flex: 1, background: GREEN }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ background: cat.bg, color: cat.color, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99 }}>
            {event.category}
          </span>
          <span style={{ color: RED, fontSize: 13, fontWeight: 800 }}>{event.price}</span>
        </div>

        <h3 style={{ fontWeight: 800, fontSize: 15, color: "#111", marginBottom: 8, lineHeight: 1.3 }}>{event.title}</h3>
        <p style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>📅 {formatDate(event.date)}</p>
        <p style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>📍 {event.location}</p>
        <p style={{ fontSize: 11, color: "#999", marginBottom: 12 }}>Par {event.organizer}</p>

        {/* Galerie média */}
        {event.mediaUrls && event.mediaUrls.length > 0 && (
          <div>
            <button onClick={() => setExpanded(!expanded)}
              style={{ background: "none", border: "none", color: GREEN, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0, marginBottom: 4 }}>
              {expanded ? "▲ Masquer les photos" : `📸 Voir les photos (${event.mediaUrls.length})`}
            </button>
            {expanded && <MediaGallery urls={event.mediaUrls} />}
          </div>
        )}

        {/* Boutons */}
        {!past && (
          <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 12 }}>
            {event.ticketUrl ? (
              <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer"
                style={{ flex: 1, background: RED, color: WHITE, fontWeight: 700, fontSize: 13, padding: "9px 0", borderRadius: 12, textAlign: "center", textDecoration: "none" }}>
                🎟 Voir les billets
              </a>
            ) : (
              <span style={{ flex: 1, background: "#f0f0f0", color: "#aaa", fontWeight: 600, fontSize: 13, padding: "9px 0", borderRadius: 12, textAlign: "center" }}>
                Billets bientôt
              </span>
            )}
            <div style={{ position: "relative" }}>
              <button onClick={handleRemind}
                style={{ background: reminded ? GREEN : "#f0f0f0", color: reminded ? WHITE : "#555", fontWeight: 700, fontSize: 13, padding: "9px 14px", borderRadius: 12, border: "none", cursor: "pointer" }}>
                {reminded ? "✓" : "🔔"}
              </button>
              {toast && (
                <span style={{ position: "absolute", bottom: "110%", left: "50%", transform: "translateX(-50%)", background: GREEN, color: WHITE, fontSize: 11, padding: "4px 10px", borderRadius: 8, whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
                  Rappel activé !
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── App principale ──────────────────────────────── */
export default function App() {
  const [events, setEvents]                 = useState(initialEvents)
  const [cityFilter, setCityFilter]         = useState("Toutes")
  const [categoryFilter, setCategoryFilter] = useState("Toutes")
  const [showForm, setShowForm]             = useState(false)
  const [form, setForm]                     = useState(EMPTY_FORM)
  const [search, setSearch]                 = useState("")
  const [mediaInput, setMediaInput]         = useState("")
  const [showPast, setShowPast]             = useState(false)
  const [isAdmin, setIsAdmin]               = useState(false)
  const [showLogin, setShowLogin]           = useState(false)
  const [pwInput, setPwInput]               = useState("")
  const [pwError, setPwError]               = useState(false)
  const [logoClicks, setLogoClicks]         = useState(0)

  const handleLogoClick = () => {
    const next = logoClicks + 1
    setLogoClicks(next)
    if (next >= 3) { setShowLogin(true); setLogoClicks(0) }
  }

  const handleLogin = (e) => {
    e.preventDefault()
    if (pwInput === ADMIN_PASSWORD) {
      setIsAdmin(true); setShowLogin(false); setPwInput(""); setPwError(false)
    } else {
      setPwError(true); setPwInput("")
    }
  }

  const applyFilters = (list) => {
    const q = search.toLowerCase()
    return list.filter(e =>
      (cityFilter === "Toutes" || e.city === cityFilter) &&
      (categoryFilter === "Toutes" || e.category === categoryFilter) &&
      (!q || e.title.toLowerCase().includes(q) || e.location.toLowerCase().includes(q) || e.organizer.toLowerCase().includes(q))
    )
  }

  const upcoming = applyFilters(events.filter(e => !isPast(e.date))).sort((a, b) => new Date(a.date) - new Date(b.date))
  const past     = applyFilters(events.filter(e => isPast(e.date))).sort((a, b) => new Date(b.date) - new Date(a.date))

  const handleSubmit = (e) => {
    e.preventDefault()
    setEvents([...events, { ...form, id: Date.now() }])
    setForm(EMPTY_FORM)
    setMediaInput("")
    setShowForm(false)
  }

  const addMedia = () => {
    if (mediaInput.trim()) {
      setForm({ ...form, mediaUrls: [...(form.mediaUrls || []), mediaInput.trim()] })
      setMediaInput("")
    }
  }

  const removeMedia = (i) => setForm({ ...form, mediaUrls: form.mediaUrls.filter((_, idx) => idx !== i) })

  const FilterBtn = ({ label, active, onClick }) => (
    <button onClick={onClick} style={{
      padding: "5px 14px", borderRadius: 99, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none",
      background: active ? RED : WHITE, color: active ? WHITE : "#555",
      boxShadow: active ? `0 2px 8px ${RED}55` : "0 1px 4px rgba(0,0,0,0.08)",
    }}>{label}</button>
  )

  const inputStyle = { width: "100%", border: "1.5px solid #e5e5e5", borderRadius: 12, padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box" }
  const labelStyle = { fontSize: 13, fontWeight: 600, color: "#444", display: "block", marginBottom: 6 }

  return (
    <div style={{ minHeight: "100vh", background: "#f6f6f6", fontFamily: "system-ui, sans-serif" }}>

      {/* ── HEADER ── */}
      <header style={{ background: RED, padding: "14px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div onClick={handleLogoClick} style={{ cursor: "default" }}>
            <h1 style={{ color: WHITE, fontWeight: 800, fontSize: 22, margin: 0 }}>🇲🇬 Malagasy Events</h1>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, margin: "2px 0 0" }}>Tous les événements malgaches en France</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isAdmin && (
              <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 600 }}>
                🔓 Admin
              </span>
            )}
            {isAdmin ? (
              <button onClick={() => setShowForm(true)} style={{ background: WHITE, color: RED, fontWeight: 700, fontSize: 13, padding: "9px 18px", borderRadius: 12, border: "none", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
                + Ajouter un événement
              </button>
            ) : null}
            {isAdmin && (
              <button onClick={() => setIsAdmin(false)} style={{ background: "rgba(255,255,255,0.15)", color: WHITE, fontWeight: 600, fontSize: 12, padding: "9px 14px", borderRadius: 12, border: "none", cursor: "pointer" }}>
                Déconnexion
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── BANDE TRICOLORE ── */}
      <div style={{ display: "flex", height: 6 }}>
        <div style={{ flex: 1, background: WHITE, borderBottom: "1px solid #ddd" }} />
        <div style={{ flex: 2, background: RED }} />
        <div style={{ flex: 2, background: GREEN }} />
      </div>

      {/* ── HERO ── */}
      <div style={{ background: GREEN, padding: "48px 24px", textAlign: "center" }}>
        <h2 style={{ color: WHITE, fontWeight: 800, fontSize: 28, margin: "0 0 8px" }}>Ne rate plus aucun événement 🎪</h2>
        <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 16, margin: "0 0 24px" }}>
          La communauté malgache de France réunie en un seul endroit
        </p>
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un événement, une ville..."
          style={{ maxWidth: 420, width: "100%", padding: "12px 20px", borderRadius: 99, border: "none", fontSize: 14, outline: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}
        />
      </div>

      {/* ── FILTRES ── */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 24px 0" }}>
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Ville</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {CITIES.map(c => <FilterBtn key={c} label={c} active={cityFilter === c} onClick={() => setCityFilter(c)} />)}
          </div>
        </div>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Catégorie</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {CATEGORIES.map(c => <FilterBtn key={c} label={c} active={categoryFilter === c} onClick={() => setCategoryFilter(c)} />)}
          </div>
        </div>
        {(cityFilter !== "Toutes" || categoryFilter !== "Toutes" || search) && (
          <button onClick={() => { setCityFilter("Toutes"); setCategoryFilter("Toutes"); setSearch("") }}
            style={{ marginTop: 12, background: "none", border: "none", color: RED, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
            ✕ Réinitialiser les filtres
          </button>
        )}
      </div>

      {/* ── PROCHAINS EVENTS ── */}
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "24px 24px 0" }}>
        <h3 style={{ fontWeight: 800, fontSize: 20, color: "#111", marginBottom: 20 }}>
          Prochains événements
          <span style={{ fontWeight: 400, fontSize: 14, color: "#999", marginLeft: 8 }}>({upcoming.length})</span>
        </h3>

        {upcoming.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#999" }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>📭</p>
            <p style={{ fontWeight: 600, color: "#555" }}>Aucun événement à venir</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24 }}>
            {upcoming.map(event => <EventCard key={event.id} event={event} past={false} />)}
          </div>
        )}
      </main>

      {/* ── EVENTS PASSÉS ── */}
      {past.length > 0 && (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <h3 style={{ fontWeight: 800, fontSize: 18, color: "#888", margin: 0 }}>
              Événements passés
              <span style={{ fontWeight: 400, fontSize: 14, marginLeft: 8 }}>({past.length})</span>
            </h3>
            <button onClick={() => setShowPast(!showPast)}
              style={{ background: "#eee", border: "none", borderRadius: 99, fontSize: 12, fontWeight: 600, color: "#666", padding: "4px 12px", cursor: "pointer" }}>
              {showPast ? "Masquer" : "Afficher"}
            </button>
          </div>

          {showPast && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24 }}>
              {past.map(event => <EventCard key={event.id} event={event} past={true} />)}
            </div>
          )}
        </div>
      )}

      <div style={{ height: 60 }} />

      {/* ── MODAL AJOUT ── */}
      {showForm && (
        <div onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
          <div style={{ background: WHITE, borderRadius: 20, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", height: 5 }}>
              <div style={{ flex: 1, background: "#eee" }} />
              <div style={{ flex: 2, background: RED }} />
              <div style={{ flex: 2, background: GREEN }} />
            </div>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontWeight: 800, fontSize: 18, color: "#111", margin: 0 }}>Ajouter un événement</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", fontSize: 22, color: "#999", cursor: "pointer" }}>×</button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Nom de l'événement *</label>
                <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex: Soirée Malagasy Paris" style={inputStyle} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Date *</label>
                  <input required type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Prix</label>
                  <input value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="15€ ou Gratuit" style={inputStyle} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Lieu *</label>
                  <input required value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Ex: Paris 11ème" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Ville *</label>
                  <select value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} style={inputStyle}>
                    {CITIES.filter(c => c !== "Toutes").map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Catégorie</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={inputStyle}>
                    {CATEGORIES.filter(c => c !== "Toutes").map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Organisateur</label>
                  <input value={form.organizer} onChange={e => setForm({ ...form, organizer: e.target.value })} placeholder="Asso, DJ, groupe..." style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Lien billetterie</label>
                <input type="url" value={form.ticketUrl} onChange={e => setForm({ ...form, ticketUrl: e.target.value })}
                  placeholder="https://helloasso.com/..." style={inputStyle} />
              </div>

              {/* Médias */}
              <div>
                <label style={labelStyle}>📸 Photos & vidéos (liens URL)</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={mediaInput} onChange={e => setMediaInput(e.target.value)}
                    placeholder="https://... (image ou YouTube)"
                    style={{ ...inputStyle, marginBottom: 0 }}
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addMedia())}
                  />
                  <button type="button" onClick={addMedia}
                    style={{ background: GREEN, color: WHITE, border: "none", borderRadius: 12, padding: "0 16px", fontWeight: 700, fontSize: 18, cursor: "pointer", flexShrink: 0 }}>
                    +
                  </button>
                </div>
                {form.mediaUrls && form.mediaUrls.length > 0 && (
                  <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {form.mediaUrls.map((url, i) => (
                      <div key={i} style={{ position: "relative", width: 56, height: 56 }}>
                        <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }}
                          onError={e => { e.target.style.background = "#eee"; e.target.style.display = "flex" }} />
                        <button type="button" onClick={() => removeMedia(i)}
                          style={{ position: "absolute", top: -4, right: -4, background: RED, color: WHITE, border: "none", borderRadius: "50%", width: 18, height: 18, fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowForm(false)}
                  style={{ flex: 1, background: "#f0f0f0", color: "#555", fontWeight: 700, fontSize: 14, padding: "11px 0", borderRadius: 12, border: "none", cursor: "pointer" }}>
                  Annuler
                </button>
                <button type="submit"
                  style={{ flex: 2, background: GREEN, color: WHITE, fontWeight: 700, fontSize: 14, padding: "11px 0", borderRadius: 12, border: "none", cursor: "pointer" }}>
                  Publier l'événement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL LOGIN ADMIN ── */}
      {showLogin && (
        <div onClick={(e) => e.target === e.currentTarget && setShowLogin(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
          <div style={{ background: WHITE, borderRadius: 20, width: "100%", maxWidth: 360, padding: 32, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <p style={{ fontSize: 32, margin: "0 0 8px" }}>🔐</p>
              <h2 style={{ fontWeight: 800, fontSize: 18, color: "#111", margin: 0 }}>Accès administrateur</h2>
              <p style={{ fontSize: 13, color: "#999", marginTop: 4 }}>Réservé à l'équipe Malagasy Events</p>
            </div>
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                type="password"
                autoFocus
                value={pwInput}
                onChange={e => { setPwInput(e.target.value); setPwError(false) }}
                placeholder="Mot de passe"
                style={{ border: `1.5px solid ${pwError ? RED : "#e5e5e5"}`, borderRadius: 12, padding: "11px 14px", fontSize: 14, outline: "none", textAlign: "center" }}
              />
              {pwError && <p style={{ color: RED, fontSize: 12, textAlign: "center", margin: 0 }}>Mot de passe incorrect</p>}
              <button type="submit" style={{ background: RED, color: WHITE, fontWeight: 700, fontSize: 14, padding: "12px 0", borderRadius: 12, border: "none", cursor: "pointer" }}>
                Se connecter
              </button>
              <button type="button" onClick={() => setShowLogin(false)} style={{ background: "none", border: "none", color: "#999", fontSize: 13, cursor: "pointer" }}>
                Annuler
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer style={{ background: RED, padding: "20px 24px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: WHITE }} />
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: WHITE }} />
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: GREEN }} />
        </div>
        <p style={{ color: WHITE, fontWeight: 700, fontSize: 14, margin: 0 }}>🇲🇬 Malagasy Events France</p>
        <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, margin: "4px 0 0" }}>La plateforme de la communauté malgache en France</p>
      </footer>
    </div>
  )
}
