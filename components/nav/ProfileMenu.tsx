"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app-context";
import { Sparkles, BookOpen, User, LogOut } from "lucide-react";

const tierLabel: Record<string, string> = {
  none: "Free",
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
  pro_max: "Pro Max",
};

export default function ProfileMenu() {
  const { tier, credits, openUpgradeModal, setLoggedIn, setTier } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const logOut = () => {
    setOpen(false);
    setLoggedIn(false);
    setTier("none");
    router.push("/");
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 rounded-full bg-[#1a1a1a] text-white grid place-items-center text-sm font-semibold shrink-0"
        aria-label="Account menu"
      >
        K
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-64 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-black/[0.06] overflow-hidden z-50">
          <div className="p-4 border-b border-black/[0.06]">
            <p className="text-xs text-ink-soft mb-1">Signed in as</p>
            <p className="text-sm font-fredoka font-semibold text-[#1a1a1a]">
              {tierLabel[tier]} plan · {credits} credits
            </p>
          </div>
          <div className="p-2">
            <button
              onClick={() => {
                setOpen(false);
                openUpgradeModal();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-[#1a1a1a] hover:bg-teal-tint transition-colors"
            >
              <Sparkles size={16} className="text-teal-text" />
              {tier === "none" ? "Upgrade" : "Manage subscription"}
            </button>
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-[#1a1a1a] hover:bg-teal-tint transition-colors"
            >
              <BookOpen size={16} className="text-teal-text" />
              My books
            </Link>
            <Link
              href="/account"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-[#1a1a1a] hover:bg-teal-tint transition-colors"
            >
              <User size={16} className="text-teal-text" />
              Account settings
            </Link>
          </div>
          <div className="p-2 border-t border-black/[0.06]">
            <button
              onClick={logOut}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-[#a33] hover:bg-red-50 transition-colors"
            >
              <LogOut size={16} />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}