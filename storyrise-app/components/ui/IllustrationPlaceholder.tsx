const palette: Record<string, { a: string; b: string; c: string; deep: string }> = {
  teal: { a: "#00BCC8", b: "#8FE4E9", c: "#E8FAFB", deep: "#00838A" },
  lime: { a: "#D0FF00", b: "#EBFFA0", c: "#F8FFDB", deep: "#8FA300" },
  green: { a: "#1DC27A", b: "#8FE3BF", c: "#E5F9EF", deep: "#0F8A57" },
  tangerine: { a: "#FF6A1F", b: "#FFB98C", c: "#FFF0E6", deep: "#C24A0D" },
};

interface Props {
  seed?: number;
  color?: keyof typeof palette;
  className?: string;
  label?: string;
  /** Punchy, fully-saturated variant for hero/feature panels where the art
   * needs to hold its own against a white shape or a solid brand color —
   * the default pale variant is for soft in-app backdrops. */
  vivid?: boolean;
}

/**
 * Stand-in for an AI-generated storybook illustration. Deterministic per
 * seed so the same "page" always renders the same placeholder art.
 */
export default function IllustrationPlaceholder({ seed = 1, color = "teal", className, label, vivid = false }: Props) {
  const p = palette[color] ?? palette.teal;
  const hillA = 40 + ((seed * 13) % 20);
  const hillB = 55 + ((seed * 7) % 25);
  const sunX = 20 + ((seed * 31) % 60);
  const sunY = 20 + ((seed * 17) % 15);

  if (vivid) {
    return (
      <svg
        viewBox="0 0 400 300"
        preserveAspectRatio="xMidYMid slice"
        className={className}
        role="img"
        aria-label={label ?? "Storybook illustration placeholder"}
      >
        <rect width="400" height="300" fill={p.deep} />
        <circle cx={sunX * 4} cy={sunY * 2.4} r="46" fill={p.a} opacity="0.9" />
        <path d={`M0,${hillB * 3} C100,${hillA * 2.4} 300,${hillB * 2.8} 400,${hillA * 2.2} L400,300 L0,300 Z`} fill={p.a} opacity="0.85" />
        <path d={`M0,${hillB * 3.3} C120,${hillA * 2.9} 280,${hillB * 3.1} 400,${hillA * 2.7} L400,300 L0,300 Z`} fill={p.b} opacity="0.95" />
        <g>
          <circle cx="200" cy="200" r="26" fill="#fff" />
          <rect x="174" y="220" width="52" height="54" rx="16" fill="#fff" />
          <circle cx="190" cy="196" r="3.5" fill={p.deep} />
          <circle cx="210" cy="196" r="3.5" fill={p.deep} />
        </g>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role="img"
      aria-label={label ?? "Storybook illustration placeholder"}
    >
      <rect width="400" height="300" fill={p.c} />
      <circle cx={sunX * 4} cy={sunY * 3} r="34" fill={p.b} opacity="0.8" />
      <path d={`M0,${hillB * 3} C100,${hillA * 2.4} 300,${hillB * 2.8} 400,${hillA * 2.2} L400,300 L0,300 Z`} fill={p.b} opacity="0.55" />
      <path d={`M0,${hillB * 3.3} C120,${hillA * 2.9} 280,${hillB * 3.1} 400,${hillA * 2.7} L400,300 L0,300 Z`} fill={p.a} opacity="0.9" />
      {/* simple books/characters silhouette so it reads as "storybook", not generic */}
      <g opacity="0.9">
        <circle cx="200" cy="205" r="22" fill="#fff" />
        <rect x="178" y="222" width="44" height="46" rx="14" fill="#fff" />
      </g>
    </svg>
  );
}
