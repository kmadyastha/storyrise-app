"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/app-context";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { loggedIn, tier, credits, openUpgradeModal } = useApp();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-[1000] flex items-center justify-between px-10 py-4 transition-all duration-400 ${
        scrolled ? "bg-warm-white/92 backdrop-blur-xl shadow-[0_2px_40px_rgba(0,0,0,0.06)] py-3" : ""
      }`}
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
            href={link.href}
            className="relative text-[15px] font-medium text-[#555] no-underline transition-colors hover:text-teal-text after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-teal after:rounded-sm after:transition-all hover:after:w-full"
          >
            {link.label}
          </a>
        ))}
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
        {loggedIn && (
          <span className="hidden sm:inline-flex text-xs font-medium text-[#555] bg-teal-tint text-teal-text rounded-full px-3 py-1.5">
            {tier === "none" ? "Free" : tier} · {credits} credits
          </span>
        )}
        {loggedIn && tier === "none" && (
          <button
            onClick={openUpgradeModal}
            className="hidden sm:inline text-[15px] font-fredoka font-semibold text-teal-text hover:opacity-80"
          >
            Upgrade
          </button>
        )}
        <Link href={loggedIn ? "/create" : "/login"}>
          <button className="bg-teal text-white border-none px-6 py-2.5 rounded-full font-fredoka font-semibold text-[15px] cursor-pointer transition-all hover:bg-teal-text hover:-translate-y-0.5 shadow-[0_4px_16px_rgba(0,188,200,0.3)] hover:shadow-[0_6px_24px_rgba(0,188,200,0.4)]">
            Start Creating
          </button>
        </Link>
      </div>
    </nav>
  );
}
