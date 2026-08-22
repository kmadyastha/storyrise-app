import { PenLine, Palette, BookOpen, Clapperboard } from "lucide-react";

export default function FeaturesStrip() {
  const features = [
    {
      icon: PenLine,
      title: "AI Story Writing",
      desc: "One idea becomes a full story table, narrated page by page.",
      iconBg: "bg-teal-tint",
      iconColor: "text-teal-text",
    },
    {
      icon: Palette,
      title: "Consistent Characters",
      desc: "Your hero looks the same on page 1 and page 50.",
      iconBg: "bg-lime-tint",
      iconColor: "text-lime-text",
    },
    {
      icon: BookOpen,
      title: "KDP-Ready Print",
      desc: "A real, trim-size-correct file — ready for Amazon KDP.",
      iconBg: "bg-green-tint",
      iconColor: "text-green-text",
    },
    {
      icon: Clapperboard,
      title: "Narrated Video",
      desc: "Your story as a shareable 16:9 video, with voiceover.",
      iconBg: "bg-tangerine-tint",
      iconColor: "text-tangerine-text",
    },
  ];

  return (
    <section id="features" className="hero-bridge-bg pt-6 pb-16 px-10">
      <div className="text-center max-w-[640px] mx-auto mb-10">
        <div className="inline-block px-[18px] py-1.5 bg-teal-tint text-teal-text rounded-full text-[13px] font-semibold uppercase tracking-wide mb-4">
          Why StoryRise
        </div>
        <h2 className="font-fredoka font-bold text-5xl text-[#1a1a1a] max-sm:text-[32px]">
          Everything you need, built in
        </h2>
      </div>

      <div className="max-w-[1200px] mx-auto grid grid-cols-4 gap-6 max-lg:grid-cols-2 max-sm:grid-cols-1">
        {features.map((f) => (
          <div
            key={f.title}
            className="text-center px-5 py-7 rounded-3xl bg-warm-white transition-all border border-transparent hover:-translate-y-1.5 hover:border-teal/20 hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)]"
          >
            <div className={`w-12 h-12 rounded-[16px] flex items-center justify-center mx-auto mb-4 ${f.iconBg}`}>
              <f.icon size={22} strokeWidth={2.2} className={f.iconColor} />
            </div>
            <div className="font-fredoka font-semibold text-base mb-1.5 text-[#1a1a1a]">{f.title}</div>
            <div className="text-[15px] font-medium text-[#5a5a5a] leading-relaxed">{f.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}