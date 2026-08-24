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