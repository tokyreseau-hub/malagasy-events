#!/bin/zsh
set -euo pipefail

FFMPEG="/private/tmp/malagasy-events-video-tools/ffmpeg/ffmpeg"
ROOT="/Users/toky/Documents/Projets/projets-recuperes/malagasy-events"
SOURCE="/Users/toky/Downloads/ScreenRecording_07-27-2026 17-45-36_1.MP4"
VOICE="$ROOT/public/social/video-guide/narration-version-4.aiff"
IMAGES="$ROOT/public/social/video-guide/nouveaux-visuels"
ARROWS="$ROOT/public/social/video-guide/arrows"
WORK="$ROOT/.tmp-video-guide-v4-final"
OUT="$ROOT/public/social/video-guide"
FONT="/System/Library/Fonts/Supplemental/Arial Bold.ttf"

mkdir -p "$WORK" "$OUT"

photo() {
  local number="$1"
  local image="$2"
  local duration="$3"
  "$FFMPEG" -y -hide_banner -loglevel error -loop 1 -t "$duration" -i "$IMAGES/$image" \
    -vf "scale=1180:1180,zoompan=z='min(zoom+0.0007,1.055)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1080:fps=30,pad=1080:1920:0:420:color=0xF5F2ED,setpts=PTS-STARTPTS,format=yuv420p" \
    -an -c:v libx264 -preset ultrafast -crf 18 "$WORK/$number.mp4"
}

demo() {
  local number="$1"
  local start="$2"
  local duration="$3"
  local heading="$4"
  local detail="$5"
  local filter="scale=760:-1,pad=1080:1920:160:180:color=0xF5F2ED,fps=30,setpts=PTS-STARTPTS,setsar=1"
  filter+=",drawbox=x=0:y=0:w=1080:h=150:color=0xB20D2F:t=fill"
  filter+=",drawtext=fontfile='$FONT':text='$heading':x=54:y=23:fontsize=38:fontcolor=white"
  filter+=",drawtext=fontfile='$FONT':text='$detail':x=54:y=83:fontsize=25:fontcolor=0xF6C94C"
  filter+=",drawbox=x=0:y=1840:w=1080:h=80:color=0x00843D:t=fill"
  filter+=",drawtext=fontfile='$FONT':text='malagasy-events.com':x=(w-text_w)/2:y=1864:fontsize=27:fontcolor=white"
  "$FFMPEG" -y -hide_banner -loglevel error -ss "$start" -t "$duration" -i "$SOURCE" \
    -vf "$filter" -an -c:v libx264 -preset ultrafast -crf 20 -pix_fmt yuv420p "$WORK/$number.mp4"
}

demo_arrow() {
  local number="$1"
  local start="$2"
  local duration="$3"
  local heading="$4"
  local detail="$5"
  local arrow="$6"
  local xpos="$7"
  local ypos="$8"
  local until="$9"
  local base="[0:v]scale=760:-1,pad=1080:1920:160:180:color=0xF5F2ED,fps=30,setpts=PTS-STARTPTS,setsar=1"
  base+=",drawbox=x=0:y=0:w=1080:h=150:color=0xB20D2F:t=fill"
  base+=",drawtext=fontfile='$FONT':text='$heading':x=54:y=23:fontsize=38:fontcolor=white"
  base+=",drawtext=fontfile='$FONT':text='$detail':x=54:y=83:fontsize=25:fontcolor=0xF6C94C"
  base+=",drawbox=x=0:y=1840:w=1080:h=80:color=0x00843D:t=fill"
  base+=",drawtext=fontfile='$FONT':text='malagasy-events.com':x=(w-text_w)/2:y=1864:fontsize=27:fontcolor=white[screen]"
  local overlay="[screen][1:v]overlay=x='$xpos+7*sin(2*PI*t)':y='$ypos+5*sin(2*PI*t)':enable='between(t,0,$until)'"
  "$FFMPEG" -y -hide_banner -loglevel error \
    -ss "$start" -t "$duration" -i "$SOURCE" -loop 1 -t "$duration" -i "$ARROWS/$arrow.png" \
    -filter_complex "$base;$overlay" -an -c:v libx264 -preset ultrafast -crf 20 \
    -pix_fmt yuv420p -shortest "$WORK/$number.mp4"
}

