import React, { useRef, useState } from "react";
import axios from "axios";
import Checkbox from "./Checkbox";
import ColorInput from "./ColorInput";
import InputLabel from "./InputLabel";
import InputSelect from "./InputSelect";
import InputText from "./InputText";
import PrimaryButton from "./PrimaryButton";
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
  const [systemAudio, setSystemAudio] = useState<boolean>(true);
  const [micGainLevel, setMicGainLevel] = useState<number>(1.0);
  const [systemGainLevel, setSystemGainLevel] = useState<number>(0.7);
  const [preRollSeconds, setPreRollSeconds] = useState<number>(3);
  const [enableClickTracking, setEnableClickTracking] = useState<boolean>(true);
  const [enableTranscript, setEnableTranscript] = useState<boolean>(true);
  const [transcriptLang, setTranscriptLang] = useState<string>("de-DE");
  const [transcriptLines, setTranscriptLines] = useState<TranscriptLine[]>([]);
  const [liveFragment, setLiveFragment] = useState<string>("");
  const [status, setStatus] = useState<string>("idle");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [runtimeSeconds, setRuntimeSeconds] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

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

  const mimeType = pickMimeType();

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
    if (!enableClickTracking || clickHandlerRef.current) return;
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
    if (!enableTranscript) return;

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
      if (!isRecordingRef.current || !enableTranscript) return;
      window.setTimeout(() => {
        if (!isRecordingRef.current || !enableTranscript) return;
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
      audio: systemAudio,
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
    fps: number
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

    const baseVideo = screenStream ? screenVideo : camStream ? camVideo : null;
    const baseW = baseVideo?.videoWidth || 1280;
    const baseH = baseVideo?.videoHeight || 720;

    canvas.width = baseW;
    canvas.height = baseH;

    const W = canvas.width;
    const H = canvas.height;

    const drawContain = (
      video: HTMLVideoElement,
      dx: number,
      dy: number,
      dw: number,
      dh: number
    ) => {
      const vw = video.videoWidth || 1;
      const vh = video.videoHeight || 1;
      const scale = Math.min(dw / vw, dh / vh);
      const rw = vw * scale;
      const rh = vh * scale;
      const x = dx + (dw - rw) / 2;
      const y = dy + (dh - rh) / 2;
      ctx.drawImage(video, x, y, rw, rh);
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
      if (!enableClickTracking || mode === "mic_only") return;

      const now = performance.now();
      clickPulsesRef.current = clickPulsesRef.current.filter(
        (pulse) => now - pulse.startedAt <= CLICK_PULSE_DURATION_MS
      );

      const splitWidth = Math.floor(W * 0.75);

      for (const pulse of clickPulsesRef.current) {
        const t = clamp((now - pulse.startedAt) / CLICK_PULSE_DURATION_MS, 0, 1);
        const x =
          mode === "screen_cam_mic" && camLayout === "split_panel"
            ? pulse.xNorm * splitWidth
            : pulse.xNorm * W;
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

      if (mode === "screen_cam_mic") {
        if (camLayout === "split_panel") {
          const leftW = Math.floor(W * 0.75);
          drawContain(screenVideo, 0, 0, leftW, H);

          const bubbleW = W - leftW - 32;
          const bubbleH = Math.floor((bubbleW * 9) / 16);
          drawCover(camVideo, leftW + 16, 16, bubbleW, bubbleH);
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

      if (mode === "screen_mic" && screenStream) {
        drawContain(screenVideo, 0, 0, W, H);
      }

      if (mode === "cam_mic" && camStream) {
        drawContain(camVideo, 0, 0, W, H);
      }

      drawClickPulses();
      rafRef.current = requestAnimationFrame(render);
    }

    render();

    const canvasStream = canvas.captureStream(fps);
    const tracks: MediaStreamTrack[] = [];

    if (mode !== "mic_only") tracks.push(canvasStream.getVideoTracks()[0]);
    if (audioTrack) tracks.push(audioTrack);

    return new MediaStream(tracks);
  }

  async function start(): Promise<void> {
    try {
      startCancelRequestedRef.current = false;
      setIsStarting(true);
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

      let screenStream: MediaStream | null = null;
      let camStream: MediaStream | null = null;

      if (mode.includes("screen")) screenStream = await getScreenStream();
      if (mode.includes("cam")) camStream = await getCamStream();
      const micStream = await getMicStream();
      assertStartNotCancelled();

      screenStreamRef.current = screenStream;
      camStreamRef.current = camStream;
      micStreamRef.current = micStream;

      const audioTrack = await mixAudio(micStream, systemAudio ? screenStream : null);
      const composed = await buildComposedStream(
        screenStream,
        camStream,
        audioTrack,
        QUALITY_PRESETS[quality].fps
      );
      assertStartNotCancelled();

      composedStreamRef.current = composed;

      if (previewRef.current) {
        previewRef.current.pause();
        previewRef.current.removeAttribute("src");
        previewRef.current.load();
        previewRef.current.srcObject = composed;
        previewRef.current.muted = true;
        previewRef.current.controls = false;
        await previewRef.current.play();
      }

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
          pollStatus();
        } catch (e: any) {
          setError(e?.message ?? "finish failed");
          setStatus("error");
        } finally {
          cleanup();
        }
      };

      setStatus("countdown");
      await runStartCountdown(preRollSeconds);
      assertStartNotCancelled();

      recordingStartedAtRef.current = performance.now();
      isRecordingRef.current = true;
      startRuntimeTicker();

      if (enableClickTracking) startClickTracking();
      if (enableTranscript) {
        startSpeechRecognition();
      }

      rec.start(recordingRef.current.chunkSizeMs);
      setIsRecording(true);
      setIsStarting(false);
      setStatus("recording");
    } catch (e: any) {
      if (e?.message === START_CANCELLED_ERROR) {
        setError(null);
        setStatus("idle");
      } else {
        setError(e?.message ?? "start failed");
      }
      setIsStarting(false);
      cleanup();
    }
  }

  function cancelStart(): void {
    if (!isStarting) return;
    startCancelRequestedRef.current = true;
    setCountdown(null);
    setStatus("idle");
  }

  function stop(): void {
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
  }

  function cleanup(): void {
    setCountdown(null);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    stopClickTracking();
    stopSpeechRecognition();
    stopRuntimeTicker(false);

    stopStream(screenStreamRef.current);
    stopStream(camStreamRef.current);
    stopStream(micStreamRef.current);
    stopStream(composedStreamRef.current);
    audioContextRef.current?.close();
    audioContextRef.current = null;
  }

  async function pollStatus(): Promise<void> {
    setStatus("processing");

    const interval = setInterval(async () => {
      const res = await apiStatus();
      if (!res) return;

      if (res.status === "done" && res.mp4_url) {
        clearInterval(interval);
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
        clearInterval(interval);
        setStatus("error");
      }
    }, 2000);
  }

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto" }}>
      <h2>Screen Recorder (TSX)</h2>

      <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap" }}>
        <div style={{ minWidth: 240 }}>
          <InputLabel value="Modus" />
          <InputSelect
            withEmpty={false}
            disabled={isRecording || isStarting}
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            options={MODES.map((m) => [m.id, m.label])}
            className="w-full"
          />
        </div>

        <div style={{ minWidth: 180 }}>
          <InputLabel value="Qualitaet" />
          <InputSelect
            withEmpty={false}
            disabled={isRecording || isStarting}
            value={quality}
            onChange={(e) => setQuality(e.target.value as Quality)}
            options={Object.entries(QUALITY_PRESETS).map(([id, preset]) => [id, `Qualitaet: ${preset.label}`])}
            className="w-full"
          />
        </div>

        <div style={{ minWidth: 220 }}>
          <InputLabel value="Cam Layout" />
          <InputSelect
            withEmpty={false}
            disabled={isRecording || isStarting}
            value={camLayout}
            onChange={(e) => setCamLayout(e.target.value as CamLayout)}
            options={CAM_LAYOUTS.map((layout) => [layout.id, `Cam: ${layout.label}`])}
            className="w-full"
          />
        </div>

        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Checkbox
            checked={systemAudio}
            disabled={isRecording || isStarting}
            onChange={(e) => setSystemAudio(e.target.checked)}
          />
          <span>System Audio</span>
        </label>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ minWidth: 220 }}>
          <InputLabel value="Background" />
          <ColorInput
            value={canvasBgColor}
            disabled={isRecording || isStarting}
            onChange={setCanvasBgColor}
          />
        </div>

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

        <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          Mic Gain
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
        </label>

        <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          System Gain
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={systemGainLevel}
            disabled={isRecording || isStarting || !systemAudio}
            onChange={(e) => setSystemGainLevel(Number(e.target.value))}
          />
          <span>{Math.round(systemGainLevel * 100)}%</span>
        </label>

        <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Checkbox
            checked={enableClickTracking}
            disabled={isRecording || isStarting}
            onChange={(e) => setEnableClickTracking(e.target.checked)}
          />
          Click Tracking
        </label>

        <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Checkbox
            checked={enableTranscript}
            disabled={isRecording || isStarting}
            onChange={(e) => setEnableTranscript(e.target.checked)}
          />
          Transcript
        </label>

        <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <InputLabel value="Sprache" className="mb-0" />
          <InputSelect
            withEmpty={false}
            value={transcriptLang}
            disabled={isRecording || isStarting || !enableTranscript}
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

      <div style={{ marginTop: 12 }}>
        {!isRecording ? (
          <div style={{ display: "flex", gap: 8 }}>
            <PrimaryButton onClick={start} disabled={isStarting}>
              {isStarting ? "Vorbereitung..." : "Start"}
            </PrimaryButton>
            {isStarting && (
              <SecondaryButton onClick={cancelStart}>
                Abbrechen
              </SecondaryButton>
            )}
          </div>
        ) : (
          <SecondaryButton onClick={stop}>Stop</SecondaryButton>
        )}
      </div>

      <p>Status: {status}</p>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {downloadUrl && <p>Fertig verarbeitet. Video ist unten abspielbar.</p>}

      <video ref={screenVideoRef} style={{ display: "none" }} muted playsInline />
      <video ref={camVideoRef} style={{ display: "none" }} muted playsInline />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div style={{ display: "flex", gap: 16, alignItems: "stretch", marginTop: 20 }}>
        <div
          style={{
            position: "relative",
            background: "#111",
            borderRadius: 12,
            overflow: "hidden",
            minHeight: 240,
            flex: 1,
          }}
        >
          <video ref={previewRef} style={{ width: "100%", display: "block" }} playsInline />
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
        </div>

        <div
          style={{
            width: 320,
            maxHeight: 420,
            overflowY: "auto",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 12,
            background: "#fff",
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
    </div>
  );
}
