#!/bin/zsh
set -euo pipefail

FFMPEG="/private/tmp/malagasy-events-video-tools/ffmpeg/ffmpeg"
ROOT="/Users/toky/Documents/Projets/projets-recuperes/malagasy-events"
VIDEO="$ROOT/public/social/video-guide/Guide-Malagasy-Events-style-CapCut.mp4"
AUDIO="$ROOT/public/social/video-guide/Guide-Malagasy-Events-futuriste.mp4"
OUTPUT="$ROOT/public/social/video-guide/Guide-Malagasy-Events-jeune-fun.mp4"
FONT="/System/Library/Fonts/Supplemental/Arial Bold.ttf"

VF="eq=contrast=1.035:saturation=1.13:brightness=0.006"
VF+=",unsharp=5:5:0.30:3:3:0"

# Confettis minimalistes en mouvement dans les marges.
VF+=",drawbox=x='mod(t*90+80,1040)':y=205:w=9:h=9:color=0xFFD21F@0.82:t=fill"
VF+=",drawbox=x='1040-mod(t*65+160,1030)':y=1650:w=8:h=8:color=0x00A86B@0.76:t=fill"
VF+=",drawbox=x='mod(t*48+300,1060)':y=1740:w=7:h=7:color=0xE5164F@0.72:t=fill"
VF+=",drawbox=x='1020-mod(t*42+430,1010)':y=275:w=6:h=6:color=0x35C7FF@0.70:t=fill"

# Badges de chapitres colorés, plus spontanés que les cartouches futuristes.
VF+=",drawbox=x=770:y=158:w=280:h=54:color=0xFFD21F@0.94:t=fill:enable='between(t,4,12)'"
VF+=",drawtext=fontfile='$FONT':text='#01  ON COMMENCE':x=790:y=173:fontsize=22:fontcolor=0x151515:enable='between(t,4,12)'"
VF+=",drawbox=x=790:y=158:w=260:h=54:color=0x36D982@0.94:t=fill:enable='between(t,12,41)'"
VF+=",drawtext=fontfile='$FONT':text='#02  ON EXPLORE':x=808:y=173:fontsize=22:fontcolor=0x102719:enable='between(t,12,41)'"
VF+=",drawbox=x=750:y=158:w=300:h=54:color=0x48CCFF@0.94:t=fill:enable='between(t,41,51)'"
VF+=",drawtext=fontfile='$FONT':text='#03  ON RECHERCHE':x=770:y=173:fontsize=22:fontcolor=0x10212B:enable='between(t,41,51)'"
VF+=",drawbox=x=782:y=158:w=268:h=54:color=0xFFCF3D@0.94:t=fill:enable='between(t,51,72)'"
VF+=",drawtext=fontfile='$FONT':text='#04  ON VÉRIFIE':x=803:y=173:fontsize=22:fontcolor=0x251A00:enable='between(t,51,72)'"
VF+=",drawbox=x=775:y=158:w=275:h=54:color=0xFF4F83@0.94:t=fill:enable='between(t,72,90)'"
VF+=",drawtext=fontfile='$FONT':text='#05  ON SE LANCE':x=795:y=173:fontsize=22:fontcolor=white:enable='between(t,72,90)'"

# Stickers qui glissent depuis la droite aux moments importants.
VF+=",drawbox=x='max(650,1080-(t-4)*720)':y=1570:w=370:h=74:color=0xE5164F@0.96:t=fill:enable='between(t,4,6.8)'"
VF+=",drawtext=fontfile='$FONT':text='C EST PARTI !':x='max(690,1120-(t-4)*720)':y=1589:fontsize=34:fontcolor=white:enable='between(t,4,6.8)'"
VF+=",drawbox=x='max(625,1080-(t-44)*760)':y=1570:w=395:h=74:color=0x35C7FF@0.96:t=fill:enable='between(t,44,47.3)'"
VF+=",drawtext=fontfile='$FONT':text='TAPE LE NOM !':x='max(675,1130-(t-44)*760)':y=1589:fontsize=32:fontcolor=0x10212B:enable='between(t,44,47.3)'"
VF+=",drawbox=x='max(650,1080-(t-64)*760)':y=1570:w=370:h=74:color=0x36D982@0.96:t=fill:enable='between(t,64,67.5)'"
VF+=",drawtext=fontfile='$FONT':text='CLIQUE ICI !':x='max(710,1140-(t-64)*760)':y=1589:fontsize=32:fontcolor=0x102719:enable='between(t,64,67.5)'"
VF+=",drawbox=x='max(610,1080-(t-90)*760)':y=1570:w=410:h=74:color=0xFFD21F@0.97:t=fill:enable='between(t,90,93.5)'"
VF+=",drawtext=fontfile='$FONT':text='BIENVENUE !':x='max(680,1150-(t-90)*760)':y=1589:fontsize=34:fontcolor=0x151515:enable='between(t,90,93.5)'"

# Petites impulsions colorées autour de l'écran lors des clics.
VF+=",drawbox=x=146:y=167:w=788:h=1682:color=0xFFD21F@0.76:t=5:enable='between(t,10.7,11.7)+between(t,45.5,46.5)'"
VF+=",drawbox=x=146:y=167:w=788:h=1682:color=0x36D982@0.78:t=5:enable='between(t,65,67.8)+between(t,72,74.8)'"
VF+=",noise=alls=0.8:allf=t+u,format=yuv420p"

"$FFMPEG" -y -hide_banner -loglevel error \
  -i "$VIDEO" -i "$AUDIO" \
  -filter_complex "[0:v]${VF}[v];[1:a]volume=1.0[a]" \
  -map "[v]" -map "[a]" \
  -c:v libx264 -preset medium -crf 17 \
  -c:a aac -b:a 192k -movflags +faststart "$OUTPUT"

print -r -- "$OUTPUT"
