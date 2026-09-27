import { notFound } from "next/navigation";
import { and, eq, gt, isNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { groups, groupMembers, users, khatmahDays } from "@/db/schema";
import { listUsers, fullName } from "@/lib/admin";
import { partFor, dayNumber } from "@/domain/rotation";
import { khartoumDate } from "@/lib/prayer";
import { AdminAction } from "@/components/AdminAction";
import { z } from "zod";
export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const id = z.string().uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const [g] = await db.select().from(groups).where(eq(groups.id, id.data));
  if (!g) notFound();
  const now = new Date();
  const ms = await db.select({ uid: users.id, f: users.firstName, l: users.lastName, phone: users.phoneE164, slot: groupMembers.slot }).from(groupMembers).innerJoin(users, eq(users.id, groupMembers.userId)).where(and(eq(groupMembers.groupId, g.id), isNull(groupMembers.leftAt)));
  const [open] = await db.select().from(khatmahDays).where(and(eq(khatmahDays.groupId, g.id), eq(khatmahDays.status, "open"), lte(khatmahDays.startsAt, now), gt(khatmahDays.endsAt, now)));
  const today = khartoumDate(now), day = open?.dayNumber ?? (today >= g.startDate ? dayNumber(g.startDate, today) : 0);
  const free = (await listUsers(db, { filter: "unassigned", limit: 300 })).map((u) => ({ value: u.id, label: `${fullName(u.firstName, u.lastName)} ${u.phone}` }));
  const ep = `/api/admin/groups/${g.id}/members`, slots = Array.from({ length: Math.min(30, g.capacity + (g.capacity < 30 ? 1 : 0)) }, (_, i) => i + 1);
  const emptySlots = slots.filter((slot) => !ms.some((m) => m.slot === slot) && slot <= g.capacity).map((slot) => ({ value: String(slot), label: `خانة ${slot}` }));
  return (
    <main className="grid gap-3">
      <h1 className="text-2xl font-bold">{g.name} <span className="text-base font-normal text-muted">· يوم {day || "—"}</span></h1>
      {slots.map((slot) => { const m = ms.find((x) => x.slot === slot), part = day ? partFor(slot, day, g.startOffset) : null; return (
        <section key={slot} className="grid gap-2 rounded-2xl border border-line bg-surface p-3">
          <div className="flex justify-between"><span><b>خانة {slot}</b> {part && <span className="text-muted">· جزء اليوم {part}</span>}</span><span>{m ? fullName(m.f, m.l) : slot > g.capacity ? "خانة جديدة" : "شاغرة"}</span></div>
          {m ? <div className="flex flex-wrap gap-2">
            <AdminAction endpoint={ep} body={{ action: "replace", oldUserId: m.uid }} label="استبدال" fields={[{ name: "newUserId", label: "العضو الجديد", type: "select", options: free }]} />
            {emptySlots.length > 0 && <AdminAction endpoint={ep} body={{ action: "move", userId: m.uid }} label="نقل إلى خانة أخرى" fields={[{ name: "newSlot", label: "الخانة الجديدة", type: "select", options: emptySlots }]} />}
            <AdminAction endpoint={ep} body={{ action: "remove", userId: m.uid }} label="إزالة" danger confirm={`إزالة ${fullName(m.f, m.l)} من المجموعة؟ يبقى حسابه وتاريخه.`} />
          </div>
          : <AdminAction endpoint={ep} body={{ action: "add", slot }} label="إضافة عضو" fields={[{ name: "userId", label: "المستخدم", type: "select", options: free }]} />}
        </section>); })}
    </main>
  );
}
