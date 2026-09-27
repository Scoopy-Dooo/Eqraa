import { currentUser } from "@/lib/session";
import { db } from "@/db";
import { todayFor, missedFor } from "@/lib/reading";
import { rollover } from "@/lib/rollover";
import { aladhan } from "@/lib/prayer";
import { Avatar } from "@/components/Avatar";
import { ReadingPanel } from "@/components/ReadingPanel";
import { MakeupList } from "@/components/MakeupList";
import { LogoutButton } from "@/components/LogoutButton";
import { ui } from "@/i18n/ui";
import { kh } from "@/i18n/khatmah";
import { rk } from "@/i18n/rank";
import { getStreak } from "@/lib/streak";
import { getAdmin } from "@/lib/rbac";
const u = ui.ar, k = kh.ar, r = rk.ar;
const Card = ({ title, body }: { title: string; body: string }) => (<section className="rounded-2xl border border-line bg-surface p-6"><h2 className="text-xl font-bold">{title}</h2><p className="mt-2 max-w-[60ch] text-muted">{body}</p></section>);
export default async function Home() {
  const me = (await currentUser())!;
  let t = await todayFor(db, me.id);
  if (t.state === "not_started") { await rollover(db, aladhan, new Date(), { groupId: t.groupId }); t = await todayFor(db, me.id); } // lazy rollover if the cron is late
  const isAdmin = !!(await getAdmin());
  const missed = await missedFor(db, me.id), st = await getStreak(db, me.id);
  const atRisk = t.state === "open" && !!t.mine && t.mine.status !== "completed" && st.current > 0 && Date.parse(t.day.endsAt) - Date.now() < 3 * 36e5;
  return (
    <main className="mt-6 grid gap-6">
      <div className="flex items-center gap-3"><Avatar k={me.avatarKey} size={56} /><div><h1 className="text-2xl font-bold">{u.hello} {me.firstName}</h1>{"groupName" in t && <p className="text-muted">{t.groupName}</p>}</div></div>
      <div className="flex gap-4 text-lg"><span>🔥 {st.current} {r.streakLabel}</span><span>🛡 {st.protections} {r.protection}</span></div>
      {atRisk && <p role="status" className="rounded-xl border border-dawn p-3 text-dawn-text">{r.risk}{st.protections > 0 ? ` — ${r.riskShield}` : ""}</p>}
      {t.state === "no_group" && t.backups.length === 0 && <Card title={u.waitTitle} body={u.waitBody} />}
      {t.state === "not_started" && <Card title={k.notStarted} body={k.notStartedBody} />}
      {t.state === "open" && (t.mine
        ? <ReadingPanel assignmentId={t.mine.id} part={t.mine.part} initial={t.mine.status} endsAt={t.day.endsAt} serverNow={t.serverNow} done={t.progress.done} total={t.progress.total} day={t.day.number} />
        : <Card title={k.nextDay} body={`${k.progress}: ${t.progress.done}/${t.progress.total}`} />)}
      {t.backups.map((b) => <ReadingPanel key={b.id} role="backup" assignmentId={b.id} part={b.part} initial={b.status} endsAt={b.endsAt} serverNow={new Date().toISOString()} done={b.progress.done} total={b.progress.total} day={b.day} />)}
      <MakeupList items={missed} />
      {isAdmin && <a href="/admin" className="min-h-11 rounded-xl border border-line px-4 py-2 text-center font-semibold">لوحة الإدارة</a>}
      <LogoutButton />
    </main>
  );
}
