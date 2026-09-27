export function LeaderboardMock() {
  const rows = [{ n: "قارئ ١", p: 24 }, { n: "قارئ ٢", p: 21 }, { n: "قارئ ٣", p: 19 }];
  return (
    <div className="mx-auto grid max-w-xs gap-2 rounded-2xl border border-line bg-surface p-4" aria-hidden="true">
      {rows.map((r, i) => (
        <div key={r.n} className="flex items-center gap-3">
          <span className="w-5 text-center font-bold text-muted">{i + 1}</span>
          <span className="size-8 rounded-full bg-primary/15" />
          <span className="flex-1 font-semibold">{r.n}</span>
          <span className="text-sm text-muted">{r.p} جزء</span>
        </div>))}
    </div>
  );
}
