import { db } from "@/db";
import { eq, isNull, sql } from "drizzle-orm";
import { groups, groupMembers } from "@/db/schema";
import { khartoumDate } from "@/lib/prayer";
import { AdminAction } from "@/components/AdminAction";
export default async function Groups() {
  const gs = await db.select().from(groups).where(eq(groups.status, "active")).orderBy(groups.name);
  const counts = await db.select({ id: groupMembers.groupId, n: sql<number>`count(*)::int` }).from(groupMembers).where(isNull(groupMembers.leftAt)).groupBy(groupMembers.groupId);
  return (
    <main className="grid gap-3">
      <AdminAction endpoint="/api/admin/groups" label="+ مجموعة جديدة" fields={[{ name: "name", label: "اسم المجموعة" }, { name: "capacity", label: "عدد الخانات (1–30)", type: "number", value: "30" }, { name: "startDate", label: "تاريخ البداية", type: "date", value: khartoumDate(new Date()) }]} />
      {gs.map((g) => { const n = counts.find((c) => c.id === g.id)?.n ?? 0; return (
        <a key={g.id} href={`/admin/groups/${g.id}`} className="flex justify-between rounded-2xl border border-line bg-surface p-4"><b>{g.name}</b><span className="text-muted">{n}/{g.capacity} · شاغر {g.capacity - n}</span></a>); })}
    </main>
  );
}
