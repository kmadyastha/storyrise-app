import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pingVideoWorker } from "@/lib/videoWorker";

// Gated to any signed-in user for now — there's no admin-role system yet
// (see docs/IMPLEMENTATION_STATUS.md's known gaps). Tighten this to a real
// admin check once one exists; it's deliberately not public in the meantime.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const health = await pingVideoWorker();
  return NextResponse.json(health, { status: health.reachable ? 200 : 503 });
}