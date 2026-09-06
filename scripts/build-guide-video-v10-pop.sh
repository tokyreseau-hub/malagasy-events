#!/bin/zsh
set -euo pipefail

FFMPEG="/private/tmp/malagasy-events-video-tools/ffmpeg/ffmpeg"
ROOT="/Users/toky/Documents/Projets/projets-recuperes/malagasy-events"
VIDEO="$ROOT/public/social/video-guide/Guide-Malagasy-Events-jeune-fun.mp4"
OUTPUT="$ROOT/public/social/video-guide/Guide-Malagasy-Events-pop.mp4"
FONT="/System/Library/Fonts/Supplemental/Arial Bold.ttf"

VF="eq=contrast=1.025:saturation=1.08"

# Barre de progression façon Reel.
VF+=",drawbox=x=0:y=1904:w=1080:h=16:color=white@0.28:t=fill"
VF+=",drawbox=x=0:y=1904:w='1080*t/93.71':h=16:color=0xFFD21F@0.98:t=fill"

# Réactions et mots-clés qui apparaissent comme des stickers.
VF+=",drawbox=x='-330+min((t-14)*620,360)':y=1495:w=330:h=64:color=0xE5164F@0.94:t=fill:enable='between(t,14,17.2)'"
VF+=",drawtext=fontfile='$FONT':text='TOUT EST ICI':x='-295+min((t-14)*620,360)':y=1512:fontsize=28:fontcolor=white:enable='between(t,14,17.2)'"
VF+=",drawbox=x='1080-min((t-27)*650,390)':y=1545:w=390:h=64:color=0xFFD21F@0.96:t=fill:enable='between(t,27,30.2)'"
VF+=",drawtext=fontfile='$FONT':text='CHOISIS TA RUBRIQUE':x='1110-min((t-27)*650,390)':y=1562:fontsize=25:fontcolor=0x171717:enable='between(t,27,30.2)'"
VF+=",drawbox=x='-360+min((t-53)*620,390)':y=1515:w=390:h=64:color=0xFF4F83@0.95:t=fill:enable='between(t,53,56.2)'"
VF+=",drawtext=fontfile='$FONT':text='TOUTES LES INFOS':x='-325+min((t-53)*620,390)':y=1532:fontsize=27:fontcolor=white:enable='between(t,53,56.2)'"
VF+=",drawbox=x='1080-min((t-68)*650,390)':y=1495:w=390:h=64:color=0x35C7FF@0.95:t=fill:enable='between(t,68,71.2)'"
VF+=",drawtext=fontfile='$FONT':text='LIEN OFFICIEL':x='1145-min((t-68)*650,390)':y=1512:fontsize=28:fontcolor=0x10212B:enable='between(t,68,71.2)'"
VF+=",drawbox=x='-350+min((t-81)*620,380)':y=1515:w=380:h=64:color=0x36D982@0.96:t=fill:enable='between(t,81,84.2)'"
VF+=",drawtext=fontfile='$FONT':text='COMPTE GRATUIT':x='-305+min((t-81)*620,380)':y=1532:fontsize=28:fontcolor=0x102719:enable='between(t,81,84.2)'"

# Petits éclats colorés synchronisés avec les changements de section.
VF+=",drawbox=x=78:y=242:w=16:h=52:color=0xFFD21F@0.92:t=fill:enable='between(t,11.7,12.2)+between(t,40.7,41.2)+between(t,50.7,51.2)+between(t,71.7,72.2)'"
VF+=",drawbox=x=100:y=258:w=52:h=16:color=0xE5164F@0.92:t=fill:enable='between(t,11.7,12.2)+between(t,40.7,41.2)+between(t,50.7,51.2)+between(t,71.7,72.2)'"
VF+=",drawbox=x=986:y=1680:w=16:h=52:color=0x36D982@0.92:t=fill:enable='between(t,11.7,12.2)+between(t,40.7,41.2)+between(t,50.7,51.2)+between(t,71.7,72.2)'"
VF+=",drawbox=x=950:y=1698:w=52:h=16:color=0x35C7FF@0.92:t=fill:enable='between(t,11.7,12.2)+between(t,40.7,41.2)+between(t,50.7,51.2)+between(t,71.7,72.2)'"

# Flash très bref sur chaque clic, comme un retour tactile.
VF+=",drawbox=x=0:y=0:w=1080:h=1920:color=white@0.12:t=fill:enable='between(t,11.05,11.16)+between(t,46.0,46.12)+between(t,66.15,66.27)+between(t,73.25,73.37)'"

# Pastilles décoratives en mouvement, limitées aux marges.
VF+=",drawbox=x='mod(t*115+40,1040)':y=230:w=12:h=12:color=0xFF4F83@0.82:t=fill"
VF+=",drawbox=x='1040-mod(t*92+210,1030)':y=1770:w=11:h=11:color=0xFFD21F@0.86:t=fill"
VF+=",drawbox=x='mod(t*74+490,1050)':y=1815:w=8:h=8:color=0x35C7FF@0.78:t=fill"
VF+=",format=yuv420p"

"$FFMPEG" -y -hide_banner -loglevel error \
  -i "$VIDEO" \
  -filter_complex "[0:v]${VF}[v]" \
  -map "[v]" -map 0:a \
  -c:v libx264 -preset medium -crf 17 \
  -c:a copy -movflags +faststart "$OUTPUT"

print -r -- "$OUTPUT"
