// Open book under a rising dawn arc; token colors work in both themes.
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Eqraa" fill="none">
      <path d="M14 30a18 18 0 0 1 36 0" stroke="var(--dawn)" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M9 36c8-3 16-3 23 2 7-5 15-5 23-2v16c-8-3-16-3-23 2-7-5-15-5-23-2z" fill="var(--primary)" />
      <path d="M32 38v16" stroke="var(--bg)" strokeWidth="2" />
    </svg>
  );
}
