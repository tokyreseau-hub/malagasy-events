#!/bin/zsh
set -euo pipefail

FFMPEG="/private/tmp/malagasy-events-video-tools/ffmpeg/ffmpeg"
ROOT="/Users/toky/Documents/Projets/projets-recuperes/malagasy-events"
SOURCE="/Users/toky/Downloads/ScreenRecording_07-27-2026 17-45-36_1.MP4"
WORK="$ROOT/.tmp-video-guide"
CARDS="$ROOT/public/social/video-guide/cards"
OUT="$ROOT/public/social/video-guide"

mkdir -p "$WORK" "$OUT"

video_segment() {
  local number="$1"
  local start="$2"
  local duration="$3"
  "$FFMPEG" -y -hide_banner -loglevel error \
    -ss "$start" -t "$duration" -i "$SOURCE" \
    -f lavfi -t "$duration" -i "anullsrc=channel_layout=stereo:sample_rate=48000" \
    -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x17040A,fps=30,setsar=1" \
    -map 0:v:0 -map 1:a:0 -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p \
    -c:a aac -b:a 128k -shortest "$WORK/$number.mp4"
}

card_segment() {
  local number="$1"
  local card="$2"
  local duration="$3"
  "$FFMPEG" -y -hide_banner -loglevel error \
    -loop 1 -t "$duration" -i "$CARDS/$card.png" \
    -f lavfi -t "$duration" -i "anullsrc=channel_layout=stereo:sample_rate=48000" \
    -vf "fps=30,format=yuv420p" -map 0:v:0 -map 1:a:0 \
    -c:v libx264 -preset fast -crf 18 -c:a aac -b:a 128k -shortest "$WORK/$number.mp4"
}

card_segment "01" "01-intro" "2.5"
video_segment "02" "125" "4"
card_segment "03" "02-explorer" "2"
video_segment "04" "8" "6"
video_segment "05" "18" "5"
video_segment "06" "38" "5"
video_segment "07" "51" "6"
card_segment "08" "03-guide" "2"
video_segment "09" "66" "6"
video_segment "10" "76" "5"
card_segment "11" "04-evenement" "2"
video_segment "12" "87" "8"
video_segment "13" "118" "5"
card_segment "14" "05-outro" "3"

{
  for file in "$WORK"/*.mp4; do
    print -r -- "file '$file'"
  done
} > "$WORK/concat.txt"

"$FFMPEG" -y -hide_banner -loglevel error -f concat -safe 0 -i "$WORK/concat.txt" \
  -c copy -movflags +faststart "$OUT/Guide-Malagasy-Events-version-1.mp4"

print -r -- "$OUT/Guide-Malagasy-Events-version-1.mp4"
