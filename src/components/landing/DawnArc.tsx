/** Hero motif: the dawn arc rising once on load (single orchestrated moment; disabled globally under
 * prefers-reduced-motion via globals.css). Recurs at smaller scale as the section divider below. */
export function DawnArc({ variant = "hero" }: { variant?: "hero" | "divider" }) {
  if (variant === "divider") {
    return (
      <svg viewBox="0 0 200 40" className="mx-auto h-8 w-32" aria-hidden="true">
        <path d="M10 36a90 90 0 0 1 180 0" stroke="var(--dawn)" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 400 220" className="mx-auto h-40 w-full max-w-md sm:h-56" aria-hidden="true">
      <path d="M20 190a180 180 0 0 1 360 0" stroke="var(--dawn)" strokeWidth="4" strokeLinecap="round" fill="none" className="dawn-rise" />
      <path d="M0 196c40-14 80-14 120 0s80 14 120 0 80-14 120 0v24H0z" fill="var(--primary)" opacity=".9" />
      <style>{`.dawn-rise{stroke-dasharray:620;stroke-dashoffset:620;animation:rise 1.4s ease-out .2s forwards}@keyframes rise{to{stroke-dashoffset:0}}`}</style>
    </svg>
  );
}
