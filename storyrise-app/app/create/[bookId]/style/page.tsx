"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import StepShell from "@/components/create/StepShell";
import Card from "@/components/ui/Card";
import clsx from "clsx";

const layouts = [
  { id: "img-left", label: "Image left / text right" },
  { id: "img-right", label: "Image right / text left" },
  { id: "img-top", label: "Image top / text bottom" },
  { id: "img-bottom", label: "Text top / image bottom" },
];

const fonts = ["Warm Rounded (default)", "Classic Serif", "Playful Script"];

export default function StyleStep({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = use(params);
  const router = useRouter();
  const [layout, setLayout] = useState(layouts[0].id);
  const [font, setFont] = useState(fonts[0]);

  return (
    <StepShell
      activeKey="style"
      title="Layout & style"
      subtitle="A near-zero-cost choice — text is always a programmatic overlay, so changing layout is free."
      onBack={`/create/${bookId}/characters`}
      onNext={() => router.push(`/create/${bookId}/quote`)}
    >
      <div className="space-y-7">
        <div>
          <label className="text-sm font-medium mb-3 block">Book-level default layout</label>
          <div className="grid grid-cols-2 gap-3">
            {layouts.map((l) => (
              <button
                key={l.id}
                onClick={() => setLayout(l.id)}
                className={clsx(
                  "rounded-xl border p-3 text-left",
                  layout === l.id ? "border-teal bg-teal-tint" : "border-line hover:border-teal"
                )}
              >
                <div
                  className={clsx(
                    "w-full h-14 rounded-lg bg-paper border border-line mb-2 grid",
                    l.id === "img-left" && "grid-cols-2",
                    l.id === "img-right" && "grid-cols-2",
                    (l.id === "img-top" || l.id === "img-bottom") && "grid-rows-2"
                  )}
                >
                  <div
                    className={clsx(
                      "bg-teal/30 rounded-md m-1",
                      l.id === "img-right" && "col-start-2",
                      l.id === "img-bottom" && "row-start-2"
                    )}
                  />
                </div>
                <span className="text-xs font-medium">{l.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-3 block">Font</label>
          <div className="flex flex-wrap gap-2">
            {fonts.map((f) => (
              <button
                key={f}
                onClick={() => setFont(f)}
                className={clsx(
                  "text-sm rounded-full px-4 py-2 border",
                  font === f ? "bg-teal text-white border-teal" : "border-line hover:border-teal"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <Card className="bg-paper text-xs text-ink-soft">
          You can override this default per-slide later in the Preview step.
        </Card>
      </div>
    </StepShell>
  );
}
