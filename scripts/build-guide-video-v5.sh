#!/bin/zsh
set -euo pipefail

FFMPEG="/private/tmp/malagasy-events-video-tools/ffmpeg/ffmpeg"
ROOT="/Users/toky/Documents/Projets/projets-recuperes/malagasy-events"
SOURCE="/Users/toky/Downloads/ScreenRecording_07-27-2026 17-45-36_1.MP4"
VOICE_SOURCE="/Users/toky/Downloads/WhatsApp Video 2026-07-28 at 18.51.18.mp4"
IMAGES="$ROOT/public/social/video-guide/nouveaux-visuels"
ARROWS="$ROOT/public/social/video-guide/arrows"
WORK="$ROOT/.tmp-video-guide-v5"
OUT="$ROOT/public/social/video-guide"
FONT="/System/Library/Fonts/Supplemental/Arial Bold.ttf"

mkdir -p "$WORK" "$OUT"

photo() {
  local number="$1" image="$2" duration="$3"
  "$FFMPEG" -y -hide_banner -loglevel error -framerate 30 -loop 1 -t "$duration" -i "$IMAGES/$image" \
    -vf "scale=1180:1180,zoompan=z='min(zoom+0.00055,1.045)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1080:fps=30,pad=1080:1920:0:420:color=0xF5F2ED,fade=t=in:st=0:d=0.20,format=yuv420p" \
    -an -c:v libx264 -preset ultrafast -crf 18 "$WORK/$number.mp4"
}

demo() {
  local number="$1" start="$2" duration="$3" heading="$4" detail="$5"
  local filter="scale=760:-1,pad=1080:1920:160:180:color=0xF5F2ED,fps=30,setpts=PTS-STARTPTS,setsar=1"
  filter+=",drawbox=x=0:y=0:w=1080:h=150:color=0xB20D2F:t=fill"
  filter+=",drawtext=fontfile='$FONT':text='$heading':x=54:y=23:fontsize=38:fontcolor=white"
  filter+=",drawtext=fontfile='$FONT':text='$detail':x=54:y=83:fontsize=25:fontcolor=0xF6C94C"
  filter+=",drawbox=x=0:y=1840:w=1080:h=80:color=0x00843D:t=fill"
  filter+=",drawtext=fontfile='$FONT':text='malagasy-events.com':x=(w-text_w)/2:y=1864:fontsize=27:fontcolor=white"
  filter+=",fade=t=in:st=0:d=0.18"
  "$FFMPEG" -y -hide_banner -loglevel error -ss "$start" -t "$duration" -i "$SOURCE" \
    -vf "$filter" -an -c:v libx264 -preset ultrafast -crf 20 -pix_fmt yuv420p "$WORK/$number.mp4"
}

demo_arrow() {
  local number="$1" start="$2" duration="$3" heading="$4" detail="$5"
  local arrow="$6" xpos="$7" ypos="$8" until="$9"
  local base="[0:v]scale=760:-1,pad=1080:1920:160:180:color=0xF5F2ED,fps=30,setpts=PTS-STARTPTS,setsar=1"
  base+=",drawbox=x=0:y=0:w=1080:h=150:color=0xB20D2F:t=fill"
  base+=",drawtext=fontfile='$FONT':text='$heading':x=54:y=23:fontsize=38:fontcolor=white"
  base+=",drawtext=fontfile='$FONT':text='$detail':x=54:y=83:fontsize=25:fontcolor=0xF6C94C"
  base+=",drawbox=x=0:y=1840:w=1080:h=80:color=0x00843D:t=fill"
  base+=",drawtext=fontfile='$FONT':text='malagasy-events.com':x=(w-text_w)/2:y=1864:fontsize=27:fontcolor=white[screen]"
  local overlay="[screen][1:v]overlay=x='$xpos+6*sin(2*PI*t)':y='$ypos+4*sin(2*PI*t)':enable='between(t,.25,$until)'"
  "$FFMPEG" -y -hide_banner -loglevel error \
    -ss "$start" -t "$duration" -i "$SOURCE" -loop 1 -t "$duration" -i "$ARROWS/$arrow.png" \
    -filter_complex "$base;$overlay" -an -c:v libx264 -preset ultrafast -crf 20 \
    -pix_fmt yuv420p -shortest "$WORK/$number.mp4"
}

still_demo() {
  local number="$1" image="$2" duration="$3" heading="$4" detail="$5"
  local filter="scale=760:-1,pad=1080:1920:160:180:color=0xF5F2ED,fps=30,setpts=PTS-STARTPTS,setsar=1"
  filter+=",drawbox=x=0:y=0:w=1080:h=150:color=0xB20D2F:t=fill"
  filter+=",drawtext=fontfile='$FONT':text='$heading':x=54:y=23:fontsize=38:fontcolor=white"
  filter+=",drawtext=fontfile='$FONT':text='$detail':x=54:y=83:fontsize=25:fontcolor=0xF6C94C"
  filter+=",drawbox=x=0:y=1840:w=1080:h=80:color=0x00843D:t=fill"
  filter+=",drawtext=fontfile='$FONT':text='malagasy-events.com':x=(w-text_w)/2:y=1864:fontsize=27:fontcolor=white"
  "$FFMPEG" -y -hide_banner -loglevel error -framerate 30 -loop 1 -t "$duration" -i "$image" \
    -vf "$filter" -an -c:v libx264 -preset ultrafast -crf 20 -pix_fmt yuv420p "$WORK/$number.mp4"
}

