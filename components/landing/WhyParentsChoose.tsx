import { Users, ShieldCheck, BookOpen, Sparkles, Headphones } from "lucide-react";

const reasons = [
  {
    icon: Users,
    title: "Your whole cast, every page",
    desc: "Not just one hero — siblings, pets, grandparents all stay recognizable together, in the same scene.",
  },
  {
    icon: ShieldCheck,
    title: "Built for kids, from the ground up",
    desc: "No real photos of children, ever. Content policy keeps every story warm, age-appropriate, and safe.",
  },
  {
    icon: BookOpen,
    title: "A real, printable book",
    desc: "Not just a PDF — a genuine KDP-ready file with correct trim size, spine, and barcode placement.",
  },
  {
    icon: Headphones,
    title: "One story, every format",
    desc: "Book, video, or audiobook — the same story, ready however your family wants to enjoy it.",
  },
];

export default function WhyParentsChoose() {
  return (
    <section className="py-20 px-10 bg-warm-white">
      <div className="max-w-[1200px] mx-auto grid lg:grid-cols-2 gap-14 items-center">
        <div className="relative order-2 lg:order-1">
          <div className="rounded-[32px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.1)] border border-black/[0.04]">
            <img
              src="/siblings-reading.png"
              alt="Two siblings reading a personalized StoryRise book together"
              className="w-full h-auto block"
            />
          </div>
          <div className="absolute -bottom-5 -right-5 bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] px-4 py-3 flex items-center gap-2 max-sm:hidden">
            <span className="w-8 h-8 rounded-full bg-teal-tint text-teal-text grid place-items-center">
              <Sparkles size={15} />
            </span>
            <span className="font-fredoka font-semibold text-sm text-[#1a1a1a]">Made for their story</span>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <div className="inline-block px-[18px] py-1.5 bg-teal-tint text-teal-text rounded-full text-[13px] font-semibold uppercase tracking-wide mb-4">
            Why Families Choose StoryRise
          </div>
          <h2 className="font-fredoka font-bold text-4xl sm:text-5xl text-[#1a1a1a] mb-5 leading-[1.1]">
            Stories that feel like theirs
          </h2>
          <p className="text-[17px] font-medium text-[#5a5a5a] leading-relaxed mb-9 max-w-[480px]">
            Every StoryRise book is built around your family — not a template with your kid&rsquo;s name dropped in.
          </p>

          <div className="space-y-6">
            {reasons.map((r) => (
              <div key={r.title} className="flex items-start gap-4">
                <span className="w-10 h-10 rounded-xl bg-teal-tint text-teal-text grid place-items-center shrink-0">
                  <r.icon size={18} />
                </span>
                <div>
                  <div className="font-fredoka font-semibold text-base text-[#1a1a1a] mb-0.5">{r.title}</div>
                  <div className="text-sm text-[#5a5a5a] leading-relaxed">{r.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}