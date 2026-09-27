import { redirect } from "next/navigation";
import { db } from "@/db";
import { getAdmin } from "@/lib/rbac";
import { listAdmins, fullName } from "@/lib/admin";
import { AdminAction } from "@/components/AdminAction";
export default async function Admins() {
  const me = await getAdmin();
  if (!me?.can("admins:manage")) redirect("/admin");
  const rows = await listAdmins(db);
  return (
    <main className="grid gap-3">
      <AdminAction endpoint="/api/admin/admins" body={{ action: "grant" }} label="+ إضافة مشرف" fields={[{ name: "phone", label: "رقم المستخدم (مسجّل مسبقًا)", value: "+249" }, { name: "role", label: "الدور", type: "select", options: [{ value: "admin", label: "Admin" }, { value: "super_admin", label: "Super Admin" }] }]} />
      {rows.map((a) => (
        <div key={a.userId} className="flex items-center justify-between gap-2 rounded-2xl border border-line bg-surface p-3"><span><b>{fullName(a.firstName, a.lastName)}</b> · {a.role}</span>
          {a.userId !== me.user.id && <AdminAction endpoint="/api/admin/admins" body={{ action: "revoke", userId: a.userId }} label="إزالة" danger confirm="إزالة صلاحيات الإدارة؟" />}</div>))}
    </main>
  );
}
