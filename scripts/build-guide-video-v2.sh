#!/bin/zsh
set -euo pipefail

FFMPEG="/private/tmp/malagasy-events-video-tools/ffmpeg/ffmpeg"
ROOT="/Users/toky/Documents/Projets/projets-recuperes/malagasy-events"
SOURCE="/Users/toky/Downloads/ScreenRecording_07-27-2026 17-45-36_1.MP4"
WORK="$ROOT/.tmp-video-guide-v2"
CARDS="$ROOT/public/social/video-guide/cards"
OUT="$ROOT/public/social/video-guide"
FONT="/System/Library/Fonts/Supplemental/Arial Bold.ttf"

mkdir -p "$WORK" "$OUT"

clip() {
  local number="$1"
  local start="$2"
  local duration="$3"
  local heading="$4"
  local explanation="$5"
  local highlight="${6:-}"
  local filter="scale=760:-1,pad=1080:1920:160:180:color=0xF5F2ED,fps=30,setsar=1"
  filter+=",drawbox=x=0:y=0:w=1080:h=150:color=0xB20D2F:t=fill"
  filter+=",drawtext=fontfile='$FONT':text='$heading':x=54:y=23:fontsize=38:fontcolor=white"
  filter+=",drawtext=fontfile='$FONT':text='$explanation':x=54:y=83:fontsize=25:fontcolor=0xF6C94C"
  filter+=",drawbox=x=0:y=1840:w=1080:h=80:color=0x00843D:t=fill"
  filter+=",drawtext=fontfile='$FONT':text='malagasy-events.com':x=(w-text_w)/2:y=1864:fontsize=27:fontcolor=white"
  if [[ -n "$highlight" ]]; then
    filter+=",$highlight"
  fi

  "$FFMPEG" -y -hide_banner -loglevel error \
    -ss "$start" -t "$duration" -i "$SOURCE" \
    -f lavfi -t "$duration" -i "anullsrc=channel_layout=stereo:sample_rate=48000" \
    -vf "$filter" -map 0:v:0 -map 1:a:0 \
    -c:v libx264 -preset ultrafast -crf 20 -pix_fmt yuv420p \
    -c:a aac -b:a 128k -shortest "$WORK/$number.mp4"
}

card() {
  local number="$1"
  local name="$2"
  local duration="$3"
  "$FFMPEG" -y -hide_banner -loglevel error \
    -loop 1 -t "$duration" -i "$CARDS/$name.png" \
    -f lavfi -t "$duration" -i "anullsrc=channel_layout=stereo:sample_rate=48000" \
    -vf "fps=30,format=yuv420p" -map 0:v:0 -map 1:a:0 \
    -c:v libx264 -preset ultrafast -crf 18 -c:a aac -b:a 128k \
    -shortest "$WORK/$number.mp4"
}

card "01" "01-intro" "3"
clip "02" "0" "3" "Bienvenue sur Malagasy Events" "Toute la communauté au même endroit."
clip "03" "10" "3" "1. Ouvre le menu" "Appuie sur les trois lignes en haut à gauche." \
  "drawbox=x=168:y=190:w=92:h=92:color=0xF6C94C@0.45:t=12:enable='between(t,0,2.4)'"
clip "04" "12" "3" "Choisis une rubrique" "Événements, gastronomie, églises, sport, boutiques..."
card "05" "02-explorer" "1.5"
clip "06" "20" "4" "Trouve une bonne adresse" "Restaurants, traiteurs, food trucks et communautés."
clip "07" "39" "4" "Trouve une église" "Paroisses et communautés chrétiennes malagasy."
clip "08" "51" "4" "Découvre le sport" "Clubs, associations et prochains tournois."
clip "09" "57" "4" "Découvre les boutiques" "Produits, épiceries et artisanat malagasy."
card "10" "03-guide" "1.5"
clip "11" "66" "6" "Le Guide France" "Des repères simples pour les études, le travail et les démarches."
card "12" "04-evenement" "1.5"
clip "13" "84" "6" "2. Utilise la recherche" "Tape un nom, une ville ou un mot-clé." \
  "drawbox=x=185:y=820:w=535:h=105:color=0xF6C94C@0.42:t=12:enable='between(t,1,5)'"
clip "14" "90" "3" "Choisis le résultat" "La fiche apparaît directement dans la liste."
clip "15" "94" "6" "3. Lis la fiche" "Vérifie la date, le lieu, le prix et la structure."
clip "16" "100" "3" "Les actions utiles" "Carte, rappel, partage et achat des billets." \
  "drawbox=x=205:y=1550:w=500:h=180:color=0xF6C94C@0.38:t=12:enable='between(t,0,3)'"
clip "17" "108" "4" "Billetterie vérifiée" "Le bouton ouvre le site officiel de réservation."
clip "18" "114" "6" "4. Crée ton compte gratuit" "Appuie sur Connexion pour participer." \
  "drawbox=x=770:y=190:w=215:h=95:color=0xF6C94C@0.45:t=12:enable='between(t,0,4)'"
card "19" "05-outro" "3"

{
  for file in "$WORK"/*.mp4; do
    print -r -- "file '$file'"
  done
} > "$WORK/concat.txt"

"$FFMPEG" -y -hide_banner -loglevel error -f concat -safe 0 -i "$WORK/concat.txt" \
  -c copy -movflags +faststart "$OUT/Guide-Malagasy-Events-version-2.mp4"

print -r -- "$OUT/Guide-Malagasy-Events-version-2.mp4"
