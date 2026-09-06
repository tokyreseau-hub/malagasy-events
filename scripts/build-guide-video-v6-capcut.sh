#!/bin/zsh
set -euo pipefail

FFMPEG="/private/tmp/malagasy-events-video-tools/ffmpeg/ffmpeg"
ROOT="/Users/toky/Documents/Projets/projets-recuperes/malagasy-events"
WORK="$ROOT/.tmp-video-guide-v5"
OUT="$ROOT/public/social/video-guide"
FINAL="$OUT/Guide-Malagasy-Events-style-CapCut.mp4"
TRANSITION="0.18"

# Reconstruit d'abord les plans parfaitement synchronisés et la voix nettoyée.
"$ROOT/scripts/build-guide-video-v5.sh" >/dev/null

typeset -a durations
durations=(4 3 5 6 3 3 3 3 3 8 6 4 7 6 4 4 3 7 8 4)

typeset -a transitions
transitions=(
  fade
  slideleft
  smoothright
  circleopen
  wipeleft
  slideright
  slideup
  wiperight
  smoothleft
  fadeblack
  slideleft
  circleopen
  smoothup
  slideright
  wipeleft
  zoomin
  slideup
  fade
  circleclose
)

typeset -a inputs
local_filter=""
for i in {1..20}; do
  number=$(printf "%02d" "$i")
  inputs+=(-i "$WORK/$number.mp4")
  index=$((i-1))
  local_filter+="[$index:v]setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=$TRANSITION,settb=AVTB[v$index];"
done

offset="${durations[1]}"
local_filter+="[v0][v1]xfade=transition=${transitions[1]}:duration=$TRANSITION:offset=${offset}[x1];"

for i in {2..19}; do
  offset=$(awk -v a="$offset" -v b="${durations[$i]}" 'BEGIN { printf "%.3f", a+b }')
  next=$((i+1))
  local_filter+="[x$((i-1))][v$i]xfade=transition=${transitions[$i]}:duration=$TRANSITION:offset=${offset}[x$i];"
done

# Fine ligne de progression et micro-zoom final : repères visuels modernes,
# mais sans masquer les boutons ni les informations du site.
local_filter+="[x19]drawbox=x=0:y=1818:w='min(1080,1080*t/93.7)':h=9:color=0xF4B400:t=fill,format=yuv420p[finalv]"

"$FFMPEG" -y -hide_banner -loglevel error \
  "${inputs[@]}" \
  -filter_complex "$local_filter" -map "[finalv]" \
  -an -c:v libx264 -preset medium -crf 18 -movflags +faststart \
  "$WORK/visuals-capcut.mp4"

"$FFMPEG" -y -hide_banner -loglevel error \
  -i "$WORK/visuals-capcut.mp4" -i "$WORK/voix-nettoyee.m4a" \
  -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -shortest \
  -movflags +faststart "$FINAL"

print -r -- "$FINAL"
