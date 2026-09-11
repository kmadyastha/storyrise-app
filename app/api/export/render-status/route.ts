import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRenderJobStatus } from "@/lib/videoWorker";

// Deliberately short — this gets called repeatedly by the browser every
// few seconds while a render is in progress. Each call should be fast.
export const maxDuration = 20;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const result = await checkRenderJobStatus(jobId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error || "Couldn't check render status" }, { status: 502 });
  }

  return NextResponse.json({ status: result.status });
}
