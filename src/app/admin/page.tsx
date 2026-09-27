import { db } from "@/db";
import { dailyOverview, stats, isMissing } from "@/lib/admin";
import { khTime } from "@/lib/format";
import { ad } from "@/i18n/admin";
const card = "rounded-2xl border border-line bg-surface p-4";
export default async function Dashboard() {
  const [st, ov] = await Promise.all([stats(db), dailyOverview(db)]);
  const parts = ov.flatMap((g) => g.parts.map((p) => ({ ...p, group: g.name, endsAt: g.endsAt }))), missing = parts.filter((p) => isMissing(p.status));
  const done = ov.reduce((a, g) => a + g.done, 0), total = parts.length, risk = missing.filter((p) => p.streak > 0);
  const urgent = missing.filter((p) => p.endsAt.getTime() - Date.now() < 3 * 36e5);
  const box = (n: string | number, l: string) => <div className={card}><p className="text-3xl font-bold">{n}</p><p className="text-sm text-muted">{l}</p></div>;
  return (
    <main className="grid gap-4">
      <div className="grid grid-cols-2 gap-3">{box(st.groups, "مجموعات نشطة")}{box(st.members, "أعضاء")}{box(st.unassigned, "مسجّلون بلا مجموعة")}{box(total ? `${Math.round((done / total) * 100)}%` : ad.none, "اكتمال اليوم")}</div>
      {urgent.length > 0 && <section className={`${card} border-danger`}><h2 className="font-bold text-danger">تنبيه: أجزاء لم تُقرأ ويقترب الفجر ({urgent.length})</h2></section>}
      <section className={card}><h2 className="mb-2 font-bold">الختمات المفتوحة</h2>
        {ov.length === 0 && <p className="text-muted">{ad.empty}</p>}
        {ov.map((g) => <a key={g.groupId} href="/admin/daily" className="flex justify-between border-t border-line py-2 first:border-0"><span>{g.name} · يوم {g.day}</span><span>{g.done}/{g.parts.length} · حتى {khTime(g.endsAt)}</span></a>)}</section>
      <section className={card}><h2 className="mb-2 font-bold">أجزاء لم تُقرأ ({missing.length}) · Streak في خطر ({risk.length})</h2>
        {missing.slice(0, 20).map((p) => <a key={p.id} href="/admin/daily" className="flex justify-between border-t border-line py-2 first:border-0"><span>{p.group} · الجزء {p.part} · {p.name ?? "بلا قارئ"}</span><span>{p.streak > 0 ? `🔥${p.streak}` : ""} {p.backupName ? `(بديل: ${p.backupName})` : ""}</span></a>)}</section>
    </main>
  );
}
