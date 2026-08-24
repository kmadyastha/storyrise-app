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
    const res = await fetch(`${url}/health`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { reachable: false, error: data.error || `Worker returned ${res.status}` };
    }
    return { reachable: true, status: data.status, ffmpeg: data.ffmpeg, ffmpegVersion: data.ffmpegVersion };
  } catch (err) {
    return { reachable: false, error: err instanceof Error ? err.message : "Request to worker failed" };
  }
}