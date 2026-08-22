import { HTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padded?: boolean;
}

export default function Card({ children, className, padded = true, ...props }: CardProps) {
  // Only fall back to the default white background when the caller hasn't
  // supplied their own bg-* class — Tailwind can't reliably resolve two
  // same-specificity background utilities by string order, so emitting
  // both risks the wrong one winning depending on stylesheet order.
  const hasCustomBg = className?.split(/\s+/).some((c) => /^!?bg-/.test(c));

  return (
    <div
      className={clsx(
        "rounded-[20px] border border-line/70",
        !hasCustomBg && "bg-white",
        padded && "p-6 sm:p-8",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
