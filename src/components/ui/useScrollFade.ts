import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

/**
 * Horizontal scroller helper for tab rows on small screens:
 * - `fadeClass` fades the edge(s) that hide more content, so a cut-off tab
 *   reads as "scroll for more" instead of a truncated label;
 * - the element matching `activeSelector` is scrolled into view whenever
 *   `activeKey` changes (e.g. a deep link opens the fourth tab).
 */
export function useScrollFade<T extends HTMLElement>(activeSelector: string, activeKey: unknown): { ref: RefObject<T | null>; fadeClass: string; moreEnd: boolean } {
  const ref = useRef<T | null>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const start = el.scrollLeft > 2;
    const end = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const frame = requestAnimationFrame(measure);
    el.addEventListener("scroll", measure, { passive: true });
    // The row keeps its own size while its content grows (labels arriving with
    // the translations, web fonts, counts): observe the items too, and measure
    // again once the fonts are in, or the fade would never appear.
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    for (const child of Array.from(el.children)) ro?.observe(child);
    let alive = true;
    void document.fonts?.ready.then(() => { if (alive) measure(); });
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", measure);
      ro?.disconnect();
    };
  }, [measure]);

  useEffect(() => {
    if (activeKey == null) return; // nothing selected, nothing to reveal
    const el = ref.current;
    const active = el?.querySelector<HTMLElement>(activeSelector);
    if (!el || !active || el.scrollWidth <= el.clientWidth) return;
    // Scroll only the row (scrollIntoView would also scroll the page).
    const target = active.offsetLeft - (el.clientWidth - active.offsetWidth) / 2;
    el.scrollTo({ left: Math.max(0, target) });
  }, [activeSelector, activeKey]);

  const fadeClass = edges.start && edges.end
    ? "[mask-image:linear-gradient(to_right,transparent,#000_32px,#000_calc(100%-48px),transparent)]"
    : edges.end
      ? "[mask-image:linear-gradient(to_right,#000_calc(100%-72px),transparent_calc(100%-8px))]"
      : edges.start
        ? "[mask-image:linear-gradient(to_right,transparent,#000_32px)]"
        : "";
  return { ref, fadeClass, moreEnd: edges.end };
}
