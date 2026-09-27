import { currentUser } from "@/lib/session";
import { db } from "@/db";
import { leaderboard } from "@/lib/leaderboard";
import { Avatar } from "@/components/Avatar";
import { rk } from "@/i18n/rank";
const r = rk.ar, periods = ["weekly", "monthly", "all"] as const, scopes = ["group", "everyone"] as const;
export default async function Ranking({ searchParams }: { searchParams: Promise<{ period?: string; scope?: string }> }) {
  const sp = await searchParams, me = (await currentUser())!;
  const period = periods.find((p) => p === sp.period) ?? "weekly", scope = sp.scope === "everyone" ? "everyone" : "group";
  const rows = await leaderboard(db, { period, scope: scope === "everyone" ? "all" : "group", userId: me.id });
  const tab = (href: string, on: boolean, label: string) => <a key={href} href={href} aria-current={on ? "page" : undefined} className={`min-h-11 flex-1 rounded-xl px-3 py-2 text-center text-sm ${on ? "bg-primary font-bold text-on-primary" : "border border-line"}`}>{label}</a>;
  return (
    <main className="mt-4 grid gap-4">
      <h1 className="text-2xl font-bold">{r.title}</h1>
      <div className="flex gap-2">{scopes.map((x) => tab(`/ranking?period=${period}&scope=${x}`, x === scope, r[x]))}</div>
      <div className="flex gap-2">{periods.map((x) => tab(`/ranking?period=${x}&scope=${scope}`, x === period, r[x]))}</div>
      {rows.length === 0 && <p className="text-muted">{r.empty}</p>}
      <ol className="grid gap-2">
        {rows.map((x) => (
          <li key={x.userId} className={`flex items-center gap-3 rounded-2xl border p-3 ${x.userId === me.id ? "border-primary bg-surface" : "border-line"}`}>
            <span className="w-7 text-center font-bold text-muted">{x.rank}</span><Avatar k={x.avatarKey} size={40} />
            <span className="flex-1 truncate font-semibold">{x.name}</span>
            <span className="text-end text-sm"><b>{x.partsRead}</b> {r.parts}<br /><span className="text-muted">{r.commitment} {x.commitment}% · 🔥{x.streak}</span></span>
          </li>))}
      </ol>
    </main>
  );
}
