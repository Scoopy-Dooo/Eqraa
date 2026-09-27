"use client";
import { useState } from "react";
import { kh } from "@/i18n/khatmah";
const k = kh.ar;
type Item = { id: string; part: number; date: string };
export function MakeupList({ items }: { items: Item[] }) {
  const [list, setList] = useState(items), [pending, setPending] = useState<string | null>(null), [err, setErr] = useState(""), keys = useState(() => new Map<string, string>())[0];
  if (!list.length) return null;
  async function go(id: string) {
    if (!keys.has(id)) keys.set(id, crypto.randomUUID());
    const r = await fetch("/api/reading/makeup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assignmentId: id, idempotencyKey: keys.get(id), clientTime: new Date().toISOString() }) });
    if (r.ok) { setList((l) => l.filter((x) => x.id !== id)); setPending(null); } else setErr(k.err);
  }
  return (
    <section className="grid gap-3 rounded-2xl border border-line bg-surface p-5">
      <h2 className="text-lg font-bold">{k.makeupTitle}</h2><p className="text-sm text-muted">{k.makeupNote}</p>
      {list.map((x) => (
        <div key={x.id} className="flex items-center justify-between gap-3"><span>{k.part} {x.part} <span dir="ltr" className="text-sm text-muted">({x.date})</span></span>
          <button onClick={() => (pending === x.id ? go(x.id) : setPending(x.id))} className="min-h-11 rounded-xl border border-line px-4 font-semibold">{pending === x.id ? k.confirm : k.makeup}</button></div>))}
      {err && <p role="alert" className="text-danger">{err}</p>}
    </section>
  );
}
