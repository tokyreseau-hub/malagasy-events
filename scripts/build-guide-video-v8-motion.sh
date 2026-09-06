#!/bin/zsh
set -euo pipefail

FFMPEG="/private/tmp/malagasy-events-video-tools/ffmpeg/ffmpeg"
ROOT="/Users/toky/Documents/Projets/projets-recuperes/malagasy-events"
INPUT="$ROOT/public/social/video-guide/Guide-Malagasy-Events-futuriste.mp4"
OUTPUT="$ROOT/public/social/video-guide/Guide-Malagasy-Events-motion-design.mp4"
FONT="/System/Library/Fonts/Supplemental/Arial Bold.ttf"

CUTS="between(t,3.94,4.14)+between(t,6.94,7.14)+between(t,11.94,12.14)+between(t,17.94,18.14)+between(t,32.94,33.14)+between(t,40.94,41.14)+between(t,46.94,47.14)+between(t,50.94,51.14)+between(t,57.94,58.14)+between(t,63.94,64.14)+between(t,67.94,68.14)+between(t,71.94,72.14)+between(t,74.94,75.14)+between(t,81.94,82.14)+between(t,89.94,90.14)"

VF="rgbashift=rh=3:rv=0:bh=-3:bv=0:enable='$CUTS'"
VF+=",gblur=sigma=1.4:steps=1:enable='$CUTS'"
# Deux filets lumineux se croisent lentement dans les marges.
VF+=",drawbox=x='mod(t*210,1320)-240':y=150:w=240:h=3:color=0x50FFE4@0.20:t=fill"
VF+=",drawbox=x='1080-mod(t*165,1260)':y=1785:w=180:h=3:color=0xFFCF3D@0.18:t=fill"
# Petits points techniques mobiles, façon interface éditoriale.
VF+=",drawbox=x='mod(80+t*34,1040)':y=235:w=5:h=5:color=0x45F5D0@0.38:t=fill"
VF+=",drawbox=x='1040-mod(t*27,1020)':y=1685:w=5:h=5:color=0xF4B400@0.38:t=fill"

# Cartouches de chapitres : ils changent au rythme de la narration.
VF+=",drawbox=x=724:y=158:w=330:h=54:color=0x071B2A@0.84:t=fill:enable='between(t,4,12)'"
VF+=",drawtext=fontfile='$FONT':text='01  ACCUEIL':x=755:y=172:fontsize=24:fontcolor=0x63FFE5:enable='between(t,4,12)'"
VF+=",drawbox=x=724:y=158:w=330:h=54:color=0x071B2A@0.84:t=fill:enable='between(t,12,41)'"
VF+=",drawtext=fontfile='$FONT':text='02  EXPLORER':x=755:y=172:fontsize=24:fontcolor=0x63FFE5:enable='between(t,12,41)'"
VF+=",drawbox=x=724:y=158:w=330:h=54:color=0x071B2A@0.84:t=fill:enable='between(t,41,51)'"
VF+=",drawtext=fontfile='$FONT':text='03  RECHERCHER':x=745:y=172:fontsize=24:fontcolor=0x63FFE5:enable='between(t,41,51)'"
VF+=",drawbox=x=724:y=158:w=330:h=54:color=0x071B2A@0.84:t=fill:enable='between(t,51,72)'"
VF+=",drawtext=fontfile='$FONT':text='04  VÉRIFIER':x=755:y=172:fontsize=24:fontcolor=0x63FFE5:enable='between(t,51,72)'"
VF+=",drawbox=x=724:y=158:w=330:h=54:color=0x071B2A@0.84:t=fill:enable='between(t,72,90)'"
VF+=",drawtext=fontfile='$FONT':text='05  REJOINDRE':x=750:y=172:fontsize=24:fontcolor=0x63FFE5:enable='between(t,72,90)'"

# Cadre de téléphone lumineux et impulsions sur les passages interactifs.
VF+=",drawbox=x=153:y=174:w=774:h=1668:color=0x58FDE1@0.24:t=2"
VF+=",drawbox=x=145:y=166:w=790:h=1684:color=0xF4B400@0.30:t=4:enable='between(t,10.8,11.8)+between(t,45.5,46.7)+between(t,65.2,67.8)+between(t,72.1,74.8)'"

# Flash central bref, plus nerveux qu'un simple fondu.
VF+=",drawbox=x=70:y=925:w=940:h=4:color=white@0.72:t=fill:enable='$CUTS'"
VF+=",noise=alls=1.5:allf=t+u,format=yuv420p"

"$FFMPEG" -y -hide_banner -loglevel error \
  -i "$INPUT" \
  -filter_complex "[0:v]${VF}[v];[0:a]volume=1.0[a]" \
  -map "[v]" -map "[a]" \
  -c:v libx264 -preset medium -crf 17 \
  -c:a aac -b:a 192k -movflags +faststart "$OUTPUT"

print -r -- "$OUTPUT"
