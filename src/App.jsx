import { useState, useEffect } from "react"
import { supabase } from './supabase'

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
    description: "Une soirée inoubliable au cœur de Paris pour célébrer la culture malgache. DJ, danses traditionnelles, cocktails et ambiance chaleureuse garantis !",
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
    description: "Le Hira Gasy est l'art oratoire traditionnel de Madagascar. Venez découvrir chants, poésies et sagesses ancestrales portés par des artistes passionnés.",
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
    description: "Retrouvez la communauté malgache de Lyon autour de plats traditionnels : romazava, ravitoto, lasopy... Un moment de partage et de convivialité.",
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

/* ── Données vidéos initiales ────────────────────── */
const initialVideos = [
  {
    id: 1,
    type: "aftermovie",
    title: "After-movie — Repas Communautaire Lyon 2025",
    youtubeUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    thumbnail: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400",
    eventName: "Repas Communautaire Malgache",
    eventDate: "2025-03-10",
    isTeaser: false,
    date: "2025-03-15",
    description: "Le recap du repas communautaire de mars à Lyon. Merci à tous d'avoir été là !",
    likes: 48,
  },
  {
    id: 2,
    type: "communaute",
    title: "Hira Gasy — Répétition générale",
    youtubeUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    thumbnail: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400",
    eventName: "Hira Gasy Île-de-France",
    eventDate: "2026-07-20",
    isTeaser: true,
    date: "2026-06-01",
    description: "En coulisses avant le grand jour — un aperçu de la préparation.",
    likes: 23,
  },
  {
    id: 3,
    type: "communaute",
    title: "Recette de Romazava par Tantie Noro",
    youtubeUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    thumbnail: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400",
    eventName: "",
    eventDate: null,
    isTeaser: false,
    date: "2026-03-05",
    description: "La recette traditionnelle du romazava, transmise de génération en génération.",
    likes: 61,
  },
]

const EMPTY_VIDEO_FORM = {
  type: "aftermovie",
  title: "",
  youtubeUrl: "",
  thumbnail: "",
  eventName: "",
  isTeaser: false,
  date: "",
  description: "",
}

const EMPTY_FORM = {
  title: "", date: "", location: "", city: "Paris",
  category: "Soirée", price: "", organizer: "", ticketUrl: "",
  description: "",
  image: "https://images.unsplash.com/photo-1533317480453-7a4b6ad0a174?w=400",
  mediaUrls: [],
}

const isPast = (dateStr) => new Date(dateStr) < today

const formatDate = (d) =>
  new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })

