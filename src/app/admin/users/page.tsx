import { redirect } from "next/navigation";
import { db } from "@/db";
import { getAdmin } from "@/lib/rbac";
import { listUsers, fullName } from "@/lib/admin";
import { AdminAction } from "@/components/AdminAction";
import { ad } from "@/i18n/admin";
export default async function Users({ searchParams }: { searchParams: Promise<{ q?: string; f?: string }> }) {
  if (!(await getAdmin())?.can("users:manage")) redirect("/admin");
  const sp = await searchParams, f = sp.f === "unassigned" || sp.f === "assigned" ? sp.f : "all", rows = await listUsers(db, { q: sp.q, filter: f });
  const tab = (v: string, l: string) => <a key={v} href={`/admin/users?f=${v}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`} className={`min-h-11 flex-1 rounded-xl px-3 py-2 text-center text-sm ${f === v ? "bg-primary font-bold text-on-primary" : "border border-line"}`}>{l}</a>;
  return (
    <main className="grid gap-3">
      <form className="flex gap-2"><input name="q" defaultValue={sp.q} placeholder="بحث بالاسم أو الرقم" dir="auto" className="min-h-11 flex-1 rounded-xl border border-line bg-surface px-3" /><input type="hidden" name="f" value={f} /><button className="min-h-11 rounded-xl bg-primary px-4 text-on-primary">بحث</button></form>
      <div className="flex gap-2">{tab("all", "الكل")}{tab("unassigned", "بلا مجموعة")}{tab("assigned", "في مجموعة")}</div>
      {rows.length === 0 && <p className="text-muted">{ad.empty}</p>}
      {rows.map((u) => (
        <section key={u.id} className="grid gap-2 rounded-2xl border border-line bg-surface p-4">
          <div className="flex justify-between"><b>{fullName(u.firstName, u.lastName)}</b><span className="text-sm text-muted">{u.groupName ? `${u.groupName} · خانة ${u.slot}` : ad.noGroup}</span></div>
          <p dir="ltr" className="text-start text-muted">{u.phone}</p>
          <div className="flex flex-wrap gap-2">
            <AdminAction endpoint={`/api/admin/users/${u.id}`} body={{ action: "changePhone" }} label="تغيير الرقم" fields={[{ name: "phone", label: "الرقم الجديد", value: u.phone }]} />
            <AdminAction endpoint={`/api/admin/users/${u.id}`} body={{ action: "resetPin" }} label="إعادة ضبط الرمز" fields={[{ name: "pin", label: "رمز جديد (6 أرقام)" }]} />
          </div>
        </section>))}
    </main>
  );
}