demo_connection() {
  local number="$1"
  local heading="$2"
  local detail="$3"
  local base="[0:v]scale=760:-1,pad=1080:1920:160:180:color=0xF5F2ED,fps=30,setpts=PTS-STARTPTS,setsar=1"
  base+=",drawbox=x=0:y=0:w=1080:h=150:color=0xB20D2F:t=fill"
  base+=",drawtext=fontfile='$FONT':text='$heading':x=54:y=23:fontsize=38:fontcolor=white"
  base+=",drawtext=fontfile='$FONT':text='$detail':x=54:y=83:fontsize=25:fontcolor=0xF6C94C"
  base+=",drawbox=x=0:y=1840:w=1080:h=80:color=0x00843D:t=fill"
  base+=",drawtext=fontfile='$FONT':text='malagasy-events.com':x=(w-text_w)/2:y=1864:fontsize=27:fontcolor=white[screen]"
  local overlay="[screen][1:v]overlay=x='650+7*sin(2*PI*t)':y='185+5*sin(2*PI*t)':enable='between(t,0,3)'"
  "$FFMPEG" -y -hide_banner -loglevel error \
    -sseof -5 -i "$SOURCE" -loop 1 -t 5 -i "$ARROWS/down-right.png" \
    -filter_complex "$base;$overlay" -an -c:v libx264 -preset ultrafast -crf 20 \
    -pix_fmt yuv420p -shortest "$WORK/$number.mp4"
}

photo "01" "06-couverture.png" "6"
demo "02" "0" "4" "Bienvenue sur Malagasy Events" "Le point de départ de toute la communauté."
demo_arrow "03" "9" "10" "Ouvre le menu principal" "Appuie sur les trois lignes en haut à gauche." "down-left" "210" "145" "6"
photo "04" "01-annuaire.png" "12"
photo "05" "02-explorer.png" "3"
demo "06" "20" "4" "Gastronomie" "Restaurants, traiteurs et food trucks."
demo "07" "39" "4" "Églises" "Paroisses et communautés malagasy."
demo "08" "51" "4" "Sportifs" "Clubs, associations et tournois."
demo "09" "57" "4" "Boutiques" "Produits, épiceries et artisanat."
demo "10" "66" "10" "Guide France" "Études, travail, installation et démarches."
demo_arrow "11" "84" "13" "Recherche un événement" "Appuie dans la barre, puis écris son nom." "down-left" "500" "690" "8"
demo "12" "92" "4" "Choisis le bon résultat" "La fiche apparaît dans la liste."
demo "13" "95" "10" "Vérifie la fiche" "Date, lieu, prix et structure organisatrice."
demo_arrow "14" "99" "6" "Achète les billets" "Appuie sur le bouton vert en bas de la fiche." "down-left" "420" "1390" "5"
demo "15" "108" "4" "Billetterie officielle" "La page de réservation apparaît."
demo_connection "16" "Rejoins la communauté" "Appuie sur Connexion en haut à droite."
photo "17" "05-compte-gratuit.png" "8"
photo "18" "06-couverture.png" "8"

{
  for file in "$WORK"/[0-9][0-9].mp4; do
    print -r -- "file '$file'"
  done
} > "$WORK/concat.txt"

"$FFMPEG" -y -hide_banner -loglevel error -f concat -safe 0 -i "$WORK/concat.txt" \
  -c copy "$WORK/visuals.mp4"

"$FFMPEG" -y -hide_banner -loglevel error -i "$WORK/visuals.mp4" -i "$VOICE" \
  -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 160k -shortest \
  -movflags +faststart "$OUT/Guide-Malagasy-Events-version-4.mp4"

print -r -- "$OUT/Guide-Malagasy-Events-version-4.mp4"
