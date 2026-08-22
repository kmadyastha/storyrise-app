"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import IllustrationPlaceholder from "@/components/ui/IllustrationPlaceholder";
import { useApp } from "@/lib/app-context";
import { Mail, BookOpen } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const { setLoggedIn } = useApp();
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => {
      setLoggedIn(true);
      router.push("/dashboard");
    }, 900);
  };

  return (
    <section className="bg-collage min-h-[calc(100vh-64px)] grid place-items-center px-5 py-16">
      <div className="w-full max-w-4xl grid md:grid-cols-2 rounded-[28px] overflow-hidden shadow-sm border border-line bg-white">
        <div className="hidden md:block relative">
          <IllustrationPlaceholder color="teal" seed={7} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-teal/10" />
        </div>
        <div className="p-8 sm:p-12 flex flex-col justify-center">
          <span className="grid place-items-center w-9 h-9 rounded-full bg-teal text-white mb-6">
            <BookOpen size={18} />
          </span>
          <h1 className="font-display text-2xl font-semibold mb-2">Welcome to StoryRise</h1>
          <p className="text-sm text-ink-soft mb-7">
            No password to remember — we&rsquo;ll email you a magic link.
          </p>

          {sent ? (
            <Card className="bg-teal-tint border-teal/20 text-sm">
              <p className="font-medium mb-1">Check your inbox</p>
              <p className="text-ink-soft">We sent a link to {email || "your email"}. (Preview: signing you in automatically…)</p>
            </Card>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Email address</label>
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
              <Button type="submit" className="w-full" size="lg">
                Send magic link
              </Button>
            </form>
          )}

          <p className="text-xs text-ink-soft mt-8">
            By continuing you agree to StoryRise&rsquo;s Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </section>
  );
}
