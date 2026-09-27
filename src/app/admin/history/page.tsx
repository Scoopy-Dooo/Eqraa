import { db } from "@/db";
import { recentHistory } from "@/lib/admin";
import { ad } from "@/i18n/admin";
export default async function History() {
  const rows = await recentHistory(db);
  return (
    <main className="grid gap-2">
      {rows.length === 0 && <p className="text-muted">{ad.empty}</p>}
      {rows.map((r, i) => (
        <div key={i} className="flex justify-between rounded-2xl border border-line bg-surface p-3"><span>{r.name} · يوم {r.day} <span dir="ltr" className="text-sm text-muted">({r.date})</span></span>
          <span>{r.done}/{r.total}{r.byBackup ? ` · بديل ${r.byBackup}` : ""}{r.missed ? ` · فائت ${r.missed}` : ""}</span></div>))}
    </main>
  );
}
