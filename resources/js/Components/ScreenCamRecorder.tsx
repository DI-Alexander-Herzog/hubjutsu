import React, { useRef, useState } from "react";
import axios from "axios";

type Mode =
  | "screen_cam_mic"
  | "screen_mic"
  | "cam_mic"
  | "mic_only";
type Quality = "standard" | "high" | "max";
type CamLayout =
  | "split_panel"
  | "overlay_top_center_circle"
  | "overlay_bottom_right_circle"
  | "overlay_bottom_left_circle";

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

type InitResponse = {
  uuid: string;
  upload_token: string;
  chunk_size_ms?: number;
};

type StatusResponse = {
  status: "finished" | "processing" | "done" | "error";
  mp4_url?: string;
};

const MAX_UPLOAD_PART_BYTES = 512 * 1024;

function pickMimeType(): string {
  const types = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
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
  const [mode, setMode] = useState<Mode>("screen_cam_mic");
  const [quality, setQuality] = useState<Quality>("high");
  const [camLayout, setCamLayout] = useState<CamLayout>("overlay_top_center_circle");
  const [canvasBgColor, setCanvasBgColor] = useState<string>("#ffffff");
  const [systemAudio, setSystemAudio] = useState<boolean>(true);
  const [micGainLevel, setMicGainLevel] = useState<number>(1.0);
  const [systemGainLevel, setSystemGainLevel] = useState<number>(0.7);
  const [preRollSeconds, setPreRollSeconds] = useState<number>(3);
  const [status, setStatus] = useState<string>("idle");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const mimeType = pickMimeType();

  const recordingRef = useRef<{
    uuid: string | null;
    token: string | null;
    chunkSizeMs: number;
  }>({
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
      const status = e?.response?.status;
      if (status === 413) {
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
    const total = Math.max(0, Math.min(10, Math.floor(seconds || 0)));
    for (let value = total; value >= 1; value--) {
      setCountdown(value);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    setCountdown(null);
  }

  async function apiFinish(lastIndex: number): Promise<void> {
    const { uuid, token } = recordingRef.current;
    if (!uuid || !token) throw new Error("missing uuid/token");

    await axios.post(
      `/media/recording/${uuid}/finish`,
      { last_index: lastIndex },
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

    const drawCircleCover = (
      video: HTMLVideoElement,
      cx: number,
      cy: number,
      diameter: number
    ) => {
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
      setIsStarting(true);
      setError(null);
      setDownloadUrl(null);
      setStatus("init");

      const init = await apiInit();
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

      rec.start(recordingRef.current.chunkSizeMs);
      setIsRecording(true);
      setIsStarting(false);
      setStatus("recording");
    } catch (e: any) {
      setError(e?.message ?? "start failed");
      setIsStarting(false);
      cleanup();
    }
  }

  function stop(): void {
    const rec = recorderRef.current;
    if (!rec || rec.state === "inactive") return;
    rec.requestData();
    rec.stop();
    setIsRecording(false);
  }

  function cleanup(): void {
    setCountdown(null);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

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
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h2>Screen Recorder (TSX)</h2>

      <select
        disabled={isRecording || isStarting}
        value={mode}
        onChange={(e) => setMode(e.target.value as Mode)}
      >
        {MODES.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>

      <select
        disabled={isRecording || isStarting}
        value={quality}
        onChange={(e) => setQuality(e.target.value as Quality)}
        style={{ marginLeft: 12 }}
      >
        {Object.entries(QUALITY_PRESETS).map(([id, preset]) => (
          <option key={id} value={id}>
            Qualität: {preset.label}
          </option>
        ))}
      </select>

      <select
        disabled={isRecording || isStarting}
        value={camLayout}
        onChange={(e) => setCamLayout(e.target.value as CamLayout)}
        style={{ marginLeft: 12 }}
      >
        {CAM_LAYOUTS.map((layout) => (
          <option key={layout.id} value={layout.id}>
            Cam: {layout.label}
          </option>
        ))}
      </select>

      <label style={{ marginLeft: 12 }}>
        <input
          type="checkbox"
          checked={systemAudio}
          disabled={isRecording || isStarting}
          onChange={(e) => setSystemAudio(e.target.checked)}
        />
        System Audio
      </label>

      <div style={{ marginTop: 12, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          Background
          <input
            type="color"
            value={canvasBgColor}
            disabled={isRecording || isStarting}
            onChange={(e) => setCanvasBgColor(e.target.value)}
          />
        </label>

        <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          Sek. Vorlauf
          <input
            type="number"
            min={0}
            max={10}
            step={1}
            value={preRollSeconds}
            disabled={isRecording || isStarting}
            onChange={(e) => setPreRollSeconds(Number(e.target.value))}
            style={{ width: 64 }}
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
      </div>

      <div style={{ marginTop: 12 }}>
        {!isRecording ? (
          <button onClick={start} disabled={isStarting}>
            {isStarting ? "Vorbereitung..." : "Start"}
          </button>
        ) : (
          <button onClick={stop}>Stop</button>
        )}
      </div>

      <p>Status: {status}</p>
      {error && <p style={{ color: "red" }}>{error}</p>}

      {downloadUrl && <p>Fertig verarbeitet. Video ist unten abspielbar.</p>}

      <video ref={screenVideoRef} style={{ display: "none" }} muted playsInline />
      <video ref={camVideoRef} style={{ display: "none" }} muted playsInline />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div
        style={{
          position: "relative",
          marginTop: 20,
          background: "#111",
          borderRadius: 12,
          overflow: "hidden",
          minHeight: 240,
        }}
      >
        <video
          ref={previewRef}
          style={{ width: "100%", display: "block" }}
          playsInline
        />
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
      </div>
    </div>
  );
}
