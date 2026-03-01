import { FormEvent, MouseEvent, PointerEvent, useRef, useState } from 'react';
import { useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import FormContainer from '@/Components/FormContainer';
import FormSection from '@/Components/FormSection';
import Input from '@/Components/Input';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';

interface MediaEditProps {
  media: Record<string, any>;
  isAttached: boolean;
}

type CropBox = { x: number; y: number; w: number; h: number };
type SubtitleTrack = { label: string; lang: string; format: string; src: string };
type VideoSegment = { from: number; to: number };
const SEGMENT_DECIMALS = 3;
const SEGMENT_MIN_GAP = 0.05;
const SEGMENT_EPSILON = 0.0005;

function roundSegmentValue(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(SEGMENT_DECIMALS));
}

function getMediaUrl(media: Record<string, any>): string | null {
  if (media?.id) {
    return route('media.file', [media.id]);
  }
  if (typeof media?.url === 'string' && media.url) return media.url;
  if (typeof media?.src === 'string' && media.src) return media.src;
  if (typeof media?.original_url === 'string' && media.original_url) return media.original_url;
  if (typeof media?.path === 'string' && media.path) return media.path;
  if (typeof media?.thumbnail === 'string' && media.thumbnail) return media.thumbnail;
  if (media?.storage === 'public' && typeof media?.filename === 'string' && media.filename) {
    const filename = media.filename.startsWith('/') ? media.filename : `/${media.filename}`;
    return `/storage${filename}`;
  }
  return null;
}

