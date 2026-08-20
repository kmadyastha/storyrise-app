"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/lib/app-context";
import Button from "@/components/ui/Button";
import { Sparkles, BookOpen, Menu } from "lucide-react";
import { useState } from "react";

const tierLabel: Record<string, string> = {
  none: "Free",
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
  pro_max: "Pro Max",
};

export default function TopNav() {
  const { loggedIn, tier, credits, openUpgradeModal, setLoggedIn } = useApp();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { href: "/#features", label: "How it works" },
    { href: "/pricing", label: "Pricing" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-ink text-white shadow-[0_2px_20px_rgba(0,0,0,0.15)]">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 h-[68px] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <span className="grid place-items-center w-9 h-9 rounded-full bg-teal text-white shadow-[0_0_0_4px_rgba(0,188,200,0.18)]">
            <BookOpen size={18} strokeWidth={2.4} />
          </span>
          <span className="font-display font-semibold text-lg tracking-tight">StoryRise</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 text-sm text-white/70">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-2 rounded-full hover:bg-white/10 hover:text-white transition-colors ${
                pathname === l.href ? "text-white bg-white/10 font-medium" : ""
              }`}
            >
              {l.label}
            </Link>
          ))}
          {loggedIn && (
            <Link
              href="/dashboard"
              className={`px-3 py-2 rounded-full hover:bg-white/10 hover:text-white transition-colors ${
                pathname === "/dashboard" ? "text-white bg-white/10 font-medium" : ""
              }`}
            >
              My books
            </Link>
          )}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {loggedIn ? (
            <>
              <span className="text-xs text-white bg-white/10 rounded-full px-3 py-1.5 font-medium border border-white/10">
                {tierLabel[tier]} · {credits} credits
              </span>
              {tier === "none" && (
                <Button size="sm" onClick={openUpgradeModal} className="shadow-[0_4px_14px_rgba(0,188,200,0.35)]">
                  <Sparkles size={15} /> Upgrade
                </Button>
              )}
              <Link href="/create">
                <Button
                  size="sm"
                  variant={tier === "none" ? "secondary" : "primary"}
                  className={tier === "none" ? "!bg-white/10 !text-white !border-white/20 hover:!bg-white/20" : "shadow-[0_4px_14px_rgba(0,188,200,0.35)]"}
                >
                  New story
                </Button>
              </Link>
              <Link
                href="/account"
                className="w-9 h-9 rounded-full bg-white text-ink grid place-items-center text-sm font-semibold"
                title="Account"
              >
                K
              </Link>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button size="sm" variant="secondary" className="!bg-white/10 !text-white !border-white/20 hover:!bg-white/20">
                  Log in
                </Button>
              </Link>
              <Link href="/login">
                <Button size="sm" className="shadow-[0_4px_14px_rgba(0,188,200,0.35)]">Get started free</Button>
              </Link>
            </>
          )}
        </div>

        <button
          className="md:hidden p-2 text-white"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <Menu size={22} />
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-ink px-5 py-4 flex flex-col gap-3 text-sm text-white/85">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className="py-1">
              {l.label}
            </Link>
          ))}
          {loggedIn ? (
            <>
              <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="py-1">
                My books
              </Link>
              <Link href="/account" onClick={() => setMobileOpen(false)} className="py-1">
                Account
              </Link>
              <Link href="/create" onClick={() => setMobileOpen(false)}>
                <Button size="sm" className="w-full">New story</Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setMobileOpen(false)}>
                <Button size="sm" variant="secondary" className="w-full !bg-white/10 !text-white !border-white/20">Log in</Button>
              </Link>
              <Link href="/login" onClick={() => setMobileOpen(false)}>
                <Button size="sm" className="w-full">Get started free</Button>
              </Link>
            </>
          )}
          <button
            className="text-left text-xs text-white/50 pt-2 border-t border-white/10 mt-1"
            onClick={() => {
              setLoggedIn(!loggedIn);
              setMobileOpen(false);
            }}
          >
            (demo) toggle logged {loggedIn ? "out" : "in"}
          </button>
        </div>
      )}
    </header>
  );
}
