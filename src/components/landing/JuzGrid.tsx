/** Schematic, not live data: illustrates "30 parts, shared out" — labelled as an example in the surrounding copy. */
export function JuzGrid() {
  const filled = new Set([1, 2, 3, 4, 5, 6, 7, 8, 12, 13, 14, 20, 21, 27, 28, 29]);
  return (
    <div className="mx-auto grid max-w-xs grid-cols-6 gap-1.5" aria-hidden="true">
      {Array.from({ length: 30 }, (_, i) => <span key={i} className={`aspect-square rounded-md ${filled.has(i + 1) ? "bg-primary" : "bg-line"}`} />)}
    </div>
  );
}
