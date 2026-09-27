const COLORS = ["#1E6B5A", "#B9852F", "#4C6A92", "#8A5A83"];
export const AVATARS = { male: ["m1", "m2", "m3", "m4"], female: ["f1", "f2", "f3", "f4"] } as const;
export function Avatar({ k, size = 48 }: { k: string; size?: number }) {
  const c = COLORS[(Number(k.slice(1)) - 1 || 0) % 4];
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="24" fill={c} opacity=".16" />
      <circle cx="24" cy="19" r="8" fill={c} />
      <path d={k[0] === "f" ? "M8 44c0-11 7-16 16-16s16 5 16 16z" : "M10 44c0-9 6-13 14-13s14 4 14 13z"} fill={c} />
    </svg>
  );
}
