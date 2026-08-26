export interface RenderPage {
  pageNumber: number;
  imageUrl?: string | null;
  audioUrl?: string | null;
  narration?: string | null;
}

export type RenderJobType = "video_narrated" | "video_silent" | "audiobook";

export interface RenderResult {
  ok: boolean;
  bytes?: Buffer;
  contentType?: string;
  error?: string;
}

/** Sends a render job (narrated video, silent video, or audiobook) to the
 * Fly.io worker and returns the finished file's bytes. Cold starts and real
 * encode time (especially for video) mean this can genuinely take a couple
 * of minutes — the caller's own maxDuration needs real headroom, not just
 * enough for a network round trip. */
export async function renderViaWorker(bookId: string, jobType: RenderJobType, pages: RenderPage[]): Promise<RenderResult> {
  const url = process.env.FLY_WORKER_URL;
  const secret = process.env.WORKER_SECRET;
  if (!url) return { ok: false, error: "Video rendering isn't configured yet (FLY_WORKER_URL isn't set)." };
  if (!secret) return { ok: false, error: "Video rendering isn't configured yet (WORKER_SECRET isn't set)." };

  try {
    const res = await fetch(`${url}/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
      body: JSON.stringify({ bookId, jobType, pages }),
      // 280s — real headroom for a cold-starting machine plus genuine
      // multi-page encode time, while staying under the calling route's own
      // maxDuration (set to 290s to match).
      signal: AbortSignal.timeout(280000),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data.error || `Rendering failed (worker returned ${res.status}).` };
    }

    const contentType = res.headers.get("content-type") ?? (jobType === "audiobook" ? "audio/mpeg" : "video/mp4");
    const arrayBuffer = await res.arrayBuffer();
    return { ok: true, bytes: Buffer.from(arrayBuffer), contentType };
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      return { ok: false, error: "Rendering took too long and was cut off — please try again, or try a shorter book." };
    }
    return { ok: false, error: err instanceof Error ? err.message : "Request to the render worker failed." };
  }
}

export interface WorkerHealth {
  reachable: boolean;
  status?: string;
  ffmpeg?: boolean;
  ffmpegVersion?: string;
  error?: string;
}

/** Pings the Fly.io worker's /health endpoint. Used by
 * /api/admin/worker-health so reachability can be verified from inside the
 * app itself, not just via a manual `curl` from the terminal. */
export async function pingVideoWorker(): Promise<WorkerHealth> {
  const url = process.env.FLY_WORKER_URL;
  if (!url) {
    return { reachable: false, error: "FLY_WORKER_URL isn't set" };
  }

  try {
    // 20s, not 8s — the worker's machine auto-stops when idle to keep cost
    // near zero, so the first ping after a quiet period has to wait for a
    // real Fly.io cold start (boot the VM, start the container), not just a
    // network round trip. A short timeout here reads as "unreachable" when
    // the worker is actually just waking up.
    const res = await fetch(`${url}/health`, { cache: "no-store", signal: AbortSignal.timeout(20000) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { reachable: false, error: data.error || `Worker returned ${res.status}` };
    }
    return { reachable: true, status: data.status, ffmpeg: data.ffmpeg, ffmpegVersion: data.ffmpegVersion };
  } catch (err) {
    return { reachable: false, error: err instanceof Error ? err.message : "Request to worker failed" };
  }
}