still_demo_arrow() {
  local number="$1" image="$2" duration="$3" heading="$4" detail="$5"
  local arrow="$6" xpos="$7" ypos="$8" until="$9"
  local base="[0:v]scale=760:-1,pad=1080:1920:160:180:color=0xF5F2ED,fps=30,setpts=PTS-STARTPTS,setsar=1"
  base+=",drawbox=x=0:y=0:w=1080:h=150:color=0xB20D2F:t=fill"
  base+=",drawtext=fontfile='$FONT':text='$heading':x=54:y=23:fontsize=38:fontcolor=white"
  base+=",drawtext=fontfile='$FONT':text='$detail':x=54:y=83:fontsize=25:fontcolor=0xF6C94C"
  base+=",drawbox=x=0:y=1840:w=1080:h=80:color=0x00843D:t=fill"
  base+=",drawtext=fontfile='$FONT':text='malagasy-events.com':x=(w-text_w)/2:y=1864:fontsize=27:fontcolor=white[screen]"
  local overlay="[screen][1:v]overlay=x='$xpos+6*sin(2*PI*t)':y='$ypos+4*sin(2*PI*t)':enable='between(t,.2,$until)'"
  "$FFMPEG" -y -hide_banner -loglevel error \
    -framerate 30 -loop 1 -t "$duration" -i "$image" -loop 1 -t "$duration" -i "$ARROWS/$arrow.png" \
    -filter_complex "$base;$overlay" -an -c:v libx264 -preset ultrafast -crf 20 \
    -pix_fmt yuv420p -shortest "$WORK/$number.mp4"
}

# Deux arrêts sur image propres servent uniquement à laisser le temps de lire
# les boutons, sans perdre l'action de clic montrée juste avant.
"$FFMPEG" -y -hide_banner -loglevel error -ss 101 -i "$SOURCE" -frames:v 1 "$WORK/event-actions.jpg"
"$FFMPEG" -y -hide_banner -loglevel error -ss 127 -i "$SOURCE" -frames:v 1 "$WORK/connection-modal.jpg"

# 94 secondes d'images, alignées sur les paragraphes de la narration.
photo      "01" "06-couverture.png" 4
demo       "02" 0   3 "Bienvenue sur Malagasy Events" "Événements et bonnes adresses de la communauté."
demo_arrow "03" 9   5 "Ouvre le menu principal" "Appuie sur les trois lignes en haut à gauche." "down-left" 205 170 4.5
photo      "04" "01-annuaire.png" 6
demo       "05" 20  3 "Gastronomie" "Restaurants, traiteurs et food trucks."
demo       "06" 30  3 "Professionnels" "Associations, organisateurs, artistes et services."
demo       "07" 39  3 "Églises" "Paroisses et communautés malagasy."
demo       "08" 51  3 "Sportifs" "Clubs, associations et tournois."
demo       "09" 57  3 "Boutiques" "Produits, épiceries et artisanat."
demo       "10" 66  8 "Guide France" "Études, travail, installation et démarches."
demo_arrow "11" 84  6 "Recherche un événement" "Appuie dans la barre et écris son nom." "down-left" 500 690 5.5
demo       "12" 92  4 "Choisis le bon résultat" "La fiche recherchée apparaît immédiatement."
demo       "13" 95  7 "Vérifie les informations" "Date, lieu, prix et structure organisatrice."
still_demo "14" "$WORK/event-actions.jpg" 6 "Utilise les actions utiles" "Carte, rappel et partage sont sur la fiche."
still_demo_arrow "15" "$WORK/event-actions.jpg" 4 "Achète les billets" "Appuie sur le bouton vert confirmé." "down-left" 410 1410 3.8
demo       "16" 114 4 "Billetterie officielle" "La page de réservation s’ouvre directement."
demo_arrow "17" 124 3 "Rejoins la communauté" "Appuie sur Connexion en haut à droite." "down-right" 690 175 2.2
still_demo "18" "$WORK/connection-modal.jpg" 7 "Connexion ou inscription" "Le formulaire apparaît immédiatement."
photo      "19" "05-compte-gratuit.png" 8
photo      "20" "06-couverture.png" 4

{
  for file in "$WORK"/[0-9][0-9].mp4; do
    print -r -- "file '$file'"
  done
} > "$WORK/concat.txt"

"$FFMPEG" -y -hide_banner -loglevel error -f concat -safe 0 -i "$WORK/concat.txt" \
  -c copy "$WORK/visuals.mp4"

# On ne conserve que la voix du fichier WhatsApp. Nettoyage léger, sans
# transformation artificielle du timbre, puis normalisation pour téléphone.
"$FFMPEG" -y -hide_banner -loglevel error -i "$VOICE_SOURCE" \
  -vn -af "highpass=f=75,lowpass=f=11000,afftdn=nf=-28,loudnorm=I=-16:TP=-1.5:LRA=9" \
  -c:a aac -b:a 192k "$WORK/voix-nettoyee.m4a"

"$FFMPEG" -y -hide_banner -loglevel error -i "$WORK/visuals.mp4" -i "$WORK/voix-nettoyee.m4a" \
  -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -shortest \
  -movflags +faststart "$OUT/Guide-Malagasy-Events-voix-finale.mp4"

print -r -- "$OUT/Guide-Malagasy-Events-voix-finale.mp4"
