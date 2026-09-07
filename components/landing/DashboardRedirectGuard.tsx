"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app-context";
import { createClient } from "@/lib/supabase/client";

const JUST_SIGNED_IN_KEY = "storyrise_just_signed_in";

/** Renders nothing — redirects a user who just genuinely signed in (not one
 * who's browsing the marketing page while already logged in, e.g. via a
 * nav link) straight to their dashboard if they already have books.
 *
 * Gated on a one-time sessionStorage flag set only by a real SIGNED_IN auth
 * event (see app-context.tsx) — without this, the check ran on every
 * marketing-page render for any logged-in user, which was both slow (a
 * multi-second flash before redirecting) and actively wrong: clicking
 * Features/Pricing from inside the app while already logged in would get
 * silently yanked back to /dashboard mid-scroll. */
export default function DashboardRedirectGuard() {
  const router = useRouter();
  const { loggedIn, user, authLoading } = useApp();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (authLoading || checked) return;

    const flagValue = typeof window !== "undefined" ? sessionStorage.getItem(JUST_SIGNED_IN_KEY) : null;
    const justSignedIn = flagValue && Date.now() - Number(flagValue) < 15000;
    if (!justSignedIn) {
      if (flagValue) sessionStorage.removeItem(JUST_SIGNED_IN_KEY); // stale — clean it up
      queueMicrotask(() => setChecked(true));
      return;
    }

    if (!loggedIn || !user) {
      sessionStorage.removeItem(JUST_SIGNED_IN_KEY);
      queueMicrotask(() => setChecked(true));
      return;
    }

    (async () => {
      const supabase = createClient();
      const { count } = await supabase.from("books").select("id", { count: "exact", head: true }).eq("user_id", user.id);
      // Consumed here regardless of outcome — this redirect should only
      // ever fire once per sign-in, never again for the rest of the session.
      sessionStorage.removeItem(JUST_SIGNED_IN_KEY);
      if ((count ?? 0) > 0) {
        router.replace("/dashboard");
      } else {
        setChecked(true);
      }
    })();
  }, [authLoading, loggedIn, user, checked, router]);

  return null;
}