/* ── Page de détail ──────────────────────────────── */
function EventDetail({ event, onClose, isAdmin, user, onAuthRequired }) {
  const [copied, setCopied]   = useState(false)
  const [selected, setSelected] = useState(null)
  const cat = CATEGORY_COLORS[event.category] || CATEGORY_COLORS.Autre

  const shareUrl = `${window.location.origin}${window.location.pathname}#event-${event.id}`
  const shareText = `🇲🇬 ${event.title} — ${formatDate(event.date)} à ${event.location}\n${shareUrl}`

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank")
  }

  const isVideo = (url) => url.match(/\.(mp4|webm|ogg|mov)$/i) || url.includes("youtube") || url.includes("youtu.be")

  const mapQuery = encodeURIComponent(event.location + ", France")

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16 }}>
      <div style={{ background: WHITE, borderRadius: 24, width: "100%", maxWidth: 620, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.35)" }}>

        {/* Image hero */}
        <div style={{ position: "relative" }}>
          <img src={event.image} alt={event.title} style={{ width: "100%", height: 240, objectFit: "cover", display: "block", borderRadius: "24px 24px 0 0" }} />
          <button onClick={onClose}
            style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.5)", border: "none", color: WHITE, fontSize: 20, width: 36, height: 36, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            ×
          </button>
          <span style={{ position: "absolute", bottom: 12, left: 12, background: cat.bg, color: cat.color, fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 99 }}>
            {event.category}
          </span>
          <span style={{ position: "absolute", bottom: 12, right: 12, background: WHITE, color: RED, fontSize: 14, fontWeight: 800, padding: "4px 12px", borderRadius: 99 }}>
            {event.price}
          </span>
        </div>

        {/* Bande tricolore */}
        <div style={{ display: "flex", height: 4 }}>
          <div style={{ flex: 1, background: WHITE, borderBottom: "1px solid #eee" }} />
          <div style={{ flex: 2, background: RED }} />
          <div style={{ flex: 2, background: GREEN }} />
        </div>

        <div style={{ padding: 24 }}>
          <h2 style={{ fontWeight: 800, fontSize: 22, color: "#111", margin: "0 0 16px", lineHeight: 1.2 }}>{event.title}</h2>

          {/* Infos pratiques */}
          <div style={{ background: "#f8f8f8", borderRadius: 16, padding: 16, marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
              <span style={{ fontSize: 20 }}>📅</span>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", margin: 0 }}>Date</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#111", margin: "2px 0 0" }}>{formatDate(event.date)}</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
              <span style={{ fontSize: 20 }}>📍</span>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", margin: 0 }}>Lieu</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#111", margin: "2px 0 0" }}>{event.location}</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <span style={{ fontSize: 20 }}>🎤</span>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", margin: 0 }}>Organisateur</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#111", margin: "2px 0 0" }}>{event.organizer}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>À propos</p>
              <p style={{ fontSize: 14, color: "#444", lineHeight: 1.6, margin: 0 }}>{event.description}</p>
            </div>
          )}

          {/* Plan Google Maps */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>📍 Plan</p>
            <iframe
              title="map"
              width="100%"
              height="200"
              style={{ border: "none", borderRadius: 16 }}
              src={`https://maps.google.com/maps?q=${mapQuery}&output=embed`}
              loading="lazy"
            />
          </div>

          {/* Galerie média */}
          {event.mediaUrls && event.mediaUrls.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>📸 Photos & vidéos</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {event.mediaUrls.map((url, i) => (
                  <div key={i} onClick={() => setSelected(url)}
                    style={{ cursor: "pointer", width: 80, height: 80, borderRadius: 12, overflow: "hidden" }}>
                    {isVideo(url) ? (
                      <div style={{ width: "100%", height: "100%", background: "#111", display: "flex", alignItems: "center", justifyContent: "center", color: WHITE, fontSize: 24 }}>▶</div>
                    ) : (
                      <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Commentaires */}
          <CommentSection eventId={event.id} user={user} onAuthRequired={onAuthRequired} />

          {/* Boutons action */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {!isPast(event.date) && (
              event.ticketUrl ? (
                <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer"
                  style={{ background: RED, color: WHITE, fontWeight: 700, fontSize: 15, padding: "14px 0", borderRadius: 14, textAlign: "center", textDecoration: "none", display: "block" }}>
                  🎟 Voir les billets
                </a>
              ) : (
                <div style={{ background: "#f0f0f0", color: "#aaa", fontWeight: 600, fontSize: 14, padding: "14px 0", borderRadius: 14, textAlign: "center" }}>
                  Billets bientôt disponibles
                </div>
              )
            )}

            {/* Boutons partage — admin seulement */}
            {isAdmin && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, marginTop: 4 }}>
                  🔓 Partager (admin)
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handleWhatsApp}
                    style={{ flex: 1, background: "#25D366", color: WHITE, fontWeight: 700, fontSize: 13, padding: "11px 0", borderRadius: 12, border: "none", cursor: "pointer" }}>
                    WhatsApp
                  </button>
                  <button onClick={handleCopy}
                    style={{ flex: 1, background: copied ? GREEN : "#f0f0f0", color: copied ? WHITE : "#555", fontWeight: 700, fontSize: 13, padding: "11px 0", borderRadius: 12, border: "none", cursor: "pointer", transition: "all .2s" }}>
                    {copied ? "✓ Copié !" : "🔗 Copier le lien"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox média */}
      {selected && (
        <div onClick={() => setSelected(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 24 }}>
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
function EventCard({ event, past, onOpen }) {
  const [reminded, setReminded] = useState(false)
  const [toast, setToast]       = useState(false)
  const cat = CATEGORY_COLORS[event.category] || CATEGORY_COLORS.Autre

  const handleRemind = (e) => {
    e.stopPropagation()
    if (!reminded) { setToast(true); setTimeout(() => setToast(false), 2500) }
    setReminded(!reminded)
  }

  const handleTicket = (e) => {
    e.stopPropagation()
  }

  return (
    <div onClick={() => onOpen(event)} style={{
      background: WHITE, borderRadius: 20, overflow: "hidden", display: "flex", flexDirection: "column",
      boxShadow: past ? "0 1px 6px rgba(0,0,0,0.06)" : "0 2px 12px rgba(0,0,0,0.09)",
      opacity: past ? 0.75 : 1, cursor: "pointer",
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
        <p style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>📍 {event.location}</p>

        <p style={{ fontSize: 12, color: "#888", marginBottom: 12, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {event.description}
        </p>

        {/* Boutons */}
        {!past && (
          <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
            {event.ticketUrl ? (
              <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer" onClick={handleTicket}
                style={{ flex: 1, background: RED, color: WHITE, fontWeight: 700, fontSize: 13, padding: "9px 0", borderRadius: 12, textAlign: "center", textDecoration: "none" }}>
                🎟 Billets
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

        {!past && (
          <p style={{ fontSize: 11, color: "#bbb", textAlign: "center", marginTop: 8, marginBottom: 0 }}>Clique pour voir les détails →</p>
        )}
      </div>
    </div>
  )
}

/* ── Carte vidéo ─────────────────────────────────── */
function VideoCard({ video, onPlay, onLike, liked }) {
  return (
    <div style={{ background: WHITE, borderRadius: 20, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.09)", cursor: "pointer" }}
      onClick={() => onPlay(video)}>
      <div style={{ position: "relative" }}>
        <img src={video.thumbnail} alt={video.title}
          style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,255,255,0.9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
            ▶
          </div>
        </div>
        <span style={{ position: "absolute", top: 10, left: 10, background: video.isTeaser ? "#f0a500" : video.type === "aftermovie" ? RED : GREEN, color: WHITE, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99 }}>
          {video.isTeaser ? "🎬 Teaser" : video.type === "aftermovie" ? "After-movie" : "Communauté"}
        </span>
      </div>
      <div style={{ padding: 14 }}>
        <h4 style={{ fontWeight: 700, fontSize: 14, color: "#111", margin: "0 0 6px", lineHeight: 1.3 }}>{video.title}</h4>
        {video.eventName && <p style={{ fontSize: 12, color: GREEN, fontWeight: 600, margin: "0 0 4px" }}>🎪 {video.eventName}</p>}
        <p style={{ fontSize: 12, color: "#999", margin: "0 0 10px" }}>{new Date(video.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
        <p style={{ fontSize: 12, color: "#666", margin: "0 0 12px", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {video.description}
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={e => { e.stopPropagation(); onLike(video.id) }}
            style={{ background: liked ? "#fde8ec" : "#f5f5f5", color: liked ? RED : "#888", border: "none", borderRadius: 99, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            ❤️ {video.likes + (liked ? 1 : 0)}
          </button>
          <span style={{ fontSize: 11, color: "#bbb" }}>Cliquer pour regarder</span>
        </div>
      </div>
    </div>
  )
}

/* ── Lecteur vidéo (lightbox) ────────────────────── */
function VideoPlayer({ video, onClose, user, onAuthRequired }) {
  const embedUrl = video.youtubeUrl.includes("embed") ? video.youtubeUrl : video.youtubeUrl.replace("watch?v=", "embed/")
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 70, padding: 16, overflowY: "auto" }}>
      <div style={{ width: "100%", maxWidth: 720, background: "#1a1a1a", borderRadius: 20, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px" }}>
          <div>
            <h3 style={{ color: WHITE, fontWeight: 700, fontSize: 15, margin: 0 }}>{video.title}</h3>
            {video.eventName && (
              <p style={{ color: video.isTeaser ? "#f0a500" : GREEN, fontSize: 12, margin: "3px 0 0", fontWeight: 600 }}>
                {video.isTeaser ? "🎬 Teaser — " : "🎪 After-movie — "}{video.eventName}
              </p>
            )}
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: WHITE, fontSize: 18, cursor: "pointer", width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
        {/* Vidéo */}
        <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
          <iframe src={embedUrl + "?autoplay=1"} title={video.title}
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen />
        </div>
        {/* Description */}
        {video.description && (
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, margin: "12px 20px", lineHeight: 1.5 }}>{video.description}</p>
        )}
        {/* Commentaires */}
        <div style={{ background: WHITE, margin: 16, borderRadius: 16, padding: 16 }}>
          <CommentSection mediaId={video.id} user={user} onAuthRequired={onAuthRequired} />
        </div>
      </div>
    </div>
  )
}

/* ── Section Vidéos ──────────────────────────────── */
function VideoSection({ videos, setVideos, isAdmin, user, onAuthRequired }) {
  const [tab, setTab]               = useState("aftermovie")
  const [playingVideo, setPlaying]  = useState(null)
  const [likedIds, setLikedIds]     = useState([])
  const [showAddVideo, setShowAdd]  = useState(false)
  const [vForm, setVForm]           = useState(EMPTY_VIDEO_FORM)

  const filtered = videos.filter(v => v.type === tab)

  const handleLike = (id) => {
    if (likedIds.includes(id)) return
    setLikedIds([...likedIds, id])
  }

  const handleAddVideo = (e) => {
    e.preventDefault()
    setVideos([...videos, { ...vForm, id: Date.now(), likes: 0 }])
    setVForm(EMPTY_VIDEO_FORM)
    setShowAdd(false)
  }

  const inputStyle = { width: "100%", border: "1.5px solid #e5e5e5", borderRadius: 12, padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box" }
  const labelStyle = { fontSize: 13, fontWeight: 600, color: "#444", display: "block", marginBottom: 6 }

  return (
    <div style={{ background: "#111", padding: "48px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Header section */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h2 style={{ color: WHITE, fontWeight: 800, fontSize: 24, margin: "0 0 4px" }}>🎬 Vidéos</h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, margin: 0 }}>After-movies & contenus de la communauté</p>
          </div>
          {isAdmin && (
            <button onClick={() => setShowAdd(true)}
              style={{ background: RED, color: WHITE, fontWeight: 700, fontSize: 13, padding: "10px 18px", borderRadius: 12, border: "none", cursor: "pointer" }}>
              + Ajouter une vidéo
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {[["aftermovie", "🎥 After-movies"], ["communaute", "🌍 Communauté"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ padding: "8px 20px", borderRadius: 99, fontSize: 13, fontWeight: 700, cursor: "pointer", border: "none",
                background: tab === key ? WHITE : "rgba(255,255,255,0.1)",
                color: tab === key ? "#111" : "rgba(255,255,255,0.6)" }}>
              {label}
            </button>
          ))}
        </div>

        {/* Grille vidéos */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "rgba(255,255,255,0.4)" }}>
            <p style={{ fontSize: 40, marginBottom: 8 }}>🎬</p>
            <p style={{ fontSize: 14 }}>Aucune vidéo dans cette catégorie</p>
            {isAdmin && <p style={{ fontSize: 12, marginTop: 4 }}>Clique sur "+ Ajouter une vidéo" pour commencer</p>}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
            {filtered.map(v => (
              <VideoCard key={v.id} video={v} onPlay={setPlaying} onLike={handleLike} liked={likedIds.includes(v.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Lecteur */}
      {playingVideo && <VideoPlayer video={playingVideo} onClose={() => setPlaying(null)} user={user} onAuthRequired={onAuthRequired} />}

      {/* Modal ajout vidéo (admin) */}
      {showAddVideo && (
        <div onClick={e => e.target === e.currentTarget && setShowAdd(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 80, padding: 16 }}>
          <div style={{ background: WHITE, borderRadius: 20, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontWeight: 800, fontSize: 18, margin: 0 }}>Ajouter une vidéo</h2>
              <button onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", fontSize: 22, color: "#999", cursor: "pointer" }}>×</button>
            </div>
            <form onSubmit={handleAddVideo} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Type</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[["aftermovie", "🎥 After-movie"], ["communaute", "🌍 Communauté"]].map(([val, label]) => (
                    <button key={val} type="button" onClick={() => setVForm({ ...vForm, type: val })}
                      style={{ flex: 1, padding: "8px 0", borderRadius: 12, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13,
                        background: vForm.type === val ? RED : "#f0f0f0", color: vForm.type === val ? WHITE : "#555" }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Titre *</label>
                <input required value={vForm.title} onChange={e => setVForm({ ...vForm, title: e.target.value })}
                  placeholder="Ex: After-movie soirée novembre" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Lien YouTube *</label>
                <input required value={vForm.youtubeUrl} onChange={e => setVForm({ ...vForm, youtubeUrl: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..." style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Image miniature (URL)</label>
                <input value={vForm.thumbnail} onChange={e => setVForm({ ...vForm, thumbnail: e.target.value })}
                  placeholder="https://... (optionnel)" style={inputStyle} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Événement lié</label>
                  <input value={vForm.eventName} onChange={e => setVForm({ ...vForm, eventName: e.target.value })}
                    placeholder="Nom de l'event" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Date</label>
                  <input type="date" value={vForm.date} onChange={e => setVForm({ ...vForm, date: e.target.value })} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea value={vForm.description} onChange={e => setVForm({ ...vForm, description: e.target.value })}
                  placeholder="Décris la vidéo..." rows={2}
                  style={{ ...inputStyle, resize: "vertical", fontFamily: "system-ui, sans-serif" }} />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowAdd(false)}
                  style={{ flex: 1, background: "#f0f0f0", color: "#555", fontWeight: 700, fontSize: 14, padding: "11px 0", borderRadius: 12, border: "none", cursor: "pointer" }}>
                  Annuler
                </button>
                <button type="submit"
                  style={{ flex: 2, background: RED, color: WHITE, fontWeight: 700, fontSize: 14, padding: "11px 0", borderRadius: 12, border: "none", cursor: "pointer" }}>
                  Publier la vidéo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Modal Auth (connexion / inscription) ────────── */
function AuthModal({ onClose, onSuccess }) {
  const [tab, setTab]       = useState("login")
  const [email, setEmail]   = useState("")
  const [pw, setPw]         = useState("")
  const [username, setUsername] = useState("")
  const [error, setError]   = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(""); setLoading(true)
    if (tab === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
      if (error) setError("Email ou mot de passe incorrect")
      else { onSuccess(); onClose() }
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password: pw })
      if (error) {
        setError(error?.message || "Erreur lors de la création du compte")
      } else if (data?.user) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          username: username || data.user.email.split('@')[0],
        })
        onSuccess(); onClose()
      } else {
        setError("✅ Compte créé ! Connecte-toi maintenant.")
      }
    }
    setLoading(false)
  }

  const inputStyle = { width: "100%", border: "1.5px solid #e5e5e5", borderRadius: 12, padding: "10px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" }

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 90, padding: 16 }}>
      <div style={{ background: WHITE, borderRadius: 24, width: "100%", maxWidth: 380, padding: 32, boxShadow: "0 24px 80px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <p style={{ fontSize: 36, margin: "0 0 8px" }}>🇲🇬</p>
          <h2 style={{ fontWeight: 800, fontSize: 20, color: "#111", margin: 0 }}>Rejoindre la communauté</h2>
        </div>
        {/* Tabs */}
        <div style={{ display: "flex", background: "#f5f5f5", borderRadius: 12, padding: 4, marginBottom: 24 }}>
          {[["login", "Connexion"], ["signup", "Inscription"]].map(([key, label]) => (
            <button key={key} onClick={() => { setTab(key); setError("") }}
              style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13,
                background: tab === key ? WHITE : "transparent", color: tab === key ? "#111" : "#999",
                boxShadow: tab === key ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>
              {label}
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {tab === "signup" && (
            <input value={username} onChange={e => setUsername(e.target.value)}
              placeholder="Pseudo (ex: Niry_Mada)" style={inputStyle} />
          )}
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email" style={inputStyle} />
          <input required type="password" value={pw} onChange={e => setPw(e.target.value)}
            placeholder="Mot de passe" style={inputStyle} />
          {error && <p style={{ fontSize: 12, color: error.startsWith("✅") ? GREEN : RED, textAlign: "center", margin: 0 }}>{error}</p>}
          <button type="submit" disabled={loading}
            style={{ background: RED, color: WHITE, fontWeight: 700, fontSize: 14, padding: "12px 0", borderRadius: 12, border: "none", cursor: "pointer", marginTop: 4, opacity: loading ? 0.7 : 1 }}>
            {loading ? "..." : tab === "login" ? "Se connecter" : "Créer mon compte"}
          </button>
        </form>
        <button onClick={onClose} style={{ width: "100%", background: "none", border: "none", color: "#aaa", fontSize: 13, cursor: "pointer", marginTop: 12 }}>
          Annuler
        </button>
      </div>
    </div>
  )
}

/* ── Section Commentaires ────────────────────────── */
function CommentSection({ eventId, mediaId, user, onAuthRequired }) {
  const [comments, setComments] = useState([])
  const [text, setText]         = useState("")
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    fetchComments()
  }, [eventId, mediaId])

  const fetchComments = async () => {
    let query = supabase.from('comments').select('*, profiles(username, is_member)').order('created_at', { ascending: true })
    if (mediaId) query = query.eq('media_id', mediaId)
    else if (eventId) query = query.eq('event_id', eventId)
    const { data } = await query
    setComments(data || [])
  }

  const handlePost = async (e) => {
    e.preventDefault()
    if (!user) { onAuthRequired(); return }
    if (!text.trim()) return
    setLoading(true)
    await supabase.from('comments').insert({
      content: text.trim(),
      user_id: user.id,
      ...(mediaId ? { media_id: mediaId } : { event_id: eventId }),
    })
    setText("")
    await fetchComments()
    setLoading(false)
  }

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr)
    const m = Math.floor(diff / 60000)
    if (m < 1) return "à l'instant"
    if (m < 60) return `il y a ${m} min`
    const h = Math.floor(m / 60)
    if (h < 24) return `il y a ${h}h`
    return `il y a ${Math.floor(h / 24)}j`
  }

  return (
    <div style={{ marginTop: 20 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
        💬 Commentaires ({comments.length})
      </p>
      {/* Liste */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16, maxHeight: 220, overflowY: "auto" }}>
        {comments.length === 0 && <p style={{ fontSize: 13, color: "#bbb", textAlign: "center", padding: "16px 0" }}>Sois le premier à commenter !</p>}
        {comments.map(c => (
          <div key={c.id} style={{ display: "flex", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: RED, display: "flex", alignItems: "center", justifyContent: "center", color: WHITE, fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
              {(c.profiles?.username || "?")[0].toUpperCase()}
            </div>
            <div style={{ background: "#f5f5f5", borderRadius: 12, padding: "8px 12px", flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                <span style={{ fontWeight: 700, fontSize: 12, color: "#111" }}>{c.profiles?.username || "Anonyme"}</span>
                {c.profiles?.is_member && <span style={{ background: GREEN, color: WHITE, fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 99 }}>MEMBRE</span>}
                <span style={{ fontSize: 11, color: "#bbb", marginLeft: "auto" }}>{timeAgo(c.created_at)}</span>
              </div>
              <p style={{ fontSize: 13, color: "#444", margin: 0, lineHeight: 1.4 }}>{c.content}</p>
            </div>
          </div>
        ))}
      </div>
      {/* Formulaire */}
      <form onSubmit={handlePost} style={{ display: "flex", gap: 8 }}>
        <input value={text} onChange={e => setText(e.target.value)}
          placeholder={user ? "Ton commentaire..." : "Connecte-toi pour commenter"}
          onClick={() => !user && onAuthRequired()}
          readOnly={!user}
          style={{ flex: 1, border: "1.5px solid #e5e5e5", borderRadius: 12, padding: "9px 14px", fontSize: 13, outline: "none", cursor: user ? "text" : "pointer", background: user ? WHITE : "#f9f9f9" }}
        />
        {user && (
          <button type="submit" disabled={loading || !text.trim()}
            style={{ background: RED, color: WHITE, border: "none", borderRadius: 12, padding: "0 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: (!text.trim() || loading) ? 0.5 : 1 }}>
            ↩
          </button>
        )}
      </form>
    </div>
  )
}

/* ── Modal Profil / Paramètres ───────────────────── */
function ProfileModal({ user, userProfile, onClose, onSignOut, onUpdate }) {
  const [tab, setTab]           = useState("profil")
  const [username, setUsername] = useState(userProfile?.username || "")
  const [avatarUrl, setAvatarUrl] = useState(userProfile?.avatar_url || "")
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase.from('profiles')
      .update({ username, avatar_url: avatarUrl })
      .eq('id', user.id)
    if (!error) {
      setSaved(true)
      onUpdate({ ...userProfile, username, avatar_url: avatarUrl })
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  const initiale = (userProfile?.username || user?.email || "?")[0].toUpperCase()

  const inputStyle = { width: "100%", border: "1.5px solid #e5e5e5", borderRadius: 12, padding: "10px 14px", fontSize: 13, outline: "none", boxSizing: "border-box" }
  const labelStyle = { fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 6 }

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 90, padding: 16 }}>
      <div style={{ background: WHITE, borderRadius: 24, width: "100%", maxWidth: 420, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.25)" }}>

        {/* Header profil */}
        <div style={{ background: RED, borderRadius: "24px 24px 0 0", padding: "28px 24px 20px", textAlign: "center" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: WHITE, margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "3px solid rgba(255,255,255,0.3)" }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 28, fontWeight: 800, color: RED }}>{initiale}</span>
            )}
          </div>
          <h2 style={{ color: WHITE, fontWeight: 800, fontSize: 18, margin: "0 0 4px" }}>{userProfile?.username || user?.email?.split("@")[0]}</h2>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, margin: 0 }}>{user?.email}</p>
          {userProfile?.is_member && (
            <span style={{ background: GREEN, color: WHITE, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, display: "inline-block", marginTop: 8 }}>
              ✓ Membre 2,50€/mois
            </span>
          )}
        </div>

        {/* Bande tricolore */}
        <div style={{ display: "flex", height: 4 }}>
          <div style={{ flex: 1, background: "#eee" }} />
          <div style={{ flex: 2, background: RED }} />
          <div style={{ flex: 2, background: GREEN }} />
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", padding: "16px 24px 0" }}>
          {[["profil", "👤 Mon profil"], ["compte", "⚙️ Compte"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ flex: 1, padding: "8px 0", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, background: "none",
                color: tab === key ? RED : "#aaa",
                borderBottom: tab === key ? `2px solid ${RED}` : "2px solid transparent" }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ padding: 24 }}>
          {tab === "profil" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Pseudo</label>
                <input value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="Ton pseudo" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Photo de profil (URL)</label>
                <input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)}
                  placeholder="https://... (lien vers une image)" style={inputStyle} />
                {avatarUrl && (
                  <img src={avatarUrl} alt="" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", marginTop: 8 }} />
                )}
              </div>
              <div style={{ background: "#f8f8f8", borderRadius: 12, padding: 14 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#999", textTransform: "uppercase", margin: "0 0 4px" }}>Email</p>
                <p style={{ fontSize: 14, color: "#555", margin: 0 }}>{user?.email}</p>
              </div>
              <div style={{ background: "#f8f8f8", borderRadius: 12, padding: 14 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#999", textTransform: "uppercase", margin: "0 0 4px" }}>Membre depuis</p>
                <p style={{ fontSize: 14, color: "#555", margin: 0 }}>
                  {userProfile?.created_at ? new Date(userProfile.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—"}
                </p>
              </div>
              <button onClick={handleSave} disabled={saving}
                style={{ background: saved ? GREEN : RED, color: WHITE, fontWeight: 700, fontSize: 14, padding: "12px 0", borderRadius: 14, border: "none", cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
                {saved ? "✓ Sauvegardé !" : saving ? "..." : "Sauvegarder les modifications"}
              </button>
            </div>
          )}

          {tab === "compte" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ background: "#f8f8f8", borderRadius: 14, padding: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#999", textTransform: "uppercase", margin: "0 0 8px" }}>Plan actuel</p>
                {userProfile?.is_member ? (
                  <>
                    <p style={{ fontSize: 15, fontWeight: 700, color: GREEN, margin: "0 0 4px" }}>✓ Plan Membre — 2,50€/mois</p>
                    <p style={{ fontSize: 12, color: "#999", margin: 0 }}>Accès prioritaire, badge, contenu exclusif</p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "#555", margin: "0 0 8px" }}>Plan Gratuit</p>
                    <button style={{ background: RED, color: WHITE, fontWeight: 700, fontSize: 13, padding: "10px 0", borderRadius: 12, border: "none", cursor: "pointer", width: "100%" }}>
                      Passer à 2,50€/mois →
                    </button>
                    <p style={{ fontSize: 11, color: "#bbb", textAlign: "center", marginTop: 6 }}>Badge membre, accès prioritaire, contenu exclusif</p>
                  </>
                )}
              </div>

              <div style={{ background: "#f8f8f8", borderRadius: 14, padding: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#999", textTransform: "uppercase", margin: "0 0 8px" }}>Sécurité</p>
                <p style={{ fontSize: 13, color: "#555", margin: 0 }}>Mot de passe géré via Supabase Auth</p>
              </div>

              <button onClick={() => { onSignOut(); onClose() }}
                style={{ background: "#f5f5f5", color: "#e53935", fontWeight: 700, fontSize: 14, padding: "12px 0", borderRadius: 14, border: "none", cursor: "pointer", marginTop: 8 }}>
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── App principale ──────────────────────────────── */
export default function App() {
  const [events, setEvents]                 = useState(initialEvents)
  const [videos, setVideos]                 = useState(initialVideos)
  const [user, setUser]                     = useState(null)
  const [userProfile, setUserProfile]       = useState(null)
  const [showAuth, setShowAuth]             = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setUserProfile(null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setUserProfile(data)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null); setUserProfile(null)
  }
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
  const [selectedEvent, setSelectedEvent]   = useState(null)
  const [showProfile, setShowProfile]       = useState(false)

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
            {isAdmin && <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 600 }}>🔓 Admin</span>}
            {isAdmin && (
              <button onClick={() => setShowForm(true)} style={{ background: WHITE, color: RED, fontWeight: 700, fontSize: 13, padding: "9px 18px", borderRadius: 12, border: "none", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
                + Ajouter un événement
              </button>
            )}
            {isAdmin && (
              <button onClick={() => setIsAdmin(false)} style={{ background: "rgba(255,255,255,0.15)", color: WHITE, fontWeight: 600, fontSize: 12, padding: "9px 14px", borderRadius: 12, border: "none", cursor: "pointer" }}>
                Déconnexion admin
              </button>
            )}
            {user ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div onClick={() => setShowProfile(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.15)", borderRadius: 99, padding: "6px 12px 6px 6px", cursor: "pointer" }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: WHITE, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {userProfile?.avatar_url
                      ? <img src={userProfile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <span style={{ color: RED, fontWeight: 800, fontSize: 12 }}>{(userProfile?.username || user.email)[0].toUpperCase()}</span>}
                  </div>
                  <span style={{ color: WHITE, fontSize: 12, fontWeight: 600 }}>{userProfile?.username || user.email.split("@")[0]}</span>
                  {userProfile?.is_member && <span style={{ background: GREEN, color: WHITE, fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 99 }}>MEMBRE</span>}
                  <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>⚙️</span>
                </div>
                <button onClick={handleSignOut} style={{ background: "rgba(255,255,255,0.15)", color: WHITE, fontWeight: 600, fontSize: 12, padding: "6px 12px", borderRadius: 99, border: "none", cursor: "pointer" }}>
                  ×
                </button>
              </div>
            ) : (
              <button onClick={() => setShowAuth(true)} style={{ background: WHITE, color: RED, fontWeight: 700, fontSize: 13, padding: "8px 16px", borderRadius: 99, border: "none", cursor: "pointer" }}>
                Se connecter
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
            {upcoming.map(event => <EventCard key={event.id} event={event} past={false} onOpen={setSelectedEvent} />)}
          </div>
        )}
      </main>

      {/* ── EVENTS PASSÉS ── */}
      {past.length > 0 && (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <h3 style={{ fontWeight: 800, fontSize: 18, color: "#888", margin: 0 }}>
              Événements passés <span style={{ fontWeight: 400, fontSize: 14 }}>({past.length})</span>
            </h3>
            <button onClick={() => setShowPast(!showPast)}
              style={{ background: "#eee", border: "none", borderRadius: 99, fontSize: 12, fontWeight: 600, color: "#666", padding: "4px 12px", cursor: "pointer" }}>
              {showPast ? "Masquer" : "Afficher"}
            </button>
          </div>
          {showPast && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24 }}>
              {past.map(event => <EventCard key={event.id} event={event} past={true} onOpen={setSelectedEvent} />)}
            </div>
          )}
        </div>
      )}

      <div style={{ height: 60 }} />

      {/* ── SECTION VIDÉOS ── */}
      <VideoSection videos={videos} setVideos={setVideos} isAdmin={isAdmin} user={user} onAuthRequired={() => setShowAuth(true)} />


      {/* ── MODAL DÉTAIL ── */}
      {selectedEvent && (
        <EventDetail event={selectedEvent} onClose={() => setSelectedEvent(null)} isAdmin={isAdmin} user={user} onAuthRequired={() => { setSelectedEvent(null); setShowAuth(true) }} />
      )}

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
                <label style={labelStyle}>Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Décris l'événement, l'ambiance, ce qui est inclus..."
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical", fontFamily: "system-ui, sans-serif" }} />
              </div>

              <div>
                <label style={labelStyle}>Lien billetterie</label>
                <input type="url" value={form.ticketUrl} onChange={e => setForm({ ...form, ticketUrl: e.target.value })}
                  placeholder="https://helloasso.com/..." style={inputStyle} />
              </div>

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
                        <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} />
                        <button type="button" onClick={() => removeMedia(i)}
                          style={{ position: "absolute", top: -4, right: -4, background: RED, color: WHITE, border: "none", borderRadius: "50%", width: 18, height: 18, fontSize: 11, cursor: "pointer", padding: 0 }}>
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

      {/* ── MODAL AUTH ── */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />}

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
              <input type="password" autoFocus value={pwInput}
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

      {/* ── MODAL PROFIL ── */}
      {showProfile && user && (
        <ProfileModal
          user={user}
          userProfile={userProfile}
          onClose={() => setShowProfile(false)}
          onSignOut={handleSignOut}
          onUpdate={(updated) => setUserProfile(updated)}
        />
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
