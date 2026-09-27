"use client";
import { useState } from "react";
type Item = { id: string; type: string; title: string; body: string; createdAt: string; read: boolean };
const fmt = (iso: string) => new Date(iso).toLocaleString("ar", { timeZone: "Africa/Khartoum", dateStyle: "short", timeStyle: "short" });
export function NotificationList({ initial }: { initial: Item[] }) {
  const [items, setItems] = useState(initial);
  const unread = items.some((x) => !x.read);
  async function markAll() { setItems((l) => l.map((x) => ({ ...x, read: true }))); await fetch("/api/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) }); }
  async function markOne(id: string) { setItems((l) => l.map((x) => (x.id === id ? { ...x, read: true } : x))); await fetch("/api/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); }
  return (
    <section className="grid gap-2">
      {unread && <button onClick={markAll} className="justify-self-start text-sm text-primary underline">تحديد الكل كمقروء</button>}
      {items.length === 0 && <p className="text-muted">لا توجد إشعارات بعد</p>}
      {items.map((x) => (
        <button key={x.id} onClick={() => !x.read && markOne(x.id)} className={`grid gap-1 rounded-2xl border p-4 text-start ${x.read ? "border-line bg-surface" : "border-primary bg-surface"}`}>
          <div className="flex items-center justify-between"><b>{x.title}</b>{!x.read && <span className="size-2 rounded-full bg-primary" />}</div>
          <p className="text-muted">{x.body}</p><p className="text-xs text-muted" dir="ltr">{fmt(x.createdAt)}</p>
        </button>))}
    </section>
  );
}
