import React, { useRef, useState } from "react";

type Mode =
  | "screen_cam_mic"
  | "screen_mic"
  | "cam_mic"
  | "mic_only";

const MODES: { id: Mode; label: string }[] = [
  { id: "screen_cam_mic", label: "Screen + Cam + Mic (Split)" },
  { id: "screen_mic", label: "Screen + Mic" },
  { id: "cam_mic", label: "Cam + Mic" },
  { id: "mic_only", label: "Nur Mic" },
];

type InitResponse = {
  uuid: string;
  upload_token: string;
  chunk_size_ms?: number;
};

type StatusResponse = {
  status: "finished" | "processing" | "done" | "error";
  mp4_url?: string;
};

function pickMimeType(): string {
  const types = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  return (
    types.find((t) => MediaRecorder.isTypeSupported(t)) ?? ""
  );
}

export default function ScreenCamRecorder(): JSX.Element {
  const [mode, setMode] = useState<Mode>("screen_cam_mic");
  const [systemAudio, setSystemAudio] = useState<boolean>(true);
  const [status, setStatus] = useState<string>("idle");
  const [isRecording, setIsRecording] = useState<boolean>(false);
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

  const screenStreamRef = useRef<MediaStream | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const composedStreamRef = useRef<MediaStream | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const camVideoRef = useRef<HTMLVideoElement | null>(null);
  const previewRef = useRef<HTMLVideoElement | null>(null);

  /* ===============================
     API Calls
  =============================== */

  async function apiInit(): Promise<InitResponse> {
    const res = await fetch("/media/recording/init", {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) throw new Error("init failed");
    return res.json();
  }

  async function apiUploadChunk(index: number, blob: Blob): Promise<void> {
    const { uuid, token } = recordingRef.current;
    if (!uuid || !token) throw new Error("missing uuid/token");

    const fd = new FormData();
    fd.append("index", String(index));
    fd.append("chunk", blob);

    const res = await fetch(`/media/recording/${uuid}/chunk`, {
      method: "POST",
      body: fd,
      credentials: "include",
      headers: { "X-Upload-Token": token },
    });

    if (!res.ok) throw new Error("chunk upload failed");
  }

  async function apiFinish(lastIndex: number): Promise<void> {
    const { uuid, token } = recordingRef.current;
    if (!uuid || !token) throw new Error("missing uuid/token");

    const res = await fetch(`/media/recording/${uuid}/finish`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-Upload-Token": token,
      },
      body: JSON.stringify({ last_index: lastIndex }),
    });

    if (!res.ok) throw new Error("finish failed");
  }

  async function apiStatus(): Promise<StatusResponse | null> {
    const { uuid } = recordingRef.current;
    if (!uuid) return null;

    const res = await fetch(`/media/recording/${uuid}/status`, {
      credentials: "include",
    });

    if (!res.ok) return null;
    return res.json();
  }

  /* ===============================
     Media Helpers
  =============================== */

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
      audio: true,
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
    const dest = ctx.createMediaStreamDestination();

    const micTrack = micStream?.getAudioTracks()[0];
    if (micTrack) {
      ctx.createMediaStreamSource(new MediaStream([micTrack])).connect(dest);
    }

    const sysTrack = screenStream?.getAudioTracks()[0];
    if (sysTrack) {
      ctx.createMediaStreamSource(new MediaStream([sysTrack])).connect(dest);
    }

    return dest.stream.getAudioTracks()[0] ?? null;
  }

  /* ===============================
     Canvas Composition
  =============================== */

  async function buildComposedStream(
    screenStream: MediaStream | null,
    camStream: MediaStream | null,
    audioTrack: MediaStreamTrack | null
  ): Promise<MediaStream> {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    canvas.width = 1280;
    canvas.height = 720;

    const W = canvas.width;
    const H = canvas.height;

    const screenVideo = screenVideoRef.current!;
    const camVideo = camVideoRef.current!;

    if (screenStream) {
      screenVideo.srcObject = screenStream;
      await screenVideo.play();
    }

    if (camStream) {
      camVideo.srcObject = camStream;
      await camVideo.play();
    }

    function render() {
      ctx.clearRect(0, 0, W, H);

      if (mode === "screen_cam_mic") {
        const leftW = Math.floor(W * 0.75);

        ctx.drawImage(screenVideo, 0, 0, leftW, H);

        const bubbleW = W - leftW - 32;
        const bubbleH = Math.floor((bubbleW * 9) / 16);

        ctx.drawImage(camVideo, leftW + 16, 16, bubbleW, bubbleH);
      }

      if (mode === "screen_mic" && screenStream) {
        ctx.drawImage(screenVideo, 0, 0, W, H);
      }

      if (mode === "cam_mic" && camStream) {
        ctx.drawImage(camVideo, 0, 0, W, H);
      }

      rafRef.current = requestAnimationFrame(render);
    }

    render();

    const canvasStream = canvas.captureStream(30);

    const tracks: MediaStreamTrack[] = [];
    if (mode !== "mic_only") tracks.push(canvasStream.getVideoTracks()[0]);
    if (audioTrack) tracks.push(audioTrack);

    return new MediaStream(tracks);
  }

  /* ===============================
     Start / Stop
  =============================== */

  async function start(): Promise<void> {
    try {
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
      let micStream: MediaStream | null = null;

      if (mode.includes("screen")) screenStream = await getScreenStream();
      if (mode.includes("cam")) camStream = await getCamStream();
      if (mode === "mic_only") micStream = await getMicStream();

      screenStreamRef.current = screenStream;
      camStreamRef.current = camStream;

      const audioTrack = await mixAudio(
        camStream || micStream,
        systemAudio ? screenStream : null
      );

      const composed = await buildComposedStream(
        screenStream,
        camStream,
        audioTrack
      );

      composedStreamRef.current = composed;

      if (previewRef.current) {
        previewRef.current.srcObject = composed;
        previewRef.current.muted = true;
        await previewRef.current.play();
      }

      const rec = new MediaRecorder(
        composed,
        mimeType ? { mimeType } : undefined
      );

      recorderRef.current = rec;

      rec.ondataavailable = async (e: BlobEvent) => {
        if (!e.data.size) return;
        await apiUploadChunk(chunkIndexRef.current++, e.data);
      };

      rec.onstop = async () => {
        setStatus("finishing");
        await apiFinish(chunkIndexRef.current - 1);
        pollStatus();
      };

      rec.start(recordingRef.current.chunkSizeMs);

      setIsRecording(true);
      setStatus("recording");
    } catch (e: any) {
      setError(e.message);
      cleanup();
    }
  }

  function stop(): void {
    recorderRef.current?.stop();
    setIsRecording(false);
    cleanup();
  }

  function cleanup(): void {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    stopStream(screenStreamRef.current);
    stopStream(camStreamRef.current);
    stopStream(composedStreamRef.current);
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
      }

      if (res.status === "error") {
        clearInterval(interval);
        setStatus("error");
      }
    }, 2000);
  }

  /* ===============================
     UI
  =============================== */

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h2>Screen Recorder (TSX)</h2>

      <select
        disabled={isRecording}
        value={mode}
        onChange={(e) => setMode(e.target.value as Mode)}
      >
        {MODES.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>

      <label style={{ marginLeft: 12 }}>
        <input
          type="checkbox"
          checked={systemAudio}
          onChange={(e) => setSystemAudio(e.target.checked)}
        />
        System Audio
      </label>

      <div style={{ marginTop: 12 }}>
        {!isRecording ? (
          <button onClick={start}>Start</button>
        ) : (
          <button onClick={stop}>Stop</button>
        )}
      </div>

      <p>Status: {status}</p>
      {error && <p style={{ color: "red" }}>{error}</p>}

      {downloadUrl && (
        <a href={downloadUrl} target="_blank">
          MP4 Download
        </a>
      )}

      {/* hidden */}
      <video ref={screenVideoRef} style={{ display: "none" }} />
      <video ref={camVideoRef} style={{ display: "none" }} />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* preview */}
      <video
        ref={previewRef}
        style={{ width: "100%", marginTop: 20 }}
        playsInline
      />
    </div>
  );
}