function withCacheBuster(url: string | null, token?: string | number | null): string | null {
  if (!url) return null;
  const suffix = token !== undefined && token !== null && token !== '' ? String(token) : null;
  if (!suffix) return url;
  return `${url}${url.includes('?') ? '&' : '?'}v=${encodeURIComponent(suffix)}`;
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function formatPercent(value: number): string {
  return clampPercent(Math.round(value * 10) / 10).toFixed(1);
}

const MIN_CROP_SIZE = 1;

function normalizeCrop(crop: CropBox): CropBox {
  let x = clampPercent(crop.x);
  let y = clampPercent(crop.y);
  let w = clampPercent(crop.w);
  let h = clampPercent(crop.h);

  if (w < MIN_CROP_SIZE) w = MIN_CROP_SIZE;
  if (h < MIN_CROP_SIZE) h = MIN_CROP_SIZE;
  if (x + w > 100) w = 100 - x;
  if (y + h > 100) h = 100 - y;

  return { x, y, w, h };
}

function toAbsoluteFocalFromCrop(focal: { x: number; y: number }, crop: CropBox): { x: number; y: number } {
  return {
    x: crop.x + (focal.x / 100) * crop.w,
    y: crop.y + (focal.y / 100) * crop.h,
  };
}

function toRelativeFocalInCrop(focal: { x: number; y: number }, crop: CropBox): { x: number; y: number } {
  const safeW = crop.w <= 0 ? 1 : crop.w;
  const safeH = crop.h <= 0 ? 1 : crop.h;
  return {
    x: clampPercent(((focal.x - crop.x) / safeW) * 100),
    y: clampPercent(((focal.y - crop.y) / safeH) * 100),
  };
}

function parseAspectRatio(value: string, imageRatio: number): number | null {
  if (!value || value === 'free') return null;
  if (value === 'original') return 1;
  const [w, h] = value.split(':').map((part) => Number(part));
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  const pixelRatio = w / h;
  // Convert pixel ratio to canvas-percent ratio.
  return pixelRatio / imageRatio;
}

function clampPointToCrop(point: { x: number; y: number }, crop: CropBox): { x: number; y: number } {
  return {
    x: clampPercent(Math.min(Math.max(point.x, crop.x), crop.x + crop.w)),
    y: clampPercent(Math.min(Math.max(point.y, crop.y), crop.y + crop.h)),
  };
}

function formatSeconds(value: number): string {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = safe - minutes * 60;
  return `${String(minutes).padStart(2, '0')}:${seconds.toFixed(1).padStart(4, '0')}`;
}

function parseSubtitlesJson(value: unknown): SubtitleTrack[] | null {
  if (!value || typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return null;
    return parsed
      .map((entry) => ({
        label: typeof entry?.label === 'string' ? entry.label : '',
        lang: typeof entry?.lang === 'string' ? entry.lang : '',
        format: typeof entry?.format === 'string' ? entry.format : 'webvtt',
        src: typeof entry?.src === 'string' ? entry.src : '',
      }))
      .filter((entry) => entry.src !== '');
  } catch (error) {
    return null;
  }
}

function normalizeVideoSegments(segments: VideoSegment[], duration?: number): VideoSegment[] {
  const max = Number.isFinite(duration) && duration && duration > 0 ? duration : null;
  const prepared = segments
    .map((segment) => {
      const from = roundSegmentValue(Math.max(0, Number(segment.from)));
      const rawTo = roundSegmentValue(Math.max(0, Number(segment.to)));
      const to = roundSegmentValue(max !== null ? Math.min(rawTo, max) : rawTo);
      return { from, to };
    })
    .filter((segment) => Number.isFinite(segment.from) && Number.isFinite(segment.to) && segment.to > segment.from)
    .sort((a, b) => a.from - b.from);

  const merged: VideoSegment[] = [];
  for (const segment of prepared) {
    const last = merged[merged.length - 1];
    if (!last) {
      merged.push(segment);
      continue;
    }
    // Merge only when segments truly overlap, not when they just touch at a cut boundary.
    if (segment.from < last.to - SEGMENT_EPSILON) {
      last.to = roundSegmentValue(Math.max(last.to, segment.to));
      continue;
    }
    merged.push(segment);
  }

  return merged;
}

function parseVideoSegmentsJson(value: unknown): VideoSegment[] | null {
  if (!value || typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return null;
    return normalizeVideoSegments(parsed.map((entry) => ({
      from: Number(entry?.from),
      to: Number(entry?.to),
    })));
  } catch (error) {
    return null;
  }
}

function VisualImageEditor({
  mediaUrl,
  data,
  setData,
}: {
  mediaUrl: string;
  data: Record<string, any>;
  setData: (key: string, value: any) => void;
}) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [dragMode, setDragMode] = useState<'left' | 'right' | 'top' | 'bottom' | 'move' | null>(null);
  const [imageRatio, setImageRatio] = useState<number>(16 / 9);
  const dragStartRef = useRef<{ point: { x: number; y: number }; crop: CropBox } | null>(null);
  const suppressNextClickRef = useRef(false);
  const dragMovedRef = useRef(false);

  const getCanvasPercent = (event: PointerEvent<HTMLElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = clampPercent(((event.clientX - rect.left) / rect.width) * 100);
    const y = clampPercent(((event.clientY - rect.top) / rect.height) * 100);
    return { x, y };
  };

  const focalX = toNumberOrNull(data.focal_x);
  const focalY = toNumberOrNull(data.focal_y);
  const cropX = toNumberOrNull(data.crop_x);
  const cropY = toNumberOrNull(data.crop_y);
  const cropW = toNumberOrNull(data.crop_w);
  const cropH = toNumberOrNull(data.crop_h);
  const aspect = typeof data.crop_aspect === 'string' && data.crop_aspect ? data.crop_aspect : 'free';
  const hasDefinedCrop = cropX !== null && cropY !== null && cropW !== null && cropH !== null;
  const crop = normalizeCrop(hasDefinedCrop ? { x: cropX, y: cropY, w: cropW, h: cropH } : { x: 0, y: 0, w: 100, h: 100 });

  const applyCrop = (next: CropBox) => {
    const normalized = normalizeCrop(next);
    setData('crop_x', formatPercent(normalized.x));
    setData('crop_y', formatPercent(normalized.y));
    setData('crop_w', formatPercent(normalized.w));
    setData('crop_h', formatPercent(normalized.h));

    if (focalX !== null && focalY !== null) {
      const clampedFocal = clampPointToCrop({ x: focalX, y: focalY }, normalized);
      setData('focal_x', formatPercent(clampedFocal.x));
      setData('focal_y', formatPercent(clampedFocal.y));
    }
  };

  const handleCanvasClick = (event: MouseEvent<HTMLDivElement>) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    if (dragMode) return;
    const point = getCanvasPercent(event as unknown as PointerEvent<HTMLElement>);
    if (!point) return;
    const clampedPoint = clampPointToCrop(point, crop);
    setData('focal_x', formatPercent(clampedPoint.x));
    setData('focal_y', formatPercent(clampedPoint.y));
  };

  const startHandleDrag = (event: PointerEvent<HTMLElement>, mode: 'left' | 'right' | 'top' | 'bottom' | 'move') => {
    if (event.button !== 0) return;
    event.stopPropagation();
    const point = getCanvasPercent(event);
    if (!point) return;
    dragStartRef.current = { point, crop };
    dragMovedRef.current = false;
    setDragMode(mode);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragMode || !dragStartRef.current) return;
    const point = getCanvasPercent(event);
    if (!point) return;
    const start = dragStartRef.current;
    const dx = point.x - start.point.x;
    const dy = point.y - start.point.y;
    if (Math.abs(dx) > 0.15 || Math.abs(dy) > 0.15) {
      dragMovedRef.current = true;
    }
    let next = { ...start.crop };
    const ratio = parseAspectRatio(aspect, imageRatio);

    if (dragMode === 'move') {
      next.x = Math.min(Math.max(start.crop.x + dx, 0), 100 - start.crop.w);
      next.y = Math.min(Math.max(start.crop.y + dy, 0), 100 - start.crop.h);
    } else if (dragMode === 'left') {
      const maxLeft = start.crop.x + start.crop.w - MIN_CROP_SIZE;
      const newLeft = Math.min(Math.max(start.crop.x + dx, 0), maxLeft);
      next.x = newLeft;
      next.w = start.crop.w - (newLeft - start.crop.x);
    } else if (dragMode === 'right') {
      const newRight = Math.min(Math.max(start.crop.x + start.crop.w + dx, start.crop.x + MIN_CROP_SIZE), 100);
      next.w = newRight - start.crop.x;
    } else if (dragMode === 'top') {
      const maxTop = start.crop.y + start.crop.h - MIN_CROP_SIZE;
      const newTop = Math.min(Math.max(start.crop.y + dy, 0), maxTop);
      next.y = newTop;
      next.h = start.crop.h - (newTop - start.crop.y);
    } else if (dragMode === 'bottom') {
      const newBottom = Math.min(Math.max(start.crop.y + start.crop.h + dy, start.crop.y + MIN_CROP_SIZE), 100);
      next.h = newBottom - start.crop.y;
    }

    if (ratio && dragMode !== 'move') {
      if (dragMode === 'left' || dragMode === 'right') {
        let h = next.w / ratio;
        h = Math.min(h, 100);
        let y = start.crop.y + start.crop.h / 2 - h / 2;
        y = Math.min(Math.max(y, 0), 100 - h);
        next.h = h;
        next.y = y;
      } else {
        let w = next.h * ratio;
        w = Math.min(w, 100);
        let x = start.crop.x + start.crop.w / 2 - w / 2;
        x = Math.min(Math.max(x, 0), 100 - w);
        next.w = w;
        next.x = x;
      }
    }

    applyCrop(next);
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (dragMode) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      suppressNextClickRef.current = dragMovedRef.current;
    }
    setDragMode(null);
    dragStartRef.current = null;
    dragMovedRef.current = false;
  };

  const handleAspectChange = (value: string) => {
    setData('crop_aspect', value);
    const ratio = parseAspectRatio(value, imageRatio);
    if (!ratio) return;

    const current = crop;
    const currentRatio = current.w / current.h;
    let next = { ...current };

    if (currentRatio > ratio) {
      const newW = current.h * ratio;
      next.x = current.x + (current.w - newW) / 2;
      next.w = newW;
    } else {
      const newH = current.w / ratio;
      next.y = current.y + (current.h - newH) / 2;
      next.h = newH;
    }

    applyCrop(next);
  };

  return (
    <div className="space-y-2">
      <div className="text-xs text-text-500 dark:text-gray-400">
        Klick setzt Focal Point. Crop per Handles links/rechts/oben/unten.
      </div>
      <div className="flex items-center gap-2 text-xs">
        <label htmlFor="crop-aspect" className="text-text-600 dark:text-gray-300">Aspect</label>
        <select
          id="crop-aspect"
          value={aspect}
          onChange={(event) => handleAspectChange(event.target.value)}
          className="rounded border border-secondary/30 bg-background px-2 py-1 text-sm dark:bg-gray-900"
        >
          <option value="free">Frei</option>
          <option value="original">Original</option>
          <option value="1:1">1:1</option>
          <option value="4:3">4:3</option>
          <option value="16:9">16:9</option>
          <option value="3:4">3:4</option>
          <option value="9:16">9:16</option>
        </select>
      </div>
      <div
        ref={canvasRef}
        className="relative w-full max-w-2xl overflow-hidden rounded border border-secondary/20 bg-background/40"
        style={{ aspectRatio: `${imageRatio}` }}
        onClick={handleCanvasClick}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <img
          src={mediaUrl}
          alt="Image editor"
          className="h-full w-full object-contain select-none pointer-events-none"
          onLoad={(event) => {
            const img = event.currentTarget;
            if (img.naturalWidth > 0 && img.naturalHeight > 0) {
              setImageRatio(img.naturalWidth / img.naturalHeight);
            }
          }}
          draggable={false}
        />

        <>
          <div className="pointer-events-none absolute left-0 top-0 bg-black/45" style={{ width: `${crop.x}%`, height: '100%' }} />
          <div className="pointer-events-none absolute top-0 bg-black/45" style={{ left: `${crop.x + crop.w}%`, right: 0, height: '100%' }} />
          <div className="pointer-events-none absolute bg-black/45" style={{ left: `${crop.x}%`, top: 0, width: `${crop.w}%`, height: `${crop.y}%` }} />
          <div className="pointer-events-none absolute bg-black/45" style={{ left: `${crop.x}%`, top: `${crop.y + crop.h}%`, width: `${crop.w}%`, bottom: 0 }} />

          <div
            className="absolute cursor-move border-2 border-primary bg-primary/10"
            style={{
              left: `${crop.x}%`,
              top: `${crop.y}%`,
              width: `${crop.w}%`,
              height: `${crop.h}%`,
            }}
            onPointerDown={(event) => startHandleDrag(event, 'move')}
          >
            <button
              type="button"
              className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-white bg-primary"
              onPointerDown={(event) => startHandleDrag(event, 'left')}
            />
            <button
              type="button"
              className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-white bg-primary"
              onPointerDown={(event) => startHandleDrag(event, 'right')}
            />
            <button
              type="button"
              className="absolute left-1/2 -top-2 h-4 w-4 -translate-x-1/2 rounded-full border border-white bg-primary"
              onPointerDown={(event) => startHandleDrag(event, 'top')}
            />
            <button
              type="button"
              className="absolute bottom-[-8px] left-1/2 h-4 w-4 -translate-x-1/2 rounded-full border border-white bg-primary"
              onPointerDown={(event) => startHandleDrag(event, 'bottom')}
            />
          </div>
        </>

        {focalX !== null && focalY !== null && (
          <div
            className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary shadow"
            style={{
              left: `${focalX}%`,
              top: `${focalY}%`,
            }}
          />
        )}
      </div>
    </div>
  );
}

