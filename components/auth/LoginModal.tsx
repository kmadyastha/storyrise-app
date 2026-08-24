"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "@/lib/app-context";
import { createClient } from "@/lib/supabase/client";
import { X, Mail, Sparkles, AlertCircle } from "lucide-react";

export default function LoginModal() {
  const { loginModalOpen, closeLoginModal, loggedIn } = useApp();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // If sign-in completes in another tab (the user clicked the emailed link
  // there), this tab's session updates automatically via Supabase's
  // onAuthStateChange — pick that up and close the modal here too.
  useEffect(() => {
    if (loggedIn && loginModalOpen) {
      queueMicrotask(() => {
        closeLoginModal();
        setSent(false);
        router.push("/create");
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);

  if (!loginModalOpen) return null;

  const close = () => {
    closeLoginModal();
    setTimeout(() => {
      setSent(false);
      setError(null);
    }, 300);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setSending(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setSent(true);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[95] bg-ink/40 backdrop-blur-sm grid place-items-center px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={close}
      >
        <motion.div
          className="bg-white rounded-[28px] w-full max-w-3xl overflow-hidden grid md:grid-cols-2 shadow-2xl max-h-[90vh]"
          initial={{ scale: 0.94, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Left panel — same teal blob + Dav's photo treatment as the hero's first slide */}
          <div
            className="hidden md:flex relative flex-col justify-end p-8 overflow-hidden"
            style={{ background: "#E8FAFB" }}
          >
            <svg
              className="absolute pointer-events-none"
              style={{ width: "150%", height: "150%", right: "-30%", top: "-20%" }}
              viewBox="0 0 500 500"
              preserveAspectRatio="xMidYMid slice"
            >
              <defs>
                <linearGradient id="login-blob" x1="10%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00BCC8" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#00838A" stopOpacity="0.75" />
                </linearGradient>
              </defs>
              <path
                d="M250,40 C360,30 460,110 470,230 C480,350 400,430 290,460 C180,490 60,450 30,340 C0,230 40,110 140,60 C170,45 210,45 250,40 Z"
                fill="url(#login-blob)"
              />
            </svg>
            <div className="relative z-[2]">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide uppercase bg-white/90 text-teal-text rounded-full px-3 py-1.5 mb-4">
                <Sparkles size={12} /> Any Idea Becomes a Story
              </span>
              <h2 className="font-fredoka font-bold text-[32px] leading-[1.1] text-[#1a1a1a] mb-6">
                Turn any idea into a <span className="text-teal-text">storybook</span>
              </h2>
              <img
                src="/kid2.png"
                alt="Child holding a personalized AI-generated storybook"
                className="w-full max-w-[240px] mx-auto h-auto drop-shadow-[0_20px_40px_rgba(0,0,0,0.15)]"
              />
            </div>
          </div>

          {/* Right panel — email + magic link */}
          <div className="p-8 sm:p-10 flex flex-col justify-center relative">
            <button
              onClick={close}
              className="absolute top-5 right-5 text-ink-soft hover:text-ink"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            <span className="grid place-items-center w-10 h-10 rounded-full bg-teal text-white mb-6">
              <Sparkles size={18} />
            </span>
            <h3 className="font-fredoka font-bold text-2xl text-[#1a1a1a] mb-2">Welcome to StoryRise</h3>
            <p className="text-sm font-medium text-[#5a5a5a] mb-7">
              No password to remember — we&rsquo;ll email you a magic link.
            </p>

            {sent ? (
              <div className="bg-teal-tint border border-teal/20 rounded-2xl p-4 text-sm">
                <p className="font-fredoka font-semibold mb-1">Check your inbox</p>
                <p className="text-[#5a5a5a]">
                  We sent a real sign-in link to <strong>{email}</strong>. Click it to finish logging in — this tab
                  will pick up automatically once you do.
                </p>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="text-sm font-semibold mb-1.5 block text-[#1a1a1a]">Email address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-line text-sm focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full bg-[#1a1a1a] text-white py-3.5 rounded-full font-fredoka font-semibold text-[15px] cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {sending ? "Sending…" : "Send magic link"}
                </button>
              </form>
            )}

            <p className="text-xs text-ink-soft mt-8">
              By continuing you agree to StoryRise&rsquo;s Terms of Service and Privacy Policy.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}