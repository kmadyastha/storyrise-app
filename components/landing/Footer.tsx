import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#1a1a1a] text-white/70 px-10 py-10">
      <div className="max-w-[1200px] mx-auto flex items-center justify-between flex-wrap gap-4 max-sm:flex-col max-sm:text-center">
        <span className="font-fredoka font-semibold text-white text-lg">StoryRise</span>
        <div className="flex gap-6 text-sm">
          <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          <Link href="/login" className="hover:text-white transition-colors">Log in</Link>
          <a href="#" className="hover:text-white transition-colors">Contact</a>
        </div>
        <span className="text-xs text-white/40">© {new Date().getFullYear()} StoryRise. All rights reserved.</span>
      </div>
    </footer>
  );
}
