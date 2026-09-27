import { redirect } from "next/navigation";
import { db } from "@/db";
import { getAdmin } from "@/lib/rbac";
import { auditFeed, fullName } from "@/lib/admin";
import { khDateTime } from "@/lib/format";
export default async function Audit() {
  if (!(await getAdmin())?.can("audit:read")) redirect("/admin");
  const rows = await auditFeed(db);
  return (
    <main className="grid gap-2">
      {rows.map((r) => (
        <div key={r.id} className="rounded-2xl border border-line bg-surface p-3 text-sm">
          <div className="flex justify-between"><b dir="ltr">{r.action}</b><span className="text-muted">{khDateTime(r.at)}</span></div>
          <p className="text-muted">{r.actorFirst ? fullName(r.actorFirst, r.actorLast) : "—"} → {r.targetType} <span dir="ltr">{r.targetId.slice(0, 8)}</span></p>
          {(r.before || r.after) ? <p dir="ltr" className="break-all text-start text-xs text-muted">{JSON.stringify(r.before)} → {JSON.stringify(r.after)}</p> : null}
        </div>))}
    </main>
  );
}
