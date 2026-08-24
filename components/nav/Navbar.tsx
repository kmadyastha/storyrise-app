"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useApp } from "@/lib/app-context";
import ProfileMenu from "@/components/nav/ProfileMenu";
import { ChevronDown, ArrowRight, LayoutGrid } from "lucide-react";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const { loggedIn, tier, credits, openUpgradeModal, openLoginModal } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === "/";
  const pricingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (pricingRef.current && !pricingRef.current.contains(e.target as Node)) setPricingOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const goToPricingSection = () => {
    setPricingOpen(false);
    if (isHome) {
      document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
    } else {
      router.push("/#pricing");
    }
  };

  return (
    <nav
      className={`sticky top-0 left-0 right-0 z-[1000] flex items-center justify-between px-10 py-4 transition-all duration-[900ms] ${
        scrolled ? "shadow-[0_2px_30px_rgba(0,0,0,0.06)] py-3" : ""
      }`}
      style={{ backgroundColor: "var(--current-hero-bg)" }}
    >
      <Link href="/" className="flex items-center gap-2 font-fredoka font-bold text-[26px] text-teal-text no-underline">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path d="M16 2L4 9V23L16 30L28 23V9L16 2Z" fill="#00BCC8" opacity="0.2" />
          <path d="M16 2L4 9V23L16 30L28 23V9L16 2Z" stroke="#00BCC8" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M16 8V24M10 12V20M22 12V20" stroke="#00838A" strokeWidth="2" strokeLinecap="round" />
        </svg>
        StoryRise
      </Link>

      <div className="hidden md:flex items-center gap-9">
        {navLinks.map((link) => (
          <a
            key={link.label}
            href={isHome ? link.href : `/${link.href}`}
            className="relative text-[15px] font-medium text-[#555] no-underline transition-colors hover:text-teal-text after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-teal after:rounded-sm after:transition-all hover:after:w-full"
          >
            {link.label}
          </a>
        ))}

        {/* Pricing dropdown — plain click scrolls to the landing pricing
            section, "Compare all plans" jumps to the dedicated page */}
        <div className="relative" ref={pricingRef}>
          <button
            type="button"
            onClick={() => setPricingOpen((v) => !v)}
            className="relative inline-flex items-center gap-1 text-[15px] font-medium text-[#555] transition-colors hover:text-teal-text"
          >
            Pricing
            <ChevronDown size={14} className={`transition-transform ${pricingOpen ? "rotate-180" : ""}`} />
          </button>

          {pricingOpen && (
            <div className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+12px)] w-64 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-black/[0.06] overflow-hidden z-50">
              <button
                onClick={goToPricingSection}
                className="w-full flex items-start gap-2.5 px-4 py-3 text-left hover:bg-teal-tint transition-colors"
              >
                <ArrowRight size={15} className="text-teal-text shrink-0 mt-0.5" />
                <span>
                  <span className="block text-sm font-medium text-[#1a1a1a]">Pricing</span>
                  <span className="block text-xs text-ink-soft">Jump to plans on this page</span>
                </span>
              </button>
              <Link
                href="/pricing"
                onClick={() => setPricingOpen(false)}
                className="w-full flex items-start gap-2.5 px-4 py-3 text-left hover:bg-teal-tint transition-colors border-t border-line"
              >
                <LayoutGrid size={15} className="text-teal-text shrink-0 mt-0.5" />
                <span>
                  <span className="block text-sm font-medium text-[#1a1a1a]">Compare all plans</span>
                  <span className="block text-xs text-ink-soft">Full detail & feature comparison</span>
                </span>
              </Link>
            </div>
          )}
        </div>

        {loggedIn && (
          <Link
            href="/dashboard"
            className="relative text-[15px] font-medium text-[#555] no-underline transition-colors hover:text-teal-text after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-teal after:rounded-sm after:transition-all hover:after:w-full"
          >
            My books
          </Link>
        )}
      </div>

      <div className="flex items-center gap-4">
        {loggedIn ? (
          <>
            <span className="hidden sm:inline-flex text-xs font-medium text-[#555] bg-teal-tint text-teal-text rounded-full px-3 py-1.5">
              {tier === "none" ? "Free" : tier} · {credits} credits
            </span>
            {tier === "none" && (
              <button
                onClick={openUpgradeModal}
                className="hidden sm:inline text-[15px] font-fredoka font-semibold text-teal-text hover:opacity-80"
              >
                Upgrade
              </button>
            )}
            <Link href="/create">
              <button className="bg-teal text-white border-none px-6 py-2.5 rounded-full font-fredoka font-semibold text-[15px] cursor-pointer transition-all hover:bg-teal-text hover:-translate-y-0.5 shadow-[0_4px_16px_rgba(0,188,200,0.3)] hover:shadow-[0_6px_24px_rgba(0,188,200,0.4)]">
                Start Creating
              </button>
            </Link>
            <ProfileMenu />
          </>
        ) : (
          <button
            onClick={openLoginModal}
            className="bg-teal text-white border-none px-6 py-2.5 rounded-full font-fredoka font-semibold text-[15px] cursor-pointer transition-all hover:bg-teal-text hover:-translate-y-0.5 shadow-[0_4px_16px_rgba(0,188,200,0.3)] hover:shadow-[0_6px_24px_rgba(0,188,200,0.4)]"
          >
            Start Creating
          </button>
        )}
      </div>
    </nav>
  );
}