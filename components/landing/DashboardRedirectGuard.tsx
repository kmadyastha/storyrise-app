"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app-context";
import { createClient } from "@/lib/supabase/client";

/** Renders nothing — just checks, once auth has resolved, whether this
 * logged-in user already has at least one book, and if so redirects
 * straight to the dashboard. A brief flash of the marketing page before the
 * redirect fires is a known, accepted tradeoff — a fully instant redirect
 * would need this check done at the middleware/edge level instead of
 * client-side, which is a bigger change than this deserves right now. */
export default function DashboardRedirectGuard() {
  const router = useRouter();
  const { loggedIn, user, authLoading } = useApp();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (authLoading || checked) return;
    if (!loggedIn || !user) {
      queueMicrotask(() => setChecked(true));
      return;
    }
    (async () => {
      const supabase = createClient();
      const { count } = await supabase.from("books").select("id", { count: "exact", head: true }).eq("user_id", user.id);
      if ((count ?? 0) > 0) {
        router.replace("/dashboard");
      } else {
        setChecked(true);
      }
    })();
  }, [authLoading, loggedIn, user, checked, router]);

  return null;
}