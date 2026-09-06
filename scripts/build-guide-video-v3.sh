#!/bin/zsh
set -euo pipefail

FFMPEG="/private/tmp/malagasy-events-video-tools/ffmpeg/ffmpeg"
ROOT="/Users/toky/Documents/Projets/projets-recuperes/malagasy-events"
SOURCE="/Users/toky/Downloads/ScreenRecording_07-27-2026 17-45-36_1.MP4"
VOICE="$ROOT/public/social/video-guide/narration-version-3.aiff"
IMAGES="$ROOT/public/social/video-guide/nouveaux-visuels"
WORK="$ROOT/.tmp-video-guide-v3"
OUT="$ROOT/public/social/video-guide"
FONT="/System/Library/Fonts/Supplemental/Arial Bold.ttf"

mkdir -p "$WORK" "$OUT"

photo() {
  local number="$1"
  local image="$2"
  local duration="$3"
  "$FFMPEG" -y -hide_banner -loglevel error -loop 1 -t "$duration" -i "$IMAGES/$image" \
    -vf "scale=1080:1080,pad=1080:1920:0:420:color=0xF5F2ED,fps=30,setpts=PTS-STARTPTS,format=yuv420p" \
    -an -c:v libx264 -preset ultrafast -crf 18 "$WORK/$number.mp4"
}

demo() {
  local number="$1"
  local start="$2"
  local duration="$3"
  local heading="$4"
  local detail="$5"
  local highlight="${6:-}"
  local filter="scale=760:-1,pad=1080:1920:160:180:color=0xF5F2ED,fps=30,setpts=PTS-STARTPTS,setsar=1"
  filter+=",drawbox=x=0:y=0:w=1080:h=150:color=0xB20D2F:t=fill"
  filter+=",drawtext=fontfile='$FONT':text='$heading':x=54:y=23:fontsize=38:fontcolor=white"
  filter+=",drawtext=fontfile='$FONT':text='$detail':x=54:y=83:fontsize=25:fontcolor=0xF6C94C"
  filter+=",drawbox=x=0:y=1840:w=1080:h=80:color=0x00843D:t=fill"
  filter+=",drawtext=fontfile='$FONT':text='malagasy-events.com':x=(w-text_w)/2:y=1864:fontsize=27:fontcolor=white"
  if [[ -n "$highlight" ]]; then
    filter+=",$highlight"
  fi
  "$FFMPEG" -y -hide_banner -loglevel error -ss "$start" -t "$duration" -i "$SOURCE" \
    -vf "$filter" -an -c:v libx264 -preset ultrafast -crf 20 -pix_fmt yuv420p "$WORK/$number.mp4"
}

photo "01" "06-couverture.png" "5"
demo "02" "0" "4" "Voici la page principale" "Recherche rapide et accès aux événements."
demo "03" "9" "6" "Appuie sur le menu" "Le bouton se trouve en haut à gauche." \
  "drawbox=x=168:y=190:w=92:h=92:color=0xF6C94C@0.48:t=12:enable='between(t,0,3)'"
photo "04" "01-annuaire.png" "9"
demo "05" "20" "4" "Gastronomie" "Restaurants, traiteurs et food trucks."
demo "06" "39" "4" "Églises" "Paroisses et communautés malagasy."
demo "07" "51" "4" "Sportifs" "Clubs, associations et tournois."
demo "08" "57" "4" "Boutiques" "Produits, épiceries et artisanat."
demo "09" "66" "8" "Guide France" "Études, travail, installation et démarches."
photo "10" "02-explorer.png" "4"
demo "11" "84" "8" "Tape le nom recherché" "Utilise la barre depuis la page principale." \
  "drawbox=x=185:y=820:w=535:h=105:color=0xF6C94C@0.45:t=12:enable='between(t,1,6)'"
demo "12" "92" "8" "Ouvre la fiche" "Vérifie la date, le lieu, le prix et la structure."
demo "13" "99" "4" "Utilise les bons boutons" "Carte, rappel, partage et achat des billets." \
  "drawbox=x=205:y=1550:w=500:h=180:color=0xF6C94C@0.42:t=12"
demo "14" "108" "4" "Billetterie officielle" "La page de réservation apparaît directement."
demo "15" "114" "7" "Crée ton compte gratuit" "Appuie sur Connexion en haut à droite." \
  "drawbox=x=770:y=190:w=215:h=95:color=0xF6C94C@0.48:t=12:enable='between(t,0,4)'"
photo "16" "05-compte-gratuit.png" "4"
photo "17" "04-premium-organisateur.png" "2.5"
photo "18" "06-couverture.png" "4.5"

{
  for file in "$WORK"/[0-9][0-9].mp4; do
    print -r -- "file '$file'"
  done
} > "$WORK/concat.txt"

"$FFMPEG" -y -hide_banner -loglevel error -f concat -safe 0 -i "$WORK/concat.txt" \
  -c copy "$WORK/visuals.mp4"

"$FFMPEG" -y -hide_banner -loglevel error -i "$WORK/visuals.mp4" -i "$VOICE" \
  -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 160k -shortest \
  -movflags +faststart "$OUT/Guide-Malagasy-Events-version-3.mp4"

print -r -- "$OUT/Guide-Malagasy-Events-version-3.mp4"
