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
 * Fly.io worker and returns the finished file's bytes.
 *
 * This kicks the job off, then polls for status, then fetches the result —
 * three separate short requests, not one long-held one. That's not just a
 * style choice: Fly's own proxy silently kills any connection that goes
 * 60 seconds without data flowing over it, regardless of any timeout set
 * in this code or the calling Vercel route. A single request that stays
 * open in silence for the full multi-page render time was never going to
 * survive that, no matter how the timeouts were tuned. Polling requests
 * are each fast enough that none of them ever sit idle that long. */
export async function renderViaWorker(bookId: string, jobType: RenderJobType, pages: RenderPage[]): Promise<RenderResult> {
  const url = process.env.FLY_WORKER_URL;
  const secret = process.env.WORKER_SECRET;
  if (!url) return { ok: false, error: "Video rendering isn't configured yet (FLY_WORKER_URL isn't set)." };
  if (!secret) return { ok: false, error: "Video rendering isn't configured yet (WORKER_SECRET isn't set)." };

  const authHeaders = { Authorization: `Bearer ${secret}` };

  let jobId: string;
  try {
    const kickoff = await fetch(`${url}/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ bookId, jobType, pages }),
      // 45s, not 20s — a Fly.io machine that's scaled to zero when idle can
      // take real time to cold-start before it can even accept this first
      // request, and 20s wasn't giving genuine headroom for that.
      signal: AbortSignal.timeout(45000),
    });
    if (!kickoff.ok) {
      const data = await kickoff.json().catch(() => ({}));
      return { ok: false, error: data.error || `Couldn't start rendering (worker returned ${kickoff.status}).` };
    }
    const data = await kickoff.json();
    jobId = data.jobId;
  } catch (err) {
    // A raw AbortSignal timeout throws a browser-native TimeoutError whose
    // .message ("The operation was aborted due to timeout" or similar) was
    // leaking straight through to the user instead of a real explanation.
    const isTimeout = err instanceof Error && err.name === "TimeoutError";
    return {
      ok: false,
      error: isTimeout
        ? "The render service is starting up — please try again in a moment."
        : "Couldn't reach the render worker — please try again.",
    };
  }

  // Poll every 3s for up to ~270s total — real headroom for a cold-starting
  // machine plus genuine multi-page encode time, while staying under the
  // calling route's own maxDuration (set to 290s to match).
  const deadline = Date.now() + 270000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));

    let statusData: { status?: string; error?: string };
    try {
      const statusRes = await fetch(`${url}/render/${jobId}/status`, { headers: authHeaders, signal: AbortSignal.timeout(15000) });
      statusData = await statusRes.json().catch(() => ({}));
      if (!statusRes.ok) {
        return { ok: false, error: statusData.error || "Lost track of the render job (it may have expired)." };
      }
    } catch {
      // A single flaky poll shouldn't fail the whole render — just try again.
      continue;
    }

    if (statusData.status === "error") {
      return { ok: false, error: statusData.error || "Rendering failed" };
    }
    if (statusData.status === "done") {
      try {
        const resultRes = await fetch(`${url}/render/${jobId}/result`, { headers: authHeaders, signal: AbortSignal.timeout(60000) });
        if (!resultRes.ok) {
          const data = await resultRes.json().catch(() => ({}));
          return { ok: false, error: data.error || "Rendering finished but the file couldn't be fetched." };
        }
        const contentType = resultRes.headers.get("content-type") ?? (jobType === "audiobook" ? "audio/mpeg" : "video/mp4");
        const arrayBuffer = await resultRes.arrayBuffer();
        return { ok: true, bytes: Buffer.from(arrayBuffer), contentType };
      } catch (err) {
        const isTimeout = err instanceof Error && err.name === "TimeoutError";
        return { ok: false, error: isTimeout ? "Fetching the rendered file took too long — please try again." : "Couldn't fetch the rendered file." };
      }
    }
    // else still "processing" — keep polling
  }

  return { ok: false, error: "Rendering took too long and was cut off — please try again, or try a shorter book." };
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