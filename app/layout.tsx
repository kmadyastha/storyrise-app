import type { Metadata } from "next";
import "@fontsource/fredoka/500.css";
import "@fontsource/fredoka/600.css";
import "@fontsource/fredoka/700.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "./globals.css";
import { AppProvider } from "@/lib/app-context";
import Navbar from "@/components/nav/Navbar";
import ProCelebration from "@/components/celebration/ProCelebration";
import UpgradeModal from "@/components/paywall/UpgradeModal";
import LoginModal from "@/components/auth/LoginModal";

export const metadata: Metadata = {
  title: "StoryRise — Personalized storybooks, illustrated and alive",
  description:
    "Turn any idea into a personalized, illustrated storybook — with characters that stay consistent, cover to cover. Export as a book, a KDP-ready print file, or a narrated video.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-paper text-ink antialiased">
        <AppProvider>
          <Navbar />
          <div className="flex-1">{children}</div>
          <ProCelebration />
          <UpgradeModal />
          <LoginModal />
        </AppProvider>
      </body>
    </html>
  );
}