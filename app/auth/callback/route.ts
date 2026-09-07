import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // If the caller specified where to go (e.g. someone was mid-flow
      // creating a book when their session lapsed), honor that. Otherwise,
      // a returning user with existing books goes straight to their
      // dashboard — checked here, server-side, so this is a genuinely
      // instant redirect with no client-side flash of the marketing page.
      let destination = next;
      if (!destination) {
        const { count } = await supabase.from("books").select("id", { count: "exact", head: true }).eq("user_id", data.user.id);
        destination = (count ?? 0) > 0 ? "/dashboard" : "/create";
      }
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  // Link was invalid or expired — send them back to try again.
  return NextResponse.redirect(`${origin}/?login_error=1`);
}