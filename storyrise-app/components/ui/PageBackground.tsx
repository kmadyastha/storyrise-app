/**
 * Full-page background — the real book-cover collage, tiled and softly
 * blurred, with a light multi-color brand wash layered on top so the books
 * stay vaguely legible rather than disappearing under a flat tint.
 * Fixed behind all content; visible in the gutters around every "island"
 * panel, the same way childbook.ai's doodle background works.
 */
export default function PageBackground() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
      {/* the actual collage, tiled and lightly blurred */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url(/book-collage.jpg)",
          backgroundRepeat: "repeat",
          backgroundSize: "620px auto",
          filter: "blur(0.5px)",
          opacity: 0.8,
        }}
      />
      {/* light brand-palette wash so the whole site reads as one tinted
          surface, while the collage stays clearly (if softly) visible underneath */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, var(--color-teal-tint) 0%, var(--color-green-tint) 35%, var(--color-lime-tint) 65%, var(--color-tangerine-tint) 100%)",
          opacity: 0.42,
        }}
      />
    </div>
  );
}
