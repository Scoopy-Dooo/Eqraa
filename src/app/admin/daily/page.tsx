import { db } from "@/db";
import { dailyOverview, listUsers, fullName, isMissing } from "@/lib/admin";
import { khTime } from "@/lib/format";
import { AdminAction } from "@/components/AdminAction";
import { ad } from "@/i18n/admin";
export default async function Daily() {
  const ov = await dailyOverview(db), people = (await listUsers(db, { limit: 300 })).filter((u) => u.status === "active").map((u) => ({ value: u.id, label: `${fullName(u.firstName, u.lastName)} …${u.phone.slice(-4)}` }));
  return (
    <main className="grid gap-5">
      {ov.length === 0 && <p className="text-muted">{ad.empty}</p>}
      {ov.map((g) => (
        <section key={g.groupId} className="grid gap-2">
          <h2 className="text-xl font-bold">{g.name} · يوم {g.day} <span className="text-base font-normal text-muted">{g.done}/{g.parts.length} · حتى {khTime(g.endsAt)}</span></h2>
          {[...g.parts].sort((a, b) => Number(isMissing(b.status)) - Number(isMissing(a.status)) || a.part - b.part).map((p) => (
            <div key={p.id} className="grid gap-2 rounded-2xl border border-line bg-surface p-3">
              <div className="flex justify-between"><span><b>الجزء {p.part}</b> · {p.name ?? "بلا قارئ"} {p.streak > 0 && `🔥${p.streak}`}</span><span className={isMissing(p.status) ? "text-danger" : "text-primary"}>{ad.status[p.status] ?? p.status}</span></div>
              {p.backupName && <p className="text-sm text-muted">البديل: {p.backupName}</p>}
              {isMissing(p.status) && <div className="flex flex-wrap gap-2">
                <AdminAction endpoint="/api/admin/backups" body={{ action: "assign", assignmentId: p.id }} label={p.backupName ? "تغيير البديل" : "تعيين بديل"} fields={[{ name: "backupUserId", label: "البديل", type: "select", options: people }]} />
                {p.backupName && <AdminAction endpoint="/api/admin/backups" body={{ action: "cancel", assignmentId: p.id }} label="إلغاء البديل" danger confirm="إلغاء البديل؟" />}
                {p.userId && <AdminAction endpoint="/api/admin/readings" body={{ assignmentId: p.id }} label="تأكيد القراءة نيابةً" confirm={`تأكيد أن ${p.name} قرأ الجزء ${p.part}؟ تُحسب له وتُسجَّل في السجل.`} />}
              </div>}
            </div>))}
        </section>))}
    </main>
  );
}
