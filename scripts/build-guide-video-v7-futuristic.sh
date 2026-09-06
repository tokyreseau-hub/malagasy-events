#!/bin/zsh
set -euo pipefail

FFMPEG="/private/tmp/malagasy-events-video-tools/ffmpeg/ffmpeg"
ROOT="/Users/toky/Documents/Projets/projets-recuperes/malagasy-events"
INPUT="$ROOT/public/social/video-guide/Guide-Malagasy-Events-style-CapCut.mp4"
OUTPUT="$ROOT/public/social/video-guide/Guide-Malagasy-Events-futuriste.mp4"

FLASHES="between(t,4,4.08)+between(t,12,12.08)+between(t,33,33.08)+between(t,41,41.08)+between(t,51,51.08)+between(t,68,68.08)+between(t,72,72.08)+between(t,75,75.08)+between(t,82,82.08)+between(t,90,90.08)"

VIDEO_FILTER="eq=contrast=1.025:saturation=1.06:brightness=0.004"
VIDEO_FILTER+=",unsharp=5:5:0.28:3:3:0"
VIDEO_FILTER+=",drawgrid=w=180:h=180:t=1:c=0x00A86B@0.028"
VIDEO_FILTER+=",drawbox=x=0:y='mod(t*170,1920)':w=1080:h=2:color=0x45F5D0@0.07:t=fill"
VIDEO_FILTER+=",drawbox=x='mod(t*250,1400)-300':y=0:w=150:h=1920:color=white@0.018:t=fill"
# Repères HUD très fins dans les quatre coins.
VIDEO_FILTER+=",drawbox=x=28:y=28:w=90:h=3:color=0xF4B400@0.65:t=fill"
VIDEO_FILTER+=",drawbox=x=28:y=28:w=3:h=90:color=0xF4B400@0.65:t=fill"
VIDEO_FILTER+=",drawbox=x=962:y=28:w=90:h=3:color=0x00A86B@0.65:t=fill"
VIDEO_FILTER+=",drawbox=x=1049:y=28:w=3:h=90:color=0x00A86B@0.65:t=fill"
VIDEO_FILTER+=",drawbox=x=28:y=1800:w=90:h=3:color=0xB20D2F@0.55:t=fill"
VIDEO_FILTER+=",drawbox=x=28:y=1713:w=3:h=90:color=0xB20D2F@0.55:t=fill"
VIDEO_FILTER+=",drawbox=x=962:y=1800:w=90:h=3:color=0xF4B400@0.55:t=fill"
VIDEO_FILTER+=",drawbox=x=1049:y=1713:w=3:h=90:color=0xF4B400@0.55:t=fill"
# Flash froid de 80 ms uniquement aux grands changements de chapitre.
VIDEO_FILTER+=",drawbox=x=0:y=0:w=1080:h=1920:color=0xDFFFF8@0.12:t=fill:enable='$FLASHES'"
VIDEO_FILTER+=",noise=alls=1.1:allf=t+u,format=yuv420p"

"$FFMPEG" -y -hide_banner -loglevel error \
  -i "$INPUT" \
  -f lavfi -i "sine=frequency=920:duration=0.085:sample_rate=48000" \
  -filter_complex "\
    [0:v]${VIDEO_FILTER}[v];\
    [0:a]aresample=48000,volume=1.0[voice];\
    [1:a]volume=0.055,asplit=4[p1][p2][p3][p4];\
    [p1]adelay=11500|11500[a1];\
    [p2]adelay=46500|46500[a2];\
    [p3]adelay=66500|66500[a3];\
    [p4]adelay=73000|73000[a4];\
    [voice][a1][a2][a3][a4]amix=inputs=5:duration=first:normalize=0,alimiter=limit=0.95[a]" \
  -map "[v]" -map "[a]" \
  -c:v libx264 -preset medium -crf 18 \
  -c:a aac -b:a 192k -movflags +faststart "$OUTPUT"

print -r -- "$OUTPUT"
