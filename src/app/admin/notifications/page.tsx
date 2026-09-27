import { db } from "@/db";
import { groups } from "@/db/schema";
import { getReminderSettings } from "@/lib/reminders";
import { listTemplates } from "@/lib/admin";
import { DEFAULT_TEMPLATES } from "@/i18n/templates";
import { AdminAction } from "@/components/AdminAction";
const PR = [["dhuhr", "الظهر"], ["asr", "العصر"], ["maghrib", "المغرب"], ["isha", "العشاء"]] as const;
export default async function AdminNotifications() {
  const cfg = await getReminderSettings(db), overrides = await listTemplates(db);
  const gs = await db.select({ id: groups.id, name: groups.name }).from(groups);
  const keys = Object.keys(DEFAULT_TEMPLATES);
  const onOff = [{ value: "true", label: "مفعّل" }, { value: "false", label: "متوقف" }];
  return (
    <main className="grid gap-6">
      <section className="grid gap-2 rounded-2xl border border-line bg-surface p-4">
        <h2 className="font-bold">أوقات التذكير</h2>
        <p className="text-sm text-muted">تذكير عند كل صلاة مفعَّلة إن لم يُقرأ الجزء بعد. الفجر هو بداية اليوم دائمًا ولا يُعطَّل.</p>
        <AdminAction endpoint="/api/admin/notifications" body={{ action: "setReminders" }} label="تعديل" fields={[
          ...PR.map(([k, l]) => ({ name: k, label: l, type: "select" as const, options: onOff, value: String(cfg.prayers[k as keyof typeof cfg.prayers]) })),
          { name: "strongBeforeEndMin", label: "التنبيه القوي قبل الفجر (دقائق)", type: "number", value: String(cfg.strongBeforeEndMin) },
        ]} />
      </section>
      <section className="grid gap-2 rounded-2xl border border-line bg-surface p-4">
        <h2 className="font-bold">إرسال إشعار</h2>
        <AdminAction endpoint="/api/admin/notifications" body={{ action: "broadcast" }} label="إرسال" fields={[
          { name: "groupId", label: "المجموعة (اتركه فارغًا للجميع)", type: "select", options: [{ value: "", label: "الجميع" }, ...gs.map((g) => ({ value: g.id, label: g.name }))] },
          { name: "title", label: "العنوان" }, { name: "body", label: "النص" },
        ]} />
      </section>
      <section className="grid gap-3">
        <h2 className="font-bold">قوالب الرسائل</h2>
        {keys.map((k) => { const o = overrides.find((x) => x.key === k), d = DEFAULT_TEMPLATES[k];
          return (<div key={k} className="grid gap-2 rounded-2xl border border-line bg-surface p-3">
            <p dir="ltr" className="text-sm text-muted">{k}</p>
            <AdminAction endpoint="/api/admin/notifications" body={{ action: "upsertTemplate", key: k }} label="تعديل القالب" fields={[{ name: "title", label: "العنوان", value: o?.title ?? d.title }, { name: "body", label: "النص", value: o?.body ?? d.body }]} />
          </div>); })}
      </section>
    </main>
  );
}
