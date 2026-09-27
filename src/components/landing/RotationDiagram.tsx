/** A genuine cycle: 12 dots standing in for the group's readers, one highlighted, with a short arrow showing
 * tomorrow's shift by one position — the actual mechanic, not a decorative icon. */
export function RotationDiagram() {
  const n = 12, r = 78, cx = 100, cy = 100;
  const pt = (i: number) => { const a = (i / n) * 2 * Math.PI - Math.PI / 2; return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const; };
  return (
    <svg viewBox="0 0 200 200" className="mx-auto h-56 w-56" aria-hidden="true">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--line)" strokeWidth="2" strokeDasharray="2 6" />
      {Array.from({ length: n }, (_, i) => { const [x, y] = pt(i), on = i === 0 || i === 1; return <circle key={i} cx={x} cy={y} r={on ? 7 : 5} fill={on ? "var(--primary)" : "var(--line)"} />; })}
      <path d="M63 44a44 44 0 0 1 24-12" fill="none" stroke="var(--dawn)" strokeWidth="2.5" markerEnd="url(#arrow)" />
      <defs><marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0 0 6 3 0 6z" fill="var(--dawn)" /></marker></defs>
    </svg>
  );
}
