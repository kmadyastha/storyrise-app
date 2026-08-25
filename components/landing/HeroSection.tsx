"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/app-context";

interface HeroSlide {
  theme: "teal" | "lime" | "green" | "tangerine";
  label: string;
  headline: string;
  subtext: string;
  image: string;
}

const heroData: HeroSlide[] = [
  {
    theme: "teal",
    label: "Any Idea Becomes a Story",
    headline: 'Turn any idea<br>into a <span class="text-teal">storybook</span>',
    subtext:
      "Pick a genre and age group — StoryRise writes and illustrates it, with characters that stay consistent throughout.",
    image: "/kid2.png",
  },
  {
    theme: "lime",
    label: "Every Character, Every Page",
    headline: 'Characters that stay<br><span class="text-lime-text">consistent</span>',
    subtext: "Not just one hero — your whole cast, recognizable in every scene, on every single page of the book.",
    image: "/kid1.png",
  },
  {
    theme: "green",
    label: "Print It, Sell It, Keep It",
    headline: 'Export as <span class="text-green">PDF</span> &<br><span class="text-green">KDP-ready</span> books',
    subtext: "Export a print-ready PDF or a real KDP file with correct trim size and spine — ready for Amazon or Etsy.",
    image: "/kid4.png",
  },
  {
    theme: "tangerine",
    label: "Watch It Come Alive",
    headline: 'Narrated <span class="text-tangerine">video</span>,<br>straight from your story',
    subtext: "Every page voiced, every scene animated — a shareable 16:9 video, ready for YouTube or Instagram.",
    image: "/kid3.png",
  },
];

const bgColors: Record<string, string> = {
  teal: "#E8FAFB",
  lime: "#F8FFDB",
  green: "#E5F9EF",
  tangerine: "#FFF0E6",
};

const labelClasses: Record<string, string> = {
  teal: "bg-teal-tint text-teal-text",
  lime: "bg-lime-tint text-lime-text",
  green: "bg-green-tint text-green-text",
  tangerine: "bg-tangerine-tint text-tangerine-text",
};

const blobColors: Record<string, [string, string]> = {
  teal: ["#00BCC8", "#00838A"],
  lime: ["#D0FF00", "#8FA300"],
  green: ["#1DC27A", "#0F8A57"],
  tangerine: ["#FF6A1F", "#E8590C"],
};

const CYCLE_MS = 2000;

