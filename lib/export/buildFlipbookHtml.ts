import { fetchImage } from "@/lib/export/exportData";
import { normalizeImageForEmbed } from "@/lib/export/normalizeImageForEmbed";
import type { Book, StoryPage, Cover } from "@/lib/supabase/queries";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function toDataUri(url: string | null | undefined): Promise<string | null> {
  const fetched = await fetchImage(url);
  if (!fetched) return null;
  const normalized = await normalizeImageForEmbed(fetched.bytes);
  const mime = normalized.format === "jpeg" ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${normalized.bytes.toString("base64")}`;
}

export interface BuildFlipbookOptions {
  book: Book;
  pages: StoryPage[];
  cover: Cover | null;
}

/** Builds one self-contained .html file — every illustration embedded
 * directly as base64, a small inline pager script, no external requests of
 * any kind. Opens and works fully offline in any browser, indefinitely,
 * regardless of the book's 30-day server-side deletion. A real page-curl
 * animation was deliberately skipped in favor of a simple, robust slide
 * transition — less flashy, far less likely to break across browsers. */
export async function buildFlipbookHtml(opts: BuildFlipbookOptions): Promise<string> {
  const { book, pages, cover } = opts;
  const title = cover?.title || book.title || "Untitled story";
  const author = cover?.author || "";

  const coverImg = await toDataUri(cover?.image_url ?? pages[0]?.image_url ?? null);
  const pageImages = await Promise.all(pages.map((p) => toDataUri(p.image_url)));

  const slides: string[] = [];

  // Cover slide
  slides.push(`
    <section class="fb-slide">
      <div class="fb-art">${coverImg ? `<img src="${coverImg}" alt="Cover" />` : `<div class="fb-blank"></div>`}</div>
      <div class="fb-cover-caption">
        <h1>${escapeHtml(title)}</h1>
        ${author ? `<p class="fb-author">by ${escapeHtml(author)}</p>` : ""}
      </div>
    </section>`);

  pages.forEach((p, i) => {
    const img = pageImages[i];
    const artHtml = img ? `<img src="${img}" alt="Page ${p.page_number}" />` : `<div class="fb-blank"></div>`;
    const overlayClass = book.format === "immersive" ? "fb-overlay-top" : "fb-overlay-bottom";
    slides.push(`
      <section class="fb-slide">
        <div class="fb-art">${artHtml}</div>
        <div class="${overlayClass}">${escapeHtml(p.narration)}</div>
      </section>`);
  });

  const slideCount = slides.length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0; height: 100%;
    background: #1a1a1a;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
    overflow: hidden;
  }
  #fb-viewport {
    position: relative;
    width: 100vw; height: 100vh;
    overflow: hidden;
  }
  #fb-track {
    display: flex;
    height: 100%;
    transition: transform 0.45s cubic-bezier(0.65, 0, 0.35, 1);
  }
  .fb-slide {
    position: relative;
    flex: 0 0 100vw;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fdf9f2;
  }
  .fb-art {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
  }
  .fb-art img {
    max-width: 100%; max-height: 100%;
    width: auto; height: auto;
    object-fit: contain;
  }
  .fb-blank {
    width: 60%; height: 60%;
    background: #e8faf8;
    border-radius: 12px;
  }
  .fb-overlay-bottom, .fb-overlay-top {
    position: absolute;
    left: 5%; right: 5%;
    background: rgba(0,0,0,0.75);
    color: #fff;
    padding: 16px 20px;
    border-radius: 12px;
    font-size: 16px;
    line-height: 1.5;
    max-width: 900px;
    margin: 0 auto;
  }
  .fb-overlay-bottom { bottom: 6%; }
  .fb-overlay-top { top: 6%; }
  .fb-cover-caption {
    position: absolute;
    left: 0; right: 0; top: 40%;
    text-align: center;
    background: rgba(255,255,255,0.94);
    padding: 24px 20px;
  }
  .fb-cover-caption h1 {
    margin: 0 0 6px; font-size: 32px; color: #1a1a1a;
  }
  .fb-author { margin: 0; color: #5a5a5a; font-size: 14px; }
  .fb-nav {
    position: fixed; top: 50%; transform: translateY(-50%);
    width: 46px; height: 46px; border-radius: 50%;
    background: rgba(255,255,255,0.9);
    border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; color: #1a1a1a;
    z-index: 5;
  }
  .fb-nav:disabled { opacity: 0.25; cursor: default; }
  #fb-prev { left: 16px; }
  #fb-next { right: 16px; }
  #fb-counter {
    position: fixed; bottom: 14px; left: 50%; transform: translateX(-50%);
    background: rgba(0,0,0,0.6); color: #fff;
    font-size: 12px; padding: 4px 12px; border-radius: 20px;
    z-index: 5;
  }
</style>
</head>
<body>
  <div id="fb-viewport">
    <div id="fb-track">
      ${slides.join("\n")}
    </div>
  </div>
  <button id="fb-prev" class="fb-nav" aria-label="Previous page">&#8249;</button>
  <button id="fb-next" class="fb-nav" aria-label="Next page">&#8250;</button>
  <div id="fb-counter">1 / ${slideCount}</div>

  <script>
    (function () {
      var track = document.getElementById("fb-track");
      var counter = document.getElementById("fb-counter");
      var prevBtn = document.getElementById("fb-prev");
      var nextBtn = document.getElementById("fb-next");
      var total = ${slideCount};
      var current = 0;

      function render() {
        track.style.transform = "translateX(-" + (current * 100) + "vw)";
        counter.textContent = (current + 1) + " / " + total;
        prevBtn.disabled = current === 0;
        nextBtn.disabled = current === total - 1;
      }
      function go(delta) {
        current = Math.max(0, Math.min(total - 1, current + delta));
        render();
      }
      prevBtn.addEventListener("click", function () { go(-1); });
      nextBtn.addEventListener("click", function () { go(1); });
      document.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft") go(-1);
        if (e.key === "ArrowRight") go(1);
      });

      // Basic touch-swipe support for mobile.
      var touchStartX = null;
      document.addEventListener("touchstart", function (e) { touchStartX = e.touches[0].clientX; });
      document.addEventListener("touchend", function (e) {
        if (touchStartX === null) return;
        var dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touchStartX = null;
      });

      render();
    })();
  </script>
</body>
</html>`;
}