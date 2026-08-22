import { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

export default function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal",
        {
          "bg-teal text-white hover:bg-teal-text active:scale-[0.98] shadow-sm": variant === "primary",
          "bg-white text-ink border border-line hover:border-teal hover:text-teal-text": variant === "secondary",
          "bg-transparent text-ink-soft hover:text-ink": variant === "ghost",
          "bg-transparent border border-teal text-teal-text hover:bg-teal-tint": variant === "outline",
        },
        {
          "text-sm px-4 py-2": size === "sm",
          "text-sm px-5 py-2.5": size === "md",
          "text-base px-7 py-3.5": size === "lg",
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
