import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import ColorInput from "./ColorInput";
import InputLabel from "./InputLabel";
import InputSelect from "./InputSelect";
import InputText from "./InputText";
import SecondaryButton from "./SecondaryButton";

type Mode = "screen_cam_mic" | "screen_mic" | "cam_mic" | "mic_only";
type Quality = "standard" | "high" | "max";
type CamLayout =
  | "split_panel"
  | "overlay_top_center_circle"
  | "overlay_bottom_right_circle"
  | "overlay_bottom_left_circle";

type ClickPulse = {
  xNorm: number;
  yNorm: number;
  startedAt: number;
};

type TranscriptLine = {
  seconds: number;
  text: string;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type InitResponse = {
  uuid: string;
  upload_token: string;
  chunk_size_ms?: number;
};

type StatusResponse = {
  status: "finished" | "processing" | "done" | "error";
  mp4_url?: string;
};

const MODES: { id: Mode; label: string }[] = [
  { id: "screen_cam_mic", label: "Screen + Cam + Mic (Split)" },
  { id: "screen_mic", label: "Screen + Mic" },
  { id: "cam_mic", label: "Cam + Mic" },
  { id: "mic_only", label: "Nur Mic" },
];

const CAM_LAYOUTS: { id: CamLayout; label: string }[] = [
  { id: "split_panel", label: "Geteilt" },
  { id: "overlay_top_center_circle", label: "Kreis oben mitte" },
  { id: "overlay_bottom_right_circle", label: "Kreis unten rechts" },
  { id: "overlay_bottom_left_circle", label: "Kreis unten links" },
];

const QUALITY_PRESETS: Record<
  Quality,
  { label: string; fps: number; videoBps: number; audioBps: number }
> = {
  standard: { label: "Standard", fps: 30, videoBps: 4_000_000, audioBps: 128_000 },
  high: { label: "High", fps: 30, videoBps: 8_000_000, audioBps: 192_000 },
  max: { label: "Max", fps: 60, videoBps: 12_000_000, audioBps: 256_000 },
};

const MAX_UPLOAD_PART_BYTES = 512 * 1024;
const CLICK_PULSE_DURATION_MS = 650;
const STOP_DELAY_MS = 1000;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function pickMimeType(): string {
  const types = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

function formatTimestamp(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function normalizeWs(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function normalizeTranscriptCompare(text: string): string {
  return normalizeWs(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "");
}

async function waitForVideoReady(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= 1 && video.videoWidth > 0 && video.videoHeight > 0) return;

  await new Promise<void>((resolve, reject) => {
    const onLoaded = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("video metadata not available"));
    };
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("error", onError);
    };

    video.addEventListener("loadedmetadata", onLoaded, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}

export default function ScreenCamRecorder(): JSX.Element {
  const START_CANCELLED_ERROR = "__start_cancelled__";
  const [mode, setMode] = useState<Mode>("screen_cam_mic");
  const [quality, setQuality] = useState<Quality>("high");
  const [camLayout, setCamLayout] = useState<CamLayout>("overlay_top_center_circle");
  const [canvasBgColor, setCanvasBgColor] = useState<string>("#ffffff");
  const [micGainLevel, setMicGainLevel] = useState<number>(1.0);
  const [systemGainLevel, setSystemGainLevel] = useState<number>(0.5);
  const [preRollSeconds, setPreRollSeconds] = useState<number>(3);
  const [transcriptLang, setTranscriptLang] = useState<string>("de-DE");
  const [transcriptLines, setTranscriptLines] = useState<TranscriptLine[]>([]);
  const [liveFragment, setLiveFragment] = useState<string>("");
  const [status, setStatus] = useState<string>("idle");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isStopping, setIsStopping] = useState<boolean>(false);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [runtimeSeconds, setRuntimeSeconds] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [viewStep, setViewStep] = useState<"new" | "preview">("new");
  const [isPreparingPreview, setIsPreparingPreview] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [screenPermissionDenied, setScreenPermissionDenied] = useState<boolean>(false);

  const recordingRef = useRef<{ uuid: string | null; token: string | null; chunkSizeMs: number }>({
    uuid: null,
    token: null,
    chunkSizeMs: 1000,
  });

  const chunkIndexRef = useRef<number>(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingUploadsRef = useRef<Set<Promise<void>>>(new Set());

  const screenStreamRef = useRef<MediaStream | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const composedStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const camVideoRef = useRef<HTMLVideoElement | null>(null);
  const previewRef = useRef<HTMLVideoElement | null>(null);

  const isRecordingRef = useRef<boolean>(false);
  const clickPulsesRef = useRef<ClickPulse[]>([]);
  const clickHandlerRef = useRef<((event: PointerEvent) => void) | null>(null);
  const clickTargetRef = useRef<HTMLElement | null>(null);

  const recordingStartedAtRef = useRef<number>(0);
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalSegmentStartRef = useRef<number>(0);
  const interimTranscriptRef = useRef<string>("");
  const lastCommittedFinalTextRef = useRef<string>("");
  const transcriptLinesRef = useRef<TranscriptLine[]>([]);
  const runtimeTickRef = useRef<number | null>(null);
  const startCancelRequestedRef = useRef<boolean>(false);
  const stopDelayTimerRef = useRef<number | null>(null);
  const lastPreparedPreviewConfigRef = useRef<string>("");
  const statusPollIntervalRef = useRef<number | null>(null);

  const mimeType = pickMimeType();
  const previewConfigKey = [
    mode,
    quality,
    camLayout,
    canvasBgColor,
    micGainLevel.toFixed(2),
    systemGainLevel.toFixed(2),
  ].join("|");

  async function apiInit(): Promise<InitResponse> {
    const res = await axios.post<InitResponse>("/media/recording/init");
    return res.data;
  }

  async function apiUploadChunk(index: number, blob: Blob): Promise<void> {
    const { uuid, token } = recordingRef.current;
    if (!uuid || !token) throw new Error("missing uuid/token");

    const fd = new FormData();
    fd.append("index", String(index));
    fd.append("chunk", blob);

    try {
      await axios.post(`/media/recording/${uuid}/chunk`, fd, {
        headers: { "X-Upload-Token": token },
      });
    } catch (e: any) {
      const statusCode = e?.response?.status;
      if (statusCode === 413) {
        throw new Error(`Upload 413 at chunk ${index} (${Math.round(blob.size / 1024)} KB)`);
      }
      throw e;
    }
  }

  async function uploadBlobInParts(blob: Blob): Promise<void> {
    let offset = 0;
    while (offset < blob.size) {
      const part = blob.slice(offset, offset + MAX_UPLOAD_PART_BYTES);
      const index = chunkIndexRef.current++;
      await apiUploadChunk(index, part);
      offset += MAX_UPLOAD_PART_BYTES;
    }
  }

  async function waitForPendingUploads(): Promise<void> {
    const pending = Array.from(pendingUploadsRef.current);
    if (!pending.length) return;
    await Promise.all(pending);
  }

  async function runStartCountdown(seconds: number): Promise<void> {
    const total = clamp(Math.floor(seconds || 0), 0, 10);
    for (let value = total; value >= 1; value--) {
      if (startCancelRequestedRef.current) {
        throw new Error(START_CANCELLED_ERROR);
      }
      setCountdown(value);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (startCancelRequestedRef.current) {
        throw new Error(START_CANCELLED_ERROR);
      }
    }
    setCountdown(null);
  }

  function assertStartNotCancelled(): void {
    if (startCancelRequestedRef.current) {
      throw new Error(START_CANCELLED_ERROR);
    }
  }

  async function apiFinish(lastIndex: number): Promise<void> {
    const { uuid, token } = recordingRef.current;
    if (!uuid || !token) throw new Error("missing uuid/token");

    await axios.post(
      `/media/recording/${uuid}/finish`,
      {
        last_index: lastIndex,
        transcript_lang: transcriptLang,
        transcript_entries: transcriptLinesRef.current,
      },
      { headers: { "X-Upload-Token": token } }
    );
  }

  async function apiStatus(): Promise<StatusResponse | null> {
    const { uuid } = recordingRef.current;
    if (!uuid) return null;

    try {
      const res = await axios.get<StatusResponse>(`/media/recording/${uuid}/status`);
      return res.data;
    } catch {
      return null;
    }
  }

  async function apiStatusByUuid(uuid: string): Promise<StatusResponse | null> {
    try {
      const res = await axios.get<StatusResponse>(`/media/recording/${uuid}/status`);
      return res.data;
    } catch {
      return null;
    }
  }

  function stopStatusPolling(): void {
    if (statusPollIntervalRef.current) {
      window.clearInterval(statusPollIntervalRef.current);
      statusPollIntervalRef.current = null;
    }
  }

  function stopStream(stream: MediaStream | null): void {
    stream?.getTracks().forEach((t) => t.stop());
  }

  function appendTranscriptLine(seconds: number, text: string): void {
    const cleanText = normalizeWs(text);
    if (!cleanText) return;

    const last = transcriptLinesRef.current[transcriptLinesRef.current.length - 1];
    if (last && normalizeWs(last.text).toLowerCase() === cleanText.toLowerCase()) {
      return;
    }

    const next = [
      ...transcriptLinesRef.current,
      { seconds: Math.max(0, Math.floor(seconds)), text: cleanText },
    ];
    transcriptLinesRef.current = next;
    setTranscriptLines(next);
  }

  function flushPendingInterimTranscript(): void {
    const pendingInterim = normalizeWs(interimTranscriptRef.current || liveFragment);
    if (!pendingInterim && transcriptLinesRef.current.length > 0) return;
    if (!pendingInterim) return;

    const pendingCmp = normalizeTranscriptCompare(pendingInterim);
    const lastLine = transcriptLinesRef.current[transcriptLinesRef.current.length - 1];
    const lastLineCmp = normalizeTranscriptCompare(lastLine?.text ?? "");
    const lastFinalCmp = normalizeTranscriptCompare(lastCommittedFinalTextRef.current);
    if (
      pendingCmp &&
      (pendingCmp === lastLineCmp || pendingCmp === lastFinalCmp)
    ) {
      interimTranscriptRef.current = "";
      setLiveFragment("");
      return;
    }

    appendTranscriptLine(finalSegmentStartRef.current, pendingInterim);
    interimTranscriptRef.current = "";
    setLiveFragment("");
  }

  function startRuntimeTicker(): void {
    if (runtimeTickRef.current) window.clearInterval(runtimeTickRef.current);
    runtimeTickRef.current = window.setInterval(() => {
      const elapsedSeconds = Math.max(0, (performance.now() - recordingStartedAtRef.current) / 1000);
      setRuntimeSeconds(elapsedSeconds);
    }, 250);
  }

  function stopRuntimeTicker(freeze = false): void {
    if (runtimeTickRef.current) {
      window.clearInterval(runtimeTickRef.current);
      runtimeTickRef.current = null;
    }
    if (freeze) {
      const elapsedSeconds = Math.max(0, (performance.now() - recordingStartedAtRef.current) / 1000);
      setRuntimeSeconds(elapsedSeconds);
    }
  }

  function startClickTracking(): void {
    if (clickHandlerRef.current) return;
    const target = previewRef.current;
    if (!target) return;

    const handler = (event: PointerEvent) => {
      if (!isRecordingRef.current) return;
      if (typeof event.button === "number" && event.button !== 0) return;

      const rect = target.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const xNorm = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      const yNorm = clamp((event.clientY - rect.top) / rect.height, 0, 1);
      clickPulsesRef.current.push({ xNorm, yNorm, startedAt: performance.now() });
    };

    clickHandlerRef.current = handler;
    clickTargetRef.current = target;
    target.addEventListener("pointerdown", handler, true);
  }

  function stopClickTracking(): void {
    const handler = clickHandlerRef.current;
    const target = clickTargetRef.current;
    if (handler && target) {
      target.removeEventListener("pointerdown", handler, true);
      clickHandlerRef.current = null;
    }
    clickTargetRef.current = null;
    clickPulsesRef.current = [];
  }

  function stopSpeechRecognition(flushPendingInterim = false): void {
    if (flushPendingInterim) {
      flushPendingInterimTranscript();
    }
    try {
      speechRecognitionRef.current?.stop();
    } catch {
      // no-op
    }
    speechRecognitionRef.current = null;
  }

  function startSpeechRecognition(): void {
    const ctor = ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) as
      | (new () => SpeechRecognitionLike)
      | undefined;

    if (!ctor) {
      setError((prev) => prev ?? "Web Speech API nicht verfuegbar (kein Transcript).");
      return;
    }

    finalSegmentStartRef.current = 0;
    interimTranscriptRef.current = "";
    lastCommittedFinalTextRef.current = "";
    transcriptLinesRef.current = [];
    setTranscriptLines([]);
    setLiveFragment("");

    const recognition = new ctor();
    recognition.lang = transcriptLang || "de-DE";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let committedFinal = false;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = normalizeWs(result?.[0]?.transcript ?? "");
        if (!text) continue;

        if (result?.isFinal) {
          if (text.toLowerCase() !== lastCommittedFinalTextRef.current.toLowerCase()) {
            appendTranscriptLine(finalSegmentStartRef.current, text);
            lastCommittedFinalTextRef.current = text;
            const elapsedSeconds = Math.max(0, (performance.now() - recordingStartedAtRef.current) / 1000);
            finalSegmentStartRef.current = elapsedSeconds;
            committedFinal = true;
          }
        }
      }

      const interimParts: string[] = [];
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result?.isFinal) continue;
        const text = normalizeWs(result?.[0]?.transcript ?? "");
        if (text) interimParts.push(text);
      }

      const interimLive = normalizeWs(interimParts.join(" "));
      if (committedFinal && !interimLive) {
        interimTranscriptRef.current = "";
        setLiveFragment("");
      } else if (interimLive) {
        interimTranscriptRef.current = interimLive;
        setLiveFragment(interimLive);
      }
    };

    const tryRestart = () => {
      if (!isRecordingRef.current) return;
      window.setTimeout(() => {
        if (!isRecordingRef.current) return;
        try {
          recognition.start();
        } catch {
          // no-op
        }
      }, 250);
    };

    recognition.onerror = () => {
      tryRestart();
    };

    recognition.onend = () => {
      tryRestart();
    };

    speechRecognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      // no-op
    }
  }

  async function getScreenStream(): Promise<MediaStream> {
    return navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 30 },
      audio: true,
    });
  }

  async function getCamStream(): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720 },
      audio: false,
    });
  }

  async function getMicStream(): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia({
      video: false,
      audio: true,
    });
  }

  async function mixAudio(
    micStream: MediaStream | null,
    screenStream: MediaStream | null
  ): Promise<MediaStreamTrack | null> {
    const ctx = new AudioContext();
    audioContextRef.current = ctx;
    const dest = ctx.createMediaStreamDestination();

    const micTrack = micStream?.getAudioTracks()[0];
    if (micTrack) {
      const micSource = ctx.createMediaStreamSource(new MediaStream([micTrack]));
      const micGainNode = ctx.createGain();
      micGainNode.gain.value = micGainLevel;
      micSource.connect(micGainNode).connect(dest);
    }

    const sysTrack = screenStream?.getAudioTracks()[0];
    if (sysTrack) {
      const sysSource = ctx.createMediaStreamSource(new MediaStream([sysTrack]));
      const sysGainNode = ctx.createGain();
      sysGainNode.gain.value = systemGainLevel;
      sysSource.connect(sysGainNode).connect(dest);
    }

    return dest.stream.getAudioTracks()[0] ?? null;
  }

  async function buildComposedStream(
    screenStream: MediaStream | null,
    camStream: MediaStream | null,
    audioTrack: MediaStreamTrack | null,
    fps: number,
    renderMode: Mode
  ): Promise<MediaStream> {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const screenVideo = screenVideoRef.current!;
    const camVideo = camVideoRef.current!;

    if (screenStream) {
      screenVideo.srcObject = screenStream;
      screenVideo.muted = true;
      screenVideo.volume = 0;
      await screenVideo.play();
      await waitForVideoReady(screenVideo);
    }

    if (camStream) {
      camVideo.srcObject = camStream;
      camVideo.muted = true;
      camVideo.volume = 0;
      await camVideo.play();
      await waitForVideoReady(camVideo);
    }

    const targetW = 1920;
    const targetH = 1080;

    canvas.width = targetW;
    canvas.height = targetH;

    const W = canvas.width;
    const H = canvas.height;

    const drawContain = (
      video: HTMLVideoElement,
      dx: number,
      dy: number,
      dw: number,
      dh: number
    ): { x: number; y: number; w: number; h: number } => {
      const vw = video.videoWidth || 1;
      const vh = video.videoHeight || 1;
      const scale = Math.min(dw / vw, dh / vh);
      const rw = vw * scale;
      const rh = vh * scale;
      const x = dx + (dw - rw) / 2;
      const y = dy + (dh - rh) / 2;
      ctx.drawImage(video, x, y, rw, rh);
      return { x, y, w: rw, h: rh };
    };

    const drawCover = (
      video: HTMLVideoElement,
      dx: number,
      dy: number,
      dw: number,
      dh: number
    ) => {
      const vw = video.videoWidth || 1;
      const vh = video.videoHeight || 1;
      const scale = Math.max(dw / vw, dh / vh);
      const rw = vw * scale;
      const rh = vh * scale;
      const x = dx + (dw - rw) / 2;
      const y = dy + (dh - rh) / 2;
      ctx.drawImage(video, x, y, rw, rh);
    };

    const drawCircleCover = (video: HTMLVideoElement, cx: number, cy: number, diameter: number) => {
      const r = diameter / 2;

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      drawCover(video, cx - r, cy - r, diameter, diameter);
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = Math.max(2, diameter * 0.02);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };

    const drawClickPulses = () => {
      if (renderMode === "mic_only") return;

      const now = performance.now();
      clickPulsesRef.current = clickPulsesRef.current.filter(
        (pulse) => now - pulse.startedAt <= CLICK_PULSE_DURATION_MS
      );

      for (const pulse of clickPulsesRef.current) {
        const t = clamp((now - pulse.startedAt) / CLICK_PULSE_DURATION_MS, 0, 1);
        const x = pulse.xNorm * W;
        const y = pulse.yNorm * H;

        const radius = 10 + 34 * t;
        const alpha = 0.85 * (1 - t);

        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(250, 204, 21, ${alpha})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(250, 204, 21, ${Math.max(0.2, alpha)})`;
        ctx.fill();
        ctx.restore();
      }
    };

    function render() {
      ctx.fillStyle = canvasBgColor;
      ctx.fillRect(0, 0, W, H);

      if (renderMode === "screen_cam_mic") {
        if (camLayout === "split_panel") {
          const gap = Math.max(10, Math.round(W * 0.01));
          const leftW = Math.round((W - gap) * 0.72);
          const rightW = W - gap - leftW;
          drawContain(screenVideo, 0, 0, leftW, H);
          drawContain(camVideo, leftW + gap, 0, rightW, H);
        } else {
          drawContain(screenVideo, 0, 0, W, H);
          const diameter = Math.min(W, H) * 0.1955;
          const margin = Math.max(12, diameter * 0.2);
          const cx =
            camLayout === "overlay_bottom_left_circle"
              ? margin + diameter / 2
              : camLayout === "overlay_top_center_circle"
                ? W / 2
                : W - margin - diameter / 2;
          const cy =
            camLayout === "overlay_top_center_circle"
              ? margin + diameter / 2
              : H - margin - diameter / 2;

          drawCircleCover(camVideo, cx, cy, diameter);
        }
      }

      if (renderMode === "screen_mic" && screenStream) {
        drawContain(screenVideo, 0, 0, W, H);
      }

      if (renderMode === "cam_mic" && camStream) {
        drawContain(camVideo, 0, 0, W, H);
      }

      drawClickPulses();
      rafRef.current = requestAnimationFrame(render);
    }

    render();

    const canvasStream = canvas.captureStream(fps);
    const tracks: MediaStreamTrack[] = [];

    if (renderMode !== "mic_only") tracks.push(canvasStream.getVideoTracks()[0]);
    if (audioTrack) tracks.push(audioTrack);

    return new MediaStream(tracks);
  }

  function hasLiveTrack(stream: MediaStream | null, kind: "audio" | "video"): boolean {
    if (!stream) return false;
    const tracks = kind === "audio" ? stream.getAudioTracks() : stream.getVideoTracks();
    return tracks.some((track) => track.readyState === "live");
  }

  async function ensurePreviewInputStreams(requestedMode: Mode): Promise<{
    screenStream: MediaStream | null;
    camStream: MediaStream | null;
    micStream: MediaStream | null;
    effectiveMode: Mode;
  }> {
    let screenStream = screenStreamRef.current;
    let camStream = camStreamRef.current;
    let micStream = micStreamRef.current;
    let effectiveMode: Mode = requestedMode;

    if (effectiveMode.includes("screen") && !hasLiveTrack(screenStream, "video")) {
      try {
        screenStream = await getScreenStream();
        setScreenPermissionDenied(false);
      } catch (e: any) {
        const name = e?.name || e?.message;
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setScreenPermissionDenied(true);
          effectiveMode = "cam_mic";
          setMode("cam_mic");
          screenStream = null;
        } else {
          throw e;
        }
      }
      screenStreamRef.current = screenStream;
    }

    if (effectiveMode.includes("cam") && !hasLiveTrack(camStream, "video")) {
      camStream = await getCamStream();
      camStreamRef.current = camStream;
    }

    if (!hasLiveTrack(micStream, "audio")) {
      micStream = await getMicStream();
      micStreamRef.current = micStream;
    }

    return {
      screenStream: effectiveMode.includes("screen") ? screenStream : null,
      camStream: effectiveMode.includes("cam") ? camStream : null,
      micStream,
      effectiveMode,
    };
  }

  function cleanupComposedPreview(): void {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    stopStream(composedStreamRef.current);
    composedStreamRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
  }

  async function attachPreviewStream(stream: MediaStream): Promise<void> {
    let attempts = 0;
    while (!previewRef.current && attempts < 10) {
      attempts += 1;
      await new Promise((resolve) => window.setTimeout(resolve, 25));
    }

    const video = previewRef.current;
    if (!video) return;

    video.pause();
    video.removeAttribute("src");
    video.load();
    video.srcObject = stream;
    video.muted = true;
    video.controls = false;

    await new Promise((resolve) => window.setTimeout(resolve, 30));
    try {
      await video.play();
    } catch {
      await new Promise((resolve) => window.setTimeout(resolve, 80));
      try {
        await video.play();
      } catch {
        // no-op
      }
    }
  }

  async function preparePreview(): Promise<void> {
    if (isRecording || isStarting || isPreparingPreview) return;

    try {
      setIsPreparingPreview(true);
      const shouldReaskScreen = viewStep === "new" && screenPermissionDenied;
      const requestedMode: Mode =
        shouldReaskScreen && !mode.includes("screen") ? "screen_cam_mic" : mode;
      if (shouldReaskScreen) {
        setScreenPermissionDenied(false);
        if (requestedMode !== mode) {
          setMode(requestedMode);
        }
      }
      if (viewStep === "new") {
        setViewStep("preview");
        await new Promise((resolve) => window.setTimeout(resolve, 50));
      }
      setError(null);
      setDownloadUrl(null);
      setStatus("preview_init");
      setRuntimeSeconds(0);
      setTranscriptLines([]);
      setLiveFragment("");
      transcriptLinesRef.current = [];
      finalSegmentStartRef.current = 0;
      interimTranscriptRef.current = "";
      lastCommittedFinalTextRef.current = "";

      const { screenStream, camStream, micStream, effectiveMode } = await ensurePreviewInputStreams(requestedMode);

      cleanupComposedPreview();
      const audioTrack = await mixAudio(micStream, screenStream);
      const composed = await buildComposedStream(
        screenStream,
        camStream,
        audioTrack,
        QUALITY_PRESETS[quality].fps,
        effectiveMode
      );

      composedStreamRef.current = composed;
      await attachPreviewStream(composed);
      setStatus("preview_ready");
      lastPreparedPreviewConfigRef.current = previewConfigKey;
    } catch (e: any) {
      setError(e?.message ?? "preview failed");
      setStatus("error");
      cleanup();
      setViewStep("new");
    } finally {
      setIsPreparingPreview(false);
    }
  }

  async function start(): Promise<void> {
    try {
      if (!composedStreamRef.current) {
        await preparePreview();
      }
      if (!composedStreamRef.current) {
        return;
      }

      startCancelRequestedRef.current = false;
      stopStatusPolling();
      setIsStarting(true);
      setIsStopping(false);
      setError(null);
      setDownloadUrl(null);
      setStatus("init");
      setRuntimeSeconds(0);
      setTranscriptLines([]);
      setLiveFragment("");
      transcriptLinesRef.current = [];
      finalSegmentStartRef.current = 0;
      interimTranscriptRef.current = "";
      lastCommittedFinalTextRef.current = "";

      const init = await apiInit();
      assertStartNotCancelled();
      recordingRef.current = {
        uuid: init.uuid,
        token: init.upload_token,
        chunkSizeMs: init.chunk_size_ms ?? 1000,
      };

      chunkIndexRef.current = 0;
      pendingUploadsRef.current.clear();
      const composed = composedStreamRef.current;
      assertStartNotCancelled();

      const preset = QUALITY_PRESETS[quality];
      const rec = new MediaRecorder(composed, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: preset.videoBps,
        audioBitsPerSecond: preset.audioBps,
      });

      recorderRef.current = rec;

      rec.ondataavailable = (e: BlobEvent) => {
        if (!e.data.size) return;
        const upload = uploadBlobInParts(e.data)
          .catch((err) => {
            setError(err?.message ?? "chunk upload failed");
            throw err;
          })
          .finally(() => {
            pendingUploadsRef.current.delete(upload);
          });

        pendingUploadsRef.current.add(upload);
      };

      rec.onstop = async () => {
        try {
          setStatus("finishing");
          await waitForPendingUploads();
          await apiFinish(chunkIndexRef.current - 1);
          if (recordingRef.current.uuid) {
            pollStatus(recordingRef.current.uuid);
          }
        } catch (e: any) {
          setError(e?.message ?? "finish failed");
          setStatus("error");
        } finally {
          cleanup();
        }
      };

      setSettingsOpen(false);
      setStatus("countdown");
      await runStartCountdown(preRollSeconds);
      assertStartNotCancelled();

      recordingStartedAtRef.current = performance.now();
      isRecordingRef.current = true;
      startRuntimeTicker();

      startClickTracking();
      startSpeechRecognition();

      rec.start(recordingRef.current.chunkSizeMs);
      setSettingsOpen(false);
      setIsRecording(true);
      setIsStarting(false);
      setStatus("recording");
    } catch (e: any) {
      if (e?.message === START_CANCELLED_ERROR) {
        setError(null);
        setStatus("preview_ready");
      } else {
        setError(e?.message ?? "start failed");
        setStatus("error");
      }
      setIsStarting(false);
      if (e?.message !== START_CANCELLED_ERROR) {
        cleanup();
        setViewStep("new");
      }
    }
  }

  function cancelStart(): void {
    if (!isStarting) return;
    startCancelRequestedRef.current = true;
    setCountdown(null);
    setStatus("idle");
  }

  function executeStopNow(): void {
    const rec = recorderRef.current;
    if (!rec || rec.state === "inactive") return;

    isRecordingRef.current = false;
    stopClickTracking();
    flushPendingInterimTranscript();
    stopSpeechRecognition(false);
    stopRuntimeTicker(true);

    rec.requestData();
    rec.stop();
    setIsRecording(false);
    setIsStopping(false);
  }

  function stop(): void {
    const rec = recorderRef.current;
    if (!rec || rec.state === "inactive" || isStopping) return;

    setIsStopping(true);
    setStatus("stopping");

    stopDelayTimerRef.current = window.setTimeout(() => {
      stopDelayTimerRef.current = null;
      executeStopNow();
    }, STOP_DELAY_MS);
  }

  function cleanup(): void {
    setCountdown(null);
    setIsStarting(false);
    setIsStopping(false);
    if (stopDelayTimerRef.current) {
      window.clearTimeout(stopDelayTimerRef.current);
      stopDelayTimerRef.current = null;
    }
    stopClickTracking();
    stopSpeechRecognition();
    stopRuntimeTicker(false);

    cleanupComposedPreview();
    stopStream(screenStreamRef.current);
    stopStream(camStreamRef.current);
    stopStream(micStreamRef.current);
    screenStreamRef.current = null;
    camStreamRef.current = null;
    micStreamRef.current = null;
    if (previewRef.current) {
      previewRef.current.pause();
      previewRef.current.srcObject = null;
      previewRef.current.removeAttribute("src");
      previewRef.current.load();
    }
  }

  function resetToNew(): void {
    cleanup();
    setViewStep("new");
    setStatus("idle");
    setRuntimeSeconds(0);
    setError(null);
    setDownloadUrl(null);
    setSettingsOpen(false);
    lastPreparedPreviewConfigRef.current = "";
  }

  useEffect(() => {
    if (viewStep !== "preview") return;
    if (isRecording || isStarting || isPreparingPreview) return;
    if (!lastPreparedPreviewConfigRef.current) return;
    if (lastPreparedPreviewConfigRef.current === previewConfigKey) return;

    const timer = window.setTimeout(() => {
      void preparePreview();
    }, 200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [previewConfigKey, viewStep, isRecording, isStarting, isPreparingPreview]);

  async function pollStatus(uuid: string): Promise<void> {
    setStatus("processing");
    stopStatusPolling();

    const interval = window.setInterval(async () => {
      const res = await apiStatusByUuid(uuid);
      if (!res) return;

      if (res.status === "done" && res.mp4_url) {
        window.clearInterval(interval);
        statusPollIntervalRef.current = null;
        setDownloadUrl(res.mp4_url);
        setStatus("done");

        if (previewRef.current) {
          previewRef.current.pause();
          previewRef.current.srcObject = null;
          previewRef.current.src = res.mp4_url;
          previewRef.current.muted = false;
          previewRef.current.controls = true;
          previewRef.current.load();
        }
      }

      if (res.status === "error") {
        window.clearInterval(interval);
        statusPollIntervalRef.current = null;
        setStatus("error");
      }
    }, 2000);
    statusPollIntervalRef.current = interval;
  }

  function renderQualityIcon(level: Quality): JSX.Element {
    const bars = level === "standard" ? 1 : level === "high" ? 2 : 3;
    return (
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 14 }}>
        {[1, 2, 3].map((bar) => (
          <span
            key={bar}
            style={{
              width: 4,
              height: bar * 4,
              borderRadius: 2,
              background: bar <= bars ? "#111827" : "#d1d5db",
              display: "inline-block",
            }}
          />
        ))}
      </div>
    );
  }

  function renderCamLayoutIcon(layout: CamLayout): JSX.Element {
    const circleStyleBase = {
      position: "absolute" as const,
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: "#111827",
      border: "1px solid #fff",
    };

    return (
      <div
        style={{
          position: "relative",
          width: 26,
          height: 16,
          borderRadius: 3,
          background: "#d1d5db",
          overflow: "hidden",
          border: "1px solid #9ca3af",
        }}
      >
        {layout === "split_panel" && (
          <>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "72%", background: "#9ca3af" }} />
            <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "28%", background: "#111827" }} />
          </>
        )}
        {layout === "overlay_top_center_circle" && (
          <span style={{ ...circleStyleBase, top: 1, left: 9 }} />
        )}
        {layout === "overlay_bottom_right_circle" && (
          <span style={{ ...circleStyleBase, right: 1, bottom: 1 }} />
        )}
        {layout === "overlay_bottom_left_circle" && (
          <span style={{ ...circleStyleBase, left: 1, bottom: 1 }} />
        )}
      </div>
    );
  }

  function renderModeIcon(currentMode: Mode): JSX.Element {
    const screen = (
      <span style={{ width: 12, height: 8, border: "1px solid #111827", borderRadius: 2, display: "inline-block" }} />
    );
    const cam = (
      <span style={{ width: 10, height: 10, borderRadius: "50%", border: "1px solid #111827", display: "inline-block" }} />
    );
    const mic = (
      <span style={{ width: 4, height: 10, borderRadius: 3, background: "#111827", display: "inline-block" }} />
    );

    if (currentMode === "mic_only") {
      return <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>{mic}</span>;
    }
    if (currentMode === "cam_mic") {
      return <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>{cam}{mic}</span>;
    }
    if (currentMode === "screen_mic") {
      return <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>{screen}{mic}</span>;
    }
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
        {screen}
        {cam}
        {mic}
      </div>
    );
  }

  const hasCamLayout = mode === "screen_cam_mic";

  return (
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      <video ref={screenVideoRef} style={{ display: "none" }} muted playsInline />
      <video ref={camVideoRef} style={{ display: "none" }} muted playsInline />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div style={{ position: "relative", marginTop: 12 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "stretch", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 620px", minWidth: 0 }}>
          <div
            style={{
              position: "relative",
              background: "#000",
              borderRadius: 16,
              overflow: "hidden",
              aspectRatio: "16 / 9",
            }}
          >
            {viewStep === "new" ? (
              <>
                <video ref={previewRef} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} playsInline autoPlay muted />
              </>
            ) : (
              <video ref={previewRef} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} playsInline autoPlay muted />
            )}

            {countdown !== null && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(0, 0, 0, 0.55)",
                  color: "#fff",
                  fontSize: 96,
                  fontWeight: 800,
                  lineHeight: 1,
                }}
              >
                {countdown}
              </div>
            )}
            {runtimeSeconds > 0 && (
              <div
                style={{
                  position: "absolute",
                  right: 10,
                  bottom: 10,
                  background: "rgba(0, 0, 0, 0.65)",
                  color: "#fff",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: 12,
                  padding: "4px 8px",
                  borderRadius: 8,
                }}
              >
                {formatTimestamp(runtimeSeconds)}
              </div>
            )}
            {status && (
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  left: 10,
                  background: "rgba(0, 0, 0, 0.65)",
                  color: "#fff",
                  fontSize: 12,
                  padding: "4px 8px",
                  borderRadius: 8,
                  textTransform: "capitalize",
                }}
              >
                {status}
              </div>
            )}
          </div>

          {viewStep === "preview" && (
            <div
              style={{
                marginTop: 12,
                background: "#101010",
                borderRadius: 12,
                padding: "12px 14px",
                position: "relative",
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", columnGap: 24 }}>
                <div style={{ justifySelf: "end" }}>
                  {!isRecording && !isStarting && (
                    <button
                      type="button"
                      onClick={() => setSettingsOpen((prev) => !prev)}
                      disabled={isStarting}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        border: "1px solid rgba(255,255,255,0.35)",
                        background: "rgba(0,0,0,0.55)",
                        color: "#fff",
                        fontSize: 24,
                        lineHeight: "1",
                        cursor: "pointer",
                      }}
                      aria-label="Settings"
                    >
                      ⋯
                    </button>
                  )}
                </div>
                <div style={{ justifySelf: "center" }}>
                  <button
                    type="button"
                    onClick={isRecording ? stop : isStarting ? cancelStart : start}
                    disabled={isStopping || isPreparingPreview}
                    style={{
                      width: 74,
                      height: 74,
                      borderRadius: "50%",
                      border: "3px solid #fff",
                      background: "#fff",
                      boxShadow: "0 3px 10px rgba(0,0,0,0.25)",
                      cursor: isStopping ? "wait" : "pointer",
                      position: "relative",
                    }}
                    aria-label={isRecording ? "Stop recording" : isStarting ? "Cancel start" : "Start recording"}
                  >
                    {(isRecording || isStarting) && (
                      <span
                        style={{
                          position: "absolute",
                          inset: 20,
                          borderRadius: 8,
                          background: isStarting ? "#111827" : "#ef4444",
                        }}
                      />
                    )}
                  </button>
                </div>
                <div style={{ justifySelf: "start" }}>
                  {!isRecording && (
                    <button
                      type="button"
                      onClick={resetToNew}
                      disabled={isStarting || isPreparingPreview}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        border: "1px solid rgba(255,255,255,0.35)",
                        background: "#ef4444",
                        color: "#fff",
                        fontSize: 20,
                        fontWeight: 800,
                        lineHeight: "1",
                        cursor: "pointer",
                      }}
                      aria-label="Reset preview"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {settingsOpen && (
                <div
                  style={{
                    position: "absolute",
                    left: 12,
                    bottom: 94,
                    width: "min(860px, calc(100vw - 40px))",
                    maxHeight: "75vh",
                    overflowY: "auto",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    padding: 14,
                    boxShadow: "0 14px 40px rgba(0,0,0,0.25)",
                    zIndex: 5,
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 10 }}>Settings</div>
                  <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
                    <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
                      <div>
                        <InputLabel value="Art der Aufnahme" />
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 }}>
                          {MODES.map((m) => {
                            const isScreenMode = m.id.includes("screen");
                            const isDisabled = (isRecording || isStarting) || (screenPermissionDenied && isScreenMode);
                            return (
                              <button
                                key={m.id}
                                type="button"
                                disabled={isDisabled}
                                onClick={() => setMode(m.id)}
                                style={{
                                  border: mode === m.id ? "2px solid #111827" : "1px solid #d1d5db",
                                  background: mode === m.id ? "#f3f4f6" : "#fff",
                                  borderRadius: 8,
                                  padding: "6px 4px",
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  gap: 4,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: isDisabled ? "not-allowed" : "pointer",
                                  opacity: isDisabled ? 0.5 : 1,
                                }}
                              >
                                {renderModeIcon(m.id)}
                                <span style={{ textAlign: "center" }}>{m.label}</span>
                              </button>
                            );
                          })}
                        </div>
                        {screenPermissionDenied && (
                          <div style={{ marginTop: 6, fontSize: 11, color: "#6b7280" }}>
                            Screen-Modi deaktiviert (Freigabe verweigert).
                          </div>
                        )}
                      </div>
                      <div>
                        <InputLabel value="Qualitaet" />
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6 }}>
                          {(Object.keys(QUALITY_PRESETS) as Quality[]).map((q) => (
                            <button
                              key={q}
                              type="button"
                              disabled={isRecording || isStarting}
                              onClick={() => setQuality(q)}
                              style={{
                                border: quality === q ? "2px solid #111827" : "1px solid #d1d5db",
                                background: quality === q ? "#f3f4f6" : "#fff",
                                borderRadius: 8,
                                padding: "6px 4px",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 4,
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              {renderQualityIcon(q)}
                              <span>{QUALITY_PRESETS[q].label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
                      <div>
                        <InputLabel value="Cam Layout" />
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 }}>
                          {CAM_LAYOUTS.map((layout) => (
                            <button
                            key={layout.id}
                            type="button"
                            disabled={isRecording || isStarting || !hasCamLayout}
                            onClick={() => setCamLayout(layout.id)}
                            style={{
                                border: camLayout === layout.id ? "2px solid #111827" : "1px solid #d1d5db",
                                background: camLayout === layout.id ? "#f3f4f6" : "#fff",
                                borderRadius: 8,
                                padding: "6px 4px",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                              gap: 4,
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: hasCamLayout ? "pointer" : "not-allowed",
                              opacity: hasCamLayout ? 1 : 0.45,
                            }}
                          >
                              {renderCamLayoutIcon(layout.id)}
                              <span>{layout.label}</span>
                            </button>
                          ))}
                        </div>
                        {!hasCamLayout && (
                          <div style={{ marginTop: 6, fontSize: 11, color: "#6b7280" }}>
                            Nur bei Screen + Cam verfuegbar.
                          </div>
                        )}
                      </div>
                      <div>
                        <InputLabel value="Background" />
                        <ColorInput
                          value={canvasBgColor}
                          disabled={isRecording || isStarting}
                          onChange={setCanvasBgColor}
                        />
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <InputLabel value="Sek. Vorlauf" className="mb-0" />
                        <InputText
                          type="number"
                          min={0}
                          max={10}
                          step={1}
                          value={preRollSeconds}
                          disabled={isRecording || isStarting}
                          onChange={(e) => setPreRollSeconds(Number(e.target.value))}
                          className="w-20"
                        />
                      </label>
                      <div>
                        <InputLabel value="Mikrofon Verstaerkung" />
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                          <input
                            type="range"
                            min={0.4}
                            max={2}
                            step={0.05}
                            value={micGainLevel}
                            disabled={isRecording || isStarting}
                            onChange={(e) => setMicGainLevel(Number(e.target.value))}
                          />
                          <span>{micGainLevel.toFixed(2)}x</span>
                        </div>
                      </div>
                      <div>
                        <InputLabel value="Systemlautstaerke" />
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={systemGainLevel}
                            disabled={isRecording || isStarting}
                            onChange={(e) => setSystemGainLevel(Number(e.target.value))}
                          />
                          <span>{Math.round(systemGainLevel * 100)}%</span>
                        </div>
                      </div>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <InputLabel value="Sprache" className="mb-0" />
                        <InputSelect
                          withEmpty={false}
                          value={transcriptLang}
                          disabled={isRecording || isStarting}
                          onChange={(e) => setTranscriptLang(e.target.value)}
                          options={[
                            ["de-DE", "de-DE"],
                            ["de-AT", "de-AT"],
                            ["en-US", "en-US"],
                          ]}
                          className="w-24"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {viewStep !== "preview" && (
            <div
              style={{
                marginTop: 12,
                height: 98,
                borderRadius: 12,
                background: "#101010",
                opacity: 0,
                pointerEvents: "none",
              }}
            />
          )}
        </div>

        <div
          style={{
            width: 252,
            maxHeight: 480,
            overflowY: "auto",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 12,
            background: "#fff",
            flex: "1 1 280px",
            visibility: status === "idle" ? "hidden" : "visible",
            pointerEvents: status === "idle" ? "none" : "auto",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Transcript (Timestamps)</div>
          <div style={{ marginBottom: 10, padding: 8, borderRadius: 8, background: "#f9fafb", fontSize: 13 }}>
            <strong>LIVE:</strong> {liveFragment || "[...]"}
          </div>
          {transcriptLines.length === 0 ? (
            <div style={{ opacity: 0.6, fontSize: 13 }}>Noch keine Eintraege.</div>
          ) : (
            transcriptLines.map((line, idx) => (
              <div key={`${line.seconds}-${idx}`} style={{ marginBottom: 10, fontSize: 13, lineHeight: 1.35 }}>
                <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: "#6b7280" }}>
                  {formatTimestamp(line.seconds)}
                </div>
                <div>{line.text}</div>
              </div>
            ))
          )}
        </div>
        </div>
        {viewStep === "new" && (
          <button
            type="button"
            onClick={preparePreview}
            disabled={isPreparingPreview}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 12,
              border: 0,
              borderRadius: 16,
              background: "#000",
              color: "#fff",
              width: "100%",
              height: "100%",
              fontSize: 28,
              fontWeight: 700,
              cursor: isPreparingPreview ? "wait" : "pointer",
            }}
          >
            {isPreparingPreview ? "Vorschau wird vorbereitet..." : "neues Recording"}
          </button>
        )}
      </div>

    </div>
  );
}
