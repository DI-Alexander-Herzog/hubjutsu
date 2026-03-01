#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 3 ]]; then
  echo "Usage: $0 <input> <playlist> <segment_pattern> [segment_from] [segment_to]" >&2
  exit 2
fi

input="$1"
playlist="$2"
segment_pattern="$3"
segment_from="${4:-}"
segment_to="${5:-}"

mkdir -p "$(dirname "$playlist")"

segment_args=()
if [[ -n "$segment_from" ]]; then
  segment_args+=(-ss "$segment_from")
fi
if [[ -n "$segment_to" ]]; then
  segment_args+=(-to "$segment_to")
fi

ffmpeg -y \
  -i "$input" \
  "${segment_args[@]}" \
  -c:v libx264 \
  -c:a aac \
  -hls_time 6 \
  -hls_playlist_type vod \
  -hls_segment_filename "$segment_pattern" \
  "$playlist"