function VisualVideoEditor({
  mediaUrl,
  data,
  setData,
  subtitles,
}: {
  mediaUrl: string;
  data: Record<string, any>;
  setData: (key: string, value: any) => void;
  subtitles: SubtitleTrack[];
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const seekingInternallyRef = useRef(false);
  const dragBoundaryRef = useRef<{ segmentIndex: number; edge: 'from' | 'to' } | null>(null);
  const [duration, setDuration] = useState(0);
  const [playhead, setPlayhead] = useState(0);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  const [previewSegmentsOnly, setPreviewSegmentsOnly] = useState(true);

  const parsedSegments = parseVideoSegmentsJson(data.video_segments_json) ?? [];
  const segments = normalizeVideoSegments(parsedSegments, duration);
  const currentSegment = segments[activeSegmentIndex] ?? null;

  const writeSegments = (nextSegments: VideoSegment[]) => {
    const normalized = normalizeVideoSegments(nextSegments, duration);
    setData('video_segments_json', JSON.stringify(normalized, null, 2));
    const nextIndex = Math.min(Math.max(activeSegmentIndex, 0), Math.max(0, normalized.length - 1));
    setActiveSegmentIndex(nextIndex);
  };

  const seekTo = (seconds: number) => {
    const next = Math.max(0, Math.min(seconds, duration > 0 ? duration : seconds));
    setPlayhead(next);
    if (videoRef.current) {
      seekingInternallyRef.current = true;
      videoRef.current.currentTime = next;
      window.setTimeout(() => {
        seekingInternallyRef.current = false;
      }, 0);
    }
  };

  const findSegmentIndexAt = (time: number): number => {
    return segments.findIndex((segment) => time >= segment.from - SEGMENT_EPSILON && time <= segment.to + SEGMENT_EPSILON);
  };

  const jumpToNearestSegmentFrom = (time: number): number | null => {
    const next = segments.find((segment) => segment.from >= time);
    if (next) return next.from;
    const prev = [...segments].reverse().find((segment) => segment.to <= time);
    if (prev) return prev.to;
    return null;
  };

  const enforceSegmentPreview = (time: number, keepPlaying: boolean) => {
    if (!previewSegmentsOnly || segments.length === 0 || !videoRef.current) return;
    const idx = findSegmentIndexAt(time);
    if (idx >= 0) {
      const current = segments[idx];
      if (time >= current.to - 0.03) {
        const next = segments[idx + 1];
        if (next) {
          seekTo(next.from);
          if (keepPlaying) {
            videoRef.current.play().catch(() => {});
          }
        } else {
          videoRef.current.pause();
          seekTo(current.to);
        }
      }
      return;
    }

    const target = jumpToNearestSegmentFrom(time);
    if (target === null) return;
    seekTo(target);
    if (keepPlaying) {
      videoRef.current.play().catch(() => {});
    }
  };

  const cutAtPlayhead = () => {
    const segmentIndex = findSegmentIndexAt(playhead);
    console.log('idx', segmentIndex);
    if (segmentIndex < 0) return;
    const segmentToSplit = segments[segmentIndex];
    console.log('split', segmentToSplit);
    if (!segmentToSplit) return;
    if (playhead <= segmentToSplit.from + SEGMENT_MIN_GAP || playhead >= segmentToSplit.to - SEGMENT_MIN_GAP) {
      console.log('zu knapp', playhead);
      return;
    }

    const splitAt = roundSegmentValue(playhead);
    const next = [
      ...segments.slice(0, segmentIndex),
      { from: roundSegmentValue(segmentToSplit.from), to: splitAt },
      { from: splitAt, to: roundSegmentValue(segmentToSplit.to) },
      ...segments.slice(segmentIndex + 1),
    ];
    console.log('next', next);
    writeSegments(next);
    setActiveSegmentIndex(segmentIndex + 1);
  };
  const segmentIndexAtPlayhead = findSegmentIndexAt(playhead);
  const canCutAtPlayhead = segmentIndexAtPlayhead >= 0
    && playhead > (segments[segmentIndexAtPlayhead]?.from ?? 0) + SEGMENT_MIN_GAP
    && playhead < (segments[segmentIndexAtPlayhead]?.to ?? 0) - SEGMENT_MIN_GAP;

  const timelineSeek = (clientX: number) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || duration <= 0) return;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    seekTo(ratio * duration);
  };

  const timelineSecondsFromClientX = (clientX: number): number | null => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || duration <= 0) return null;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return ratio * duration;
  };

  const updateSegmentBoundary = (segmentIndex: number, edge: 'from' | 'to', seconds: number) => {
    if (!Number.isFinite(seconds) || !segments[segmentIndex]) return;
    const minSize = SEGMENT_MIN_GAP;
    const next = [...segments];
    const current = { ...next[segmentIndex] };
    const prev = segmentIndex > 0 ? next[segmentIndex - 1] : null;
    const after = segmentIndex < next.length - 1 ? next[segmentIndex + 1] : null;

    if (edge === 'from') {
      const min = prev ? prev.to : 0;
      const max = current.to - minSize;
      current.from = roundSegmentValue(Math.min(Math.max(seconds, min), max));
    } else {
      const min = current.from + minSize;
      const max = after ? after.from : duration;
      current.to = roundSegmentValue(Math.min(Math.max(seconds, min), max));
    }

    next[segmentIndex] = current;
    writeSegments(next);
  };

  const updateSegmentField = (index: number, field: 'from' | 'to', value: number) => {
    const next = [...segments];
    next[index] = { ...next[index], [field]: roundSegmentValue(Number.isFinite(value) ? value : 0) };
    writeSegments(next);
  };

  const removeSegment = (index: number) => {
    const next = segments.filter((_, i) => i !== index);
    writeSegments(next);
  };

  return (
    <div className="space-y-3">
      <video
        ref={videoRef}
        src={mediaUrl}
        controls
        className="max-h-72 w-full rounded border border-secondary/20 bg-black"
        onLoadedMetadata={(event) => {
          const nextDuration = event.currentTarget.duration;
          if (Number.isFinite(nextDuration) && nextDuration > 0) {
            setDuration(nextDuration);
            if (segments.length === 0) {
              writeSegments([{ from: 0, to: nextDuration }]);
            }
          }
        }}
        onPlay={(event) => enforceSegmentPreview(event.currentTarget.currentTime, true)}
        onSeeking={(event) => {
          const nextTime = event.currentTarget.currentTime;
          setPlayhead(nextTime);
          if (seekingInternallyRef.current) return;
          enforceSegmentPreview(nextTime, !event.currentTarget.paused);
        }}
        onTimeUpdate={(event) => {
          const nextTime = event.currentTarget.currentTime;
          setPlayhead(nextTime);
          enforceSegmentPreview(nextTime, !event.currentTarget.paused);
        }}
      >
        {subtitles.map((track, index) => (
          <track
            key={`${track.src}-${index}`}
            kind="subtitles"
            srcLang={track.lang || undefined}
            label={track.label || track.lang || `Track ${index + 1}`}
            src={track.src}
          />
        ))}
      </video>

      {duration > 0 && (
        <div className="space-y-2 rounded border border-secondary/20 p-3">
          <div className="text-xs text-text-500 dark:text-gray-400">
            Cursor: {formatSeconds(playhead)} / {formatSeconds(duration)}
          </div>
          <div
            ref={timelineRef}
            role="slider"
            tabIndex={0}
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={playhead}
            className="relative h-8 cursor-pointer rounded border border-secondary/30 bg-secondary/10"
            onClick={(event) => {
              timelineSeek(event.clientX);
              const seconds = timelineSecondsFromClientX(event.clientX);
              if (seconds === null) return;
              const idx = findSegmentIndexAt(seconds);
              if (idx >= 0) setActiveSegmentIndex(idx);
            }}
            onPointerMove={(event) => {
              const drag = dragBoundaryRef.current;
              if (!drag) return;
              event.preventDefault();
              const seconds = timelineSecondsFromClientX(event.clientX);
              if (seconds === null) return;
              updateSegmentBoundary(drag.segmentIndex, drag.edge, seconds);
            }}
            onPointerUp={() => {
              dragBoundaryRef.current = null;
            }}
            onPointerLeave={() => {
              dragBoundaryRef.current = null;
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft') {
                event.preventDefault();
                seekTo(playhead - 0.5);
              } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                seekTo(playhead + 0.5);
              }
            }}
          >
            {segments.map((segment, index) => {
              const left = (segment.from / duration) * 100;
              const width = ((segment.to - segment.from) / duration) * 100;
              const active = index === activeSegmentIndex;
              return (
                <button
                  key={`timeline-segment-${segment.from}-${segment.to}-${index}`}
                  type="button"
                  title={`Segment ${index + 1}: ${formatSeconds(segment.from)} - ${formatSeconds(segment.to)}`}
                  className={`absolute bottom-0 top-0 rounded ${active ? 'bg-primary/70' : 'bg-primary/40'}`}
                  style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%` }}
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveSegmentIndex(index);
                  }}
                />
              );
            })}
            {currentSegment && (
              <>
                <button
                  type="button"
                  title="Segment-Start ziehen"
                  className="absolute top-0 h-8 w-2 -translate-x-1/2 cursor-ew-resize rounded bg-white/90 shadow"
                  style={{ left: `${(currentSegment.from / duration) * 100}%` }}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    dragBoundaryRef.current = { segmentIndex: activeSegmentIndex, edge: 'from' };
                    (event.currentTarget as HTMLButtonElement).setPointerCapture(event.pointerId);
                  }}
                />
                <button
                  type="button"
                  title="Segment-Ende ziehen"
                  className="absolute top-0 h-8 w-2 -translate-x-1/2 cursor-ew-resize rounded bg-white/90 shadow"
                  style={{ left: `${(currentSegment.to / duration) * 100}%` }}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    dragBoundaryRef.current = { segmentIndex: activeSegmentIndex, edge: 'to' };
                    (event.currentTarget as HTMLButtonElement).setPointerCapture(event.pointerId);
                  }}
                />
              </>
            )}
            <div
              className="pointer-events-none absolute bottom-0 top-0 w-[2px] bg-red-500"
              style={{ left: `${(playhead / duration) * 100}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <SecondaryButton type="button" onClick={cutAtPlayhead} disabled={!canCutAtPlayhead}>Schnittmarke setzen</SecondaryButton>
            <label className="ml-2 inline-flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={previewSegmentsOnly}
                onChange={(event) => setPreviewSegmentsOnly(event.target.checked)}
              />
              Vorschau nur Segmente
            </label>
          </div>
          <div className="space-y-2">
            {segments.map((segment, index) => (
              <div key={`segment-row-${index}`} className={`grid grid-cols-1 gap-2 rounded border p-2 md:grid-cols-6 ${index === activeSegmentIndex ? 'border-primary/60' : 'border-secondary/20'}`}>
                <button type="button" className="text-left text-xs font-semibold" onClick={() => setActiveSegmentIndex(index)}>
                  Segment {index + 1}
                </button>
                <label className="text-xs md:col-span-2">
                  Von
                  <input
                    type="number"
                    min={0}
                    max={duration}
                    step={0.001}
                    value={segment.from.toFixed(SEGMENT_DECIMALS)}
                    onChange={(event) => updateSegmentField(index, 'from', Number(event.target.value))}
                    className="mt-1 w-full rounded border border-secondary/30 bg-background px-2 py-1 text-sm"
                  />
                </label>
                <label className="text-xs md:col-span-2">
                  Bis
                  <input
                    type="number"
                    min={0}
                    max={duration}
                    step={0.001}
                    value={segment.to.toFixed(SEGMENT_DECIMALS)}
                    onChange={(event) => updateSegmentField(index, 'to', Number(event.target.value))}
                    className="mt-1 w-full rounded border border-secondary/30 bg-background px-2 py-1 text-sm"
                  />
                </label>
                <div className="flex items-end">
                  <SecondaryButton type="button" onClick={() => removeSegment(index)}>
                    Segment löschen
                  </SecondaryButton>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden">
            <input
              type="text"
              value={String(data.video_segments_json ?? '[]')}
              readOnly
              className="w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function MediaEdit({ media, isAttached }: MediaEditProps) {
  const initialCropX = media?.meta?.image?.crop?.x ?? 0;
  const initialCropY = media?.meta?.image?.crop?.y ?? 0;
  const initialCropW = media?.meta?.image?.crop?.w ?? 100;
  const initialCropH = media?.meta?.image?.crop?.h ?? 100;
  const initialCropAspect = media?.meta?.image?.crop?.aspect ?? 'free';
  const initialCrop = normalizeCrop({
    x: Number(initialCropX),
    y: Number(initialCropY),
    w: Number(initialCropW),
    h: Number(initialCropH),
  });
  const initialFocalMode = media?.meta?.image?.focal_point_mode ?? 'crop';
  const initialAbsoluteFocal = (() => {
    const focal = media?.meta?.image?.focal_point;
    if (!focal || focal.x === undefined || focal.y === undefined) {
      return null;
    }
    if (initialFocalMode === 'absolute') {
      return { x: Number(focal.x), y: Number(focal.y) };
    }
    return toAbsoluteFocalFromCrop({ x: Number(focal.x), y: Number(focal.y) }, initialCrop);
  })();
  const initialFocalX = initialAbsoluteFocal ? formatPercent(initialAbsoluteFocal.x) : '';
  const initialFocalY = initialAbsoluteFocal ? formatPercent(initialAbsoluteFocal.y) : '';
  const mimeType = typeof media?.mimetype === 'string' ? media.mimetype : '';
  const isImage = mimeType.startsWith('image/');
  const isVideo = mimeType.startsWith('video/');
  const initialSegmentFrom = media?.meta?.video?.segment?.from ?? '';
  const initialSegmentTo = media?.meta?.video?.segment?.to ?? '';
  const initialSegments = Array.isArray(media?.meta?.video?.segments)
    ? media.meta.video.segments
    : ((initialSegmentFrom !== '' || initialSegmentTo !== '') ? [{ from: Number(initialSegmentFrom || 0), to: Number(initialSegmentTo || 0) }] : []);
  const initialSegmentsJson = JSON.stringify(normalizeVideoSegments(initialSegments), null, 2);
  const initialSubtitles = Array.isArray(media?.meta?.video?.subtitles) ? media.meta.video.subtitles : [];
  const initialSubtitlesJson = JSON.stringify(initialSubtitles, null, 2);

  const { data, setData, put, transform, processing, errors } = useForm({
    name: media?.name ?? '',
    description: media?.description ?? '',
    tags: Array.isArray(media?.tags) ? media.tags.join(', ') : media?.tags ?? '',
    focal_x: initialFocalX,
    focal_y: initialFocalY,
    crop_x: initialCropX,
    crop_y: initialCropY,
    crop_w: initialCropW,
    crop_h: initialCropH,
    crop_aspect: initialCropAspect,
    video_segment_from: initialSegmentFrom,
    video_segment_to: initialSegmentTo,
    video_segments_json: initialSegmentsJson,
    video_subtitles_json: initialSubtitlesJson,
  });
  const { post: postHls, processing: processingHls } = useForm({});

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsedSubtitles = parseSubtitlesJson(data.video_subtitles_json);
    const parsedSegments = parseVideoSegmentsJson(data.video_segments_json);
    if (parsedSubtitles === null) {
      window.alert('Untertitel JSON ist ungültig. Erwartet wird ein Array mit { label, lang, format, src }.');
      return;
    }
    if (parsedSegments === null) {
      window.alert('Segmente JSON ist ungültig. Erwartet wird ein Array mit { from, to }.');
      return;
    }

    transform((formData) => {
      const currentMeta = media?.meta && typeof media.meta === 'object' ? media.meta : {};
      const nextMeta: Record<string, any> = { ...currentMeta };

      if (isImage) {
        const currentImageMeta = currentMeta?.image && typeof currentMeta.image === 'object' ? currentMeta.image : {};
        const focalX = toNumberOrNull(formData.focal_x);
        const focalY = toNumberOrNull(formData.focal_y);
        const cropX = toNumberOrNull(formData.crop_x);
        const cropY = toNumberOrNull(formData.crop_y);
        const cropW = toNumberOrNull(formData.crop_w);
        const cropH = toNumberOrNull(formData.crop_h);
        const cropAspect = typeof formData.crop_aspect === 'string' ? formData.crop_aspect : 'free';
        const crop = normalizeCrop({
          x: cropX ?? 0,
          y: cropY ?? 0,
          w: cropW ?? 100,
          h: cropH ?? 100,
        });
        const focalAbs = focalX !== null && focalY !== null ? clampPointToCrop({ x: focalX, y: focalY }, crop) : null;
        const focalInCrop = focalAbs ? toRelativeFocalInCrop(focalAbs, crop) : null;

        const nextImageMeta: Record<string, any> = { ...currentImageMeta };
        nextImageMeta.focal_point = {
          x: focalInCrop?.x ?? null,
          y: focalInCrop?.y ?? null,
        };
        nextImageMeta.crop = {
          x: crop.x,
          y: crop.y,
          w: crop.w,
          h: crop.h,
          unit: 'percent',
          aspect: cropAspect,
        };
        nextMeta.image = nextImageMeta;
      }

      if (isVideo) {
        const currentVideoMeta = currentMeta?.video && typeof currentMeta.video === 'object' ? currentMeta.video : {};
        const segmentFrom = toNumberOrNull(formData.video_segment_from);
        const segmentTo = toNumberOrNull(formData.video_segment_to);
        const segments = normalizeVideoSegments(parsedSegments);
        const legacyFrom = segments[0]?.from ?? segmentFrom;
        const legacyTo = segments[segments.length - 1]?.to ?? segmentTo;
        nextMeta.video = {
          ...currentVideoMeta,
          segment: {
            from: legacyFrom,
            to: legacyTo !== null && legacyFrom !== null && legacyTo < legacyFrom ? legacyFrom : legacyTo,
          },
          segments,
          subtitles: parsedSubtitles,
        };
      }

      return {
        ...formData,
        meta: nextMeta,
      };
    });

    put(route('media.update', [media.id]));
  };

  const mediaUrl = getMediaUrl(media);
  const mediaUrlWithCache = withCacheBuster(mediaUrl, media?.updated_at ?? media?.id);
  const variants = media?.meta?.image?.variants && typeof media.meta.image.variants === 'object'
    ? (media.meta.image.variants as Record<string, { path?: string; width?: number; height?: number; max?: number }>)
    : {};
  const subtitlesForPreview = parseSubtitlesJson(data.video_subtitles_json) ?? [];
  const hlsPlaylistPath = typeof media?.meta?.video?.hls?.playlist === 'string' ? media.meta.video.hls.playlist : '';
  const hlsGeneratedAt = typeof media?.meta?.video?.hls?.generated_at === 'string' ? media.meta.video.hls.generated_at : '';

  return (
    <AuthenticatedLayout
      title="Media Edit"
      breadcrumbs={[
        { label: 'Dashboard', url: route('dashboard') },
        { label: `Media #${media?.id ?? ''}` },
      ]}
    >
      <form onSubmit={submit} className="space-y-4">
        <FormContainer className="max-w-4xl">
          <FormSection title="Datei" subtitle="Basisinformationen">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input inputName="name" useForm={{ data, setData, errors }} />
              <Input inputName="tags" useForm={{ data, setData, errors }} />
            </div>
            <Input inputName="description" type="textarea" useForm={{ data, setData, errors }} />
          </FormSection>

          <FormSection title="Status" subtitle="Zuordnung">
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-text-500 dark:text-gray-400">Preview</div>
              {mediaUrlWithCache && mimeType.startsWith('image/') && (
                <VisualImageEditor mediaUrl={mediaUrlWithCache} data={data} setData={setData as any} />
              )}
              {mediaUrlWithCache && isVideo && (
                <VisualVideoEditor mediaUrl={mediaUrlWithCache} data={data} setData={setData as any} subtitles={subtitlesForPreview} />
              )}
              {mediaUrlWithCache && !mimeType.startsWith('image/') && !mimeType.startsWith('video/') && (
                <a
                  href={mediaUrlWithCache}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded border border-secondary/30 px-3 py-2 text-sm text-secondary hover:bg-secondary/10"
                >
                  Datei öffnen
                </a>
              )}
              {!mediaUrlWithCache && <div className="text-xs text-text-500 dark:text-gray-400">Keine Preview verfügbar.</div>}
            </div>

            <div className="text-sm text-text-700 dark:text-gray-300">
              {isAttached ? 'Dieses Medium ist bereits zugeordnet.' : 'Dieses Medium ist noch nicht zugeordnet.'}
            </div>
            <div className="text-xs text-text-500 dark:text-gray-400">
              Datei: {media?.filename || '-'} ({media?.mimetype || 'unbekannt'})
            </div>
            <div className="text-xs text-text-500 dark:text-gray-400">
              Kategorie: {media?.category || '-'}
            </div>
          </FormSection>

          {isImage && (
            <FormSection title="Bild-Meta" subtitle="Focal Point und Crop in Prozent">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Input inputName="focal_x" label="Focal X (%)" type="number" min={0} max={100} step={0.1} useForm={{ data, setData, errors }} />
                <Input inputName="focal_y" label="Focal Y (%)" type="number" min={0} max={100} step={0.1} useForm={{ data, setData, errors }} />
                <Input inputName="crop_x" label="Crop X (%)" type="number" min={0} max={100} step={0.1} useForm={{ data, setData, errors }} />
                <Input inputName="crop_y" label="Crop Y (%)" type="number" min={0} max={100} step={0.1} useForm={{ data, setData, errors }} />
                <Input inputName="crop_w" label="Crop W (%)" type="number" min={0} max={100} step={0.1} useForm={{ data, setData, errors }} />
                <Input inputName="crop_h" label="Crop H (%)" type="number" min={0} max={100} step={0.1} useForm={{ data, setData, errors }} />
              </div>
            </FormSection>
          )}

          {isImage && Object.keys(variants).length > 0 && (
            <FormSection title="Varianten" subtitle="Generierte Bildgrößen">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {Object.entries(variants).map(([key, variant]) => {
                  const path = typeof variant?.path === 'string' ? variant.path : '';
                  const previewUrlRaw = media?.id ? route('media.variant', [media.id, key]) : (path && media?.storage === 'public' ? `/storage${path.startsWith('/') ? path : `/${path}`}` : null);
                  const previewUrl = withCacheBuster(previewUrlRaw, media?.updated_at ?? media?.id);
                  return (
                    <div key={key} className="space-y-2 rounded border border-secondary/20 p-2">
                      <div className="text-xs font-semibold uppercase text-text-600 dark:text-gray-300">{key}</div>
                      {previewUrl ? (
                        <img src={previewUrl} alt={`variant-${key}`} className="h-28 w-full rounded bg-secondary/10 object-contain" />
                      ) : (
                        <div className="flex h-28 items-center justify-center rounded bg-secondary/10 text-xs text-text-500">
                          Keine direkte Preview
                        </div>
                      )}
                      <div className="text-[11px] text-text-500 break-all">{path || '-'}</div>
                      <div className="text-[11px] text-text-500">
                        {variant?.width ?? '-'}x{variant?.height ?? '-'} (max {variant?.max ?? '-'})
                      </div>
                    </div>
                  );
                })}
              </div>
            </FormSection>
          )}

          {isVideo && (
            <FormSection title="Video-Meta" subtitle="Segmente, Untertitel und HLS">
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-text-500 dark:text-gray-400">Untertitel (JSON Array)</label>
                  <textarea
                    rows={8}
                    value={String(data.video_subtitles_json ?? '')}
                    onChange={(event) => setData('video_subtitles_json', event.target.value)}
                    className="mt-1 w-full rounded border border-secondary/30 bg-background px-3 py-2 font-mono text-xs"
                    placeholder='[{"label":"Deutsch","lang":"de","format":"webvtt","src":"https://example.com/sub.vtt"}]'
                  />
                </div>

                <div className="rounded border border-secondary/20 p-3 text-xs text-text-500 dark:text-gray-400">
                  <div>HLS Playlist: {hlsPlaylistPath || 'noch nicht generiert'}</div>
                  <div>Letzte Generierung: {hlsGeneratedAt || '-'}</div>
                </div>

                <div>
                  <SecondaryButton
                    type="button"
                    disabled={processingHls}
                    onClick={() => postHls(route('media.generate-hls', [media.id]))}
                  >
                    M3U8 neu generieren
                  </SecondaryButton>
                </div>
              </div>
            </FormSection>
          )}
        </FormContainer>

        <FormSection boxed={true}>
          <div className="flex items-center gap-3">
            <PrimaryButton type="submit" disabled={processing}>
              Speichern
            </PrimaryButton>
            <SecondaryButton type="button" onClick={() => window.history.back()}>
              Zurück
            </SecondaryButton>
          </div>
        </FormSection>
      </form>
    </AuthenticatedLayout>
  );
}