export default function HeroSection() {
  const { loggedIn, openLoginModal } = useApp();
  const [activeIndex, setActiveIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCycle = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setActiveIndex((i) => (i + 1) % heroData.length);
    }, CYCLE_MS);
  };

  const stopCycle = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  useEffect(() => {
    startCycle();
    return stopCycle;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--current-hero-bg", bgColors[heroData[activeIndex].theme]);
  }, [activeIndex]);

  const goToSlide = (index: number) => {
    stopCycle();
    setActiveIndex(index);
    startCycle();
  };

  const current = heroData[activeIndex];

  return (
    <section
      className="pt-10 pb-16 px-10 flex items-center justify-center relative overflow-hidden transition-colors duration-[1800ms]"
      style={{ backgroundColor: bgColors[current.theme] }}
    >
      <div
        className="bg-warm-white rounded-[32px] w-full max-w-[1360px] min-h-[720px] relative overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.04)] flex flex-col"
        onMouseEnter={stopCycle}
        onMouseLeave={startCycle}
      >
        <div className="flex flex-1 relative px-[60px] py-[50px] gap-[30px] items-center shrink-0 max-md:flex-col max-md:px-10 max-md:py-10 max-md:text-center">
          {/* Left Content — all 4 slides stacked, opacity-crossfaded in perfect sync with the image */}
          <div className="flex-[0.9] z-[2] relative max-md:order-2 min-h-[280px]">
            {heroData.map((slide, i) => (
              <div
                key={slide.theme}
                className={`transition-opacity duration-500 ease-in-out ${
                  i === activeIndex ? "opacity-100 relative" : "opacity-0 absolute inset-0 pointer-events-none"
                }`}
              >
                <div className={`inline-block px-4 py-1.5 rounded-full text-[13px] font-semibold tracking-wide uppercase mb-5 ${labelClasses[slide.theme]}`}>
                  {slide.label}
                </div>

                <h1
                  className="font-fredoka font-bold text-[72px] leading-[1.05] text-[#1a1a1a] mb-5 max-md:text-[48px] max-sm:text-[34px]"
                  dangerouslySetInnerHTML={{ __html: slide.headline }}
                />

                <p className="text-[18px] font-medium leading-[1.65] text-[#5a5a5a] mb-8 max-w-[440px] max-md:mx-auto max-sm:text-base">
                  {slide.subtext}
                </p>
              </div>
            ))}

            <div className="flex gap-4 items-center max-md:flex-col max-md:w-full">
              {loggedIn ? (
                <Link href="/create" className="max-md:w-full">
                  <button className="bg-[#1a1a1a] text-white border-none px-9 py-4 rounded-full font-fredoka font-semibold text-[17px] cursor-pointer transition-all hover:-translate-y-[3px] hover:shadow-[0_12px_32px_rgba(0,0,0,0.2)] inline-flex items-center gap-2.5 max-md:w-full max-md:justify-center">
                    Create Your Story
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </Link>
              ) : (
                <button
                  onClick={openLoginModal}
                  className="bg-[#1a1a1a] text-white border-none px-9 py-4 rounded-full font-fredoka font-semibold text-[17px] cursor-pointer transition-all hover:-translate-y-[3px] hover:shadow-[0_12px_32px_rgba(0,0,0,0.2)] inline-flex items-center gap-2.5 max-md:w-full max-md:justify-center"
                >
                  Create Your Story
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              )}
              <a href="#how-it-works" className="max-md:w-full">
                <button className="bg-transparent text-[#1a1a1a] border-2 border-[#e0e0e0] px-[30px] py-3.5 rounded-full font-fredoka font-semibold text-base cursor-pointer transition-all hover:border-[#1a1a1a] hover:bg-black/[0.03] max-md:w-full">
                  See Examples
                </button>
              </a>
            </div>
          </div>

          {/* Right Image */}
          <div className="flex-[1.1] shrink-0 relative flex items-end justify-center min-h-[600px] max-md:order-1 max-md:min-h-[420px]">
            {/* bolder curvy gradient blob, ~half the card, colored per active theme */}
            <svg
              className="absolute pointer-events-none transition-opacity duration-500"
              style={{ width: "115%", height: "115%", right: "-18%", top: "-10%" }}
              viewBox="0 0 500 500"
              preserveAspectRatio="xMidYMid slice"
            >
              <defs>
                {heroData.map((slide) => (
                  <linearGradient key={slide.theme} id={`hero-blob-${slide.theme}`} x1="10%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={blobColors[slide.theme][0]} stopOpacity="0.9" />
                    <stop offset="100%" stopColor={blobColors[slide.theme][1]} stopOpacity="0.75" />
                  </linearGradient>
                ))}
              </defs>
              {heroData.map((slide, i) => (
                <path
                  key={slide.theme}
                  className="transition-opacity duration-500 ease-in-out"
                  style={{ opacity: i === activeIndex ? 1 : 0 }}
                  d="M250,40 C360,30 460,110 470,230 C480,350 400,430 290,460 C180,490 60,450 30,340 C0,230 40,110 140,60 C170,45 210,45 250,40 Z"
                  fill={`url(#hero-blob-${slide.theme})`}
                />
              ))}
            </svg>

            <div className="relative z-[2] w-full max-w-[460px] aspect-[3/4] pb-6 drop-shadow-[0_30px_60px_rgba(0,0,0,0.15)] transition-transform hover:scale-[1.02] hover:-rotate-1 max-sm:max-w-[300px]">
              {heroData.map((slide, i) => (
                <img
                  key={slide.theme}
                  src={slide.image}
                  alt="Child holding a personalized AI-generated storybook"
                  className={`absolute inset-0 w-full h-full object-cover object-bottom transition-opacity duration-500 ease-in-out ${
                    i === activeIndex ? "opacity-100" : "opacity-0"
                  }`}
                />
              ))}

              {/* Floating badges — constant across slides. The original 3 stay
                  on the right; PDF Export and Audio Book are new, on the left. */}
              <div className="absolute top-[8%] -right-5 bg-white px-[18px] py-2.5 rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.1)] font-fredoka font-semibold text-sm flex items-center gap-2 animate-float max-sm:hidden">
                <span className="w-6 h-6 rounded-full bg-teal-tint text-teal-text flex items-center justify-center text-xs">✦</span>
                AI Generated
              </div>
              <div
                className="absolute top-[42%] -right-[30px] bg-white px-[18px] py-2.5 rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.1)] font-fredoka font-semibold text-sm flex items-center gap-2 animate-float max-sm:hidden"
                style={{ animationDelay: "1s" }}
              >
                <span className="w-6 h-6 rounded-full bg-tangerine-tint text-tangerine-text flex items-center justify-center text-xs">★</span>
                KDP Ready
              </div>
              <div
                className="absolute bottom-[20%] -right-5 bg-white px-[18px] py-2.5 rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.1)] font-fredoka font-semibold text-sm flex items-center gap-2 animate-float max-sm:hidden"
                style={{ animationDelay: "2s" }}
              >
                <span className="w-6 h-6 rounded-full bg-green-tint text-green-text flex items-center justify-center text-xs">▶</span>
                Video Export
              </div>

              <div
                className="absolute top-[16%] -left-6 bg-white px-[18px] py-2.5 rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.1)] font-fredoka font-semibold text-sm flex items-center gap-2 animate-float max-sm:hidden"
                style={{ animationDelay: "0.6s" }}
              >
                <span className="w-6 h-6 rounded-full bg-lime-tint text-lime-text flex items-center justify-center text-xs">▤</span>
                PDF Export
              </div>
              <div
                className="absolute bottom-[28%] -left-8 bg-white px-[18px] py-2.5 rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.1)] font-fredoka font-semibold text-sm flex items-center gap-2 animate-float max-sm:hidden"
                style={{ animationDelay: "2.6s" }}
              >
                <span className="w-6 h-6 rounded-full bg-teal-tint text-teal-text flex items-center justify-center text-xs">🎧</span>
                Audio Book
              </div>
            </div>
          </div>
        </div>

        {/* Cycle dots */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2.5 z-10">
          {heroData.map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              aria-label={`Show slide ${i + 1}`}
              className={`w-2.5 h-2.5 rounded-full cursor-pointer transition-all border-2 border-transparent ${
                i === activeIndex ? "bg-[#1a1a1a] scale-[1.3]" : "bg-[#ddd] hover:bg-[#999]"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}