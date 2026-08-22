const colorMap: Record<string, { bg: string; text: string }> = {
  teal: { bg: "bg-teal", text: "text-white" },
  lime: { bg: "bg-lime", text: "text-[#4a5200]" },
  green: { bg: "bg-green", text: "text-white" },
  tangerine: { bg: "bg-tangerine", text: "text-white" },
};

export default function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Describe Your Idea",
      desc: "A prompt, a style, an age group, and a page count — Classic or Immersive format.",
      color: "teal",
    },
    {
      number: "02",
      title: "Generate the Story",
      desc: "StoryRise writes a full story table — narration text for every single page.",
      color: "lime",
    },
    {
      number: "03",
      title: "Meet Your Characters",
      desc: "Describe how they look. Your AI reference image stays consistent, page after page.",
      color: "green",
    },
    {
      number: "04",
      title: "Generate the Book",
      desc: "Every page illustrated in your chosen art style, laid out and ready to review.",
      color: "tangerine",
    },
    {
      number: "05",
      title: "Export & Share",
      desc: "Download as PDF, PPTX, a KDP-ready file, or a narrated video. Gift it, sell it, share it.",
      color: "teal",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 pb-[100px] px-10 bg-paper">
      <div className="text-center max-w-[600px] mx-auto mb-[60px]">
        <div className="inline-block px-[18px] py-1.5 bg-teal-tint text-teal-text rounded-full text-[13px] font-semibold uppercase tracking-wide mb-4">
          Simple Process
        </div>
        <h2 className="font-fredoka font-bold text-5xl text-[#1a1a1a] mb-4 max-sm:text-[32px]">
          From idea to book in minutes
        </h2>
        <p className="text-lg text-[#777] leading-relaxed">
          No design skills needed. Just describe your story, review the characters, and export.
        </p>
      </div>

      <div className="max-w-[1300px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {steps.map((step) => (
          <div
            key={step.number}
            className="bg-warm-white rounded-[28px] p-7 relative shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-black/[0.04] transition-all hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)]"
          >
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center font-fredoka font-bold text-base mb-5 ${colorMap[step.color].bg} ${colorMap[step.color].text}`}
            >
              {step.number}
            </div>
            <div className="font-fredoka font-semibold text-lg mb-2.5 text-[#1a1a1a]">{step.title}</div>
            <div className="text-[14px] text-[#666] leading-[1.6]">{step.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
