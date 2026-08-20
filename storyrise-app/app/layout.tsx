import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/app-context";
import TopNav from "@/components/nav/TopNav";
import ProCelebration from "@/components/celebration/ProCelebration";
import UpgradeModal from "@/components/paywall/UpgradeModal";
import PageBackground from "@/components/ui/PageBackground";

// Loaded via <link> below rather than next/font/google so the build doesn't
// require network access to fonts.googleapis.com in every environment.
// Swap to next/font/google once this repo is running somewhere with normal
// internet access (Codespaces/Vercel) for better perf + self-hosting.

export const metadata: Metadata = {
  title: "StoryRise — Personalized storybooks, illustrated and alive",
  description:
    "Turn any idea into a personalized, illustrated storybook — with characters that stay consistent, cover to cover. Export as a book, a KDP-ready print file, or a narrated video.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-paper text-ink antialiased">
        <AppProvider>
          <PageBackground />
          <TopNav />
          <div className="flex-1">{children}</div>
          <ProCelebration />
          <UpgradeModal />
        </AppProvider>
      </body>
    </html>
  );
}
