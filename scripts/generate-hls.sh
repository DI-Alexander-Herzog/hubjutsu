#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 3 ]]; then
  echo "Usage: $0 <input> <playlist> <segment_pattern> [segment_from] [segment_to] [segments_spec]" >&2
  exit 2
fi

input="$1"
playlist="$2"
segment_pattern="$3"
segment_from="${4:-}"
segment_to="${5:-}"
segments_spec="${6:-}"

mkdir -p "$(dirname "$playlist")"

tmp_dir=""
source_for_hls="$input"
cleanup() {
  if [[ -n "$tmp_dir" && -d "$tmp_dir" ]]; then
    rm -rf "$tmp_dir"
  fi
}
trap cleanup EXIT

if [[ -n "$segments_spec" ]]; then
  tmp_dir="$(mktemp -d)"
  concat_file="$tmp_dir/concat.txt"
  : > "$concat_file"

  IFS=',' read -r -a segments <<< "$segments_spec"
  idx=0
  for seg in "${segments[@]}"; do
    [[ -z "$seg" ]] && continue
    from="${seg%%-*}"
    to="${seg##*-}"
    [[ -z "$from" || -z "$to" ]] && continue
    chunk="$tmp_dir/chunk_$(printf "%04d" "$idx").mp4"
    ffmpeg -y -ss "$from" -to "$to" -i "$input" -c:v libx264 -c:a aac "$chunk"
    printf "file '%s'\n" "$chunk" >> "$concat_file"
    idx=$((idx + 1))
  done

  if [[ "$idx" -eq 0 ]]; then
    echo "No valid segments passed." >&2
    exit 2
  fi

  stitched="$tmp_dir/stitched.mp4"
  ffmpeg -y -f concat -safe 0 -i "$concat_file" -c:v libx264 -c:a aac "$stitched"
  source_for_hls="$stitched"
else
  segment_args=()
  if [[ -n "$segment_from" ]]; then
    segment_args+=(-ss "$segment_from")
  fi
  if [[ -n "$segment_to" ]]; then
    segment_args+=(-to "$segment_to")
  fi

  if [[ "${#segment_args[@]}" -gt 0 ]]; then
    tmp_dir="$(mktemp -d)"
    trimmed="$tmp_dir/trimmed.mp4"
    ffmpeg -y "${segment_args[@]}" -i "$input" -c:v libx264 -c:a aac "$trimmed"
    source_for_hls="$trimmed"
  fi
fi

ffmpeg -y -i "$source_for_hls" -c:v libx264 -c:a aac -hls_time 6 -hls_playlist_type vod -hls_segment_filename "$segment_pattern" "$playlist"
