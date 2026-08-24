"use client";

import Link from "next/link";
import { useApp } from "@/lib/app-context";

export default function CTASection() {
  const { loggedIn, openLoginModal } = useApp();

  const button = (
    <button className="bg-white text-teal-text px-9 py-4 rounded-full font-fredoka font-semibold text-[17px] cursor-pointer transition-all hover:-translate-y-[3px] hover:shadow-[0_12px_32px_rgba(0,0,0,0.2)] inline-flex items-center gap-2.5">
      Create Free Storybook
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    </button>
  );

  return (
    <section className="px-10 pb-[100px]">
      <div className="max-w-[1000px] mx-auto bg-teal rounded-[40px] px-10 sm:px-16 py-[70px] relative overflow-hidden">
        <div className="grid md:grid-cols-[1.2fr_1fr] gap-8 items-center">
          <div className="text-center md:text-left">
            <h2 className="font-fredoka font-bold text-4xl text-white mb-3 max-sm:text-[28px]">
              Ready to create your first story?
            </h2>
            <p className="text-lg text-white/85 mb-8">Start with a free 6-page trial. No credit card required.</p>
            <div className="flex justify-center md:justify-start">
              {loggedIn ? <Link href="/create">{button}</Link> : <span onClick={openLoginModal}>{button}</span>}
            </div>
          </div>

          <div className="relative hidden md:block">
            <img
              src="/book-collage.png"
              alt="A shelf of personalized StoryRise storybooks"
              className="w-full h-auto max-w-[340px] mx-auto drop-shadow-[0_20px_50px_rgba(0,0,0,0.25)] rounded-2xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
}