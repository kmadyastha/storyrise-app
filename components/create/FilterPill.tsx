"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface Props {
  label?: string;
  value: string;
  icon?: ReactNode;
  children: (close: () => void) => ReactNode;
  panelClassName?: string;
  align?: "left" | "right";
}

export default function FilterPill({ label, value, icon, children, panelClassName, align = "left" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 text-sm rounded-full border px-3.5 py-2 transition-colors ${
          open ? "border-teal bg-teal-tint text-teal-text" : "border-line hover:border-teal text-ink"
        }`}
      >
        {icon}
        {label && <span className="text-ink-soft">{label}</span>}
        <span className="font-medium">{value}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className={`absolute ${align === "right" ? "right-0" : "left-0"} top-[calc(100%+8px)] bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-line p-3 z-50 ${
            panelClassName ?? "w-64"
          }`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}