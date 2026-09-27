"use client";
import { useEffect, useRef, useState } from "react";
import { kh } from "@/i18n/khatmah";
import { enqueue } from "@/lib/offline-db";
const k = kh.ar;
type Props = { role?: string; assignmentId: string; part: number; initial: string; endsAt: string; serverNow: string; done: number; total: number; day: number };
const fmt = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((n) => String(n).padStart(2, "0")).join(":"); };
export function ReadingPanel(p: Props) {
  const [status, setStatus] = useState(p.initial), [done, setDone] = useState(p.done), [ask, setAsk] = useState(false), [busy, setBusy] = useState(false), [err, setErr] = useState(""), [queued, setQueued] = useState(false);
  const [left, setLeft] = useState<number | null>(null), key = useRef(crypto.randomUUID());
  useEffect(() => { // countdown uses the server's clock offset, not the device clock (BR-T1)
    const off = Date.parse(p.serverNow) - Date.now(), end = Date.parse(p.endsAt);
    const tick = () => setLeft(end - (Date.now() + off)); tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [p.serverNow, p.endsAt]);
  function applyOptimistic(action: "start" | "finish" | "undo") {
    if (action === "start") setStatus("reading");
    if (action === "finish") { setStatus("completed"); setDone((d) => d + 1); setAsk(false); }
    if (action === "undo") { setStatus("assigned"); setDone((d) => d - 1); key.current = crypto.randomUUID(); setQueued(false); }
  }
  /** Offline-first (BR-11/O1..O3): a network failure queues the action in IndexedDB and updates the UI optimistically
   * — it will reach the server once the connection returns, using the same idempotency key, so it can't double-apply.
   * An actual server rejection (day closed, etc.) is shown as an error instead and nothing is queued. */
  async function act(action: "start" | "finish" | "undo") {
    setBusy(true); setErr("");
    const endpoint = `/api/reading/${action}`, body = { assignmentId: p.assignmentId, idempotencyKey: key.current, clientTime: new Date().toISOString() };
    let offline = false;
    try {
      const r = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) { setErr(k.err); setBusy(false); return; }
    } catch { offline = true; }
    if (offline) { await enqueue({ idempotencyKey: key.current, endpoint, body }); setQueued(true); }
    applyOptimistic(action);
    setBusy(false);
  }
  const btn = "min-h-14 w-full rounded-2xl px-6 text-lg font-semibold disabled:opacity-60";
  return (
    <section className="grid gap-5">
      <div className="rounded-3xl border border-line bg-surface p-8 text-center">
        <p className="text-muted">{k.day} {p.day}</p>
        {p.role === "backup" && <p className="font-semibold text-dawn-text">{k.backupFor}</p>}
        <p className="text-6xl font-bold text-primary">{k.part} {p.part}</p>
        <p className="mt-2 text-muted">{k.mine}</p>
        <p className="mt-3 font-semibold">{(k as Record<string, string>)[status] ?? status}</p>
        {queued && <p className="mt-1 text-sm text-dawn-text">{k.queued}</p>}
      </div>
      {status === "assigned" && <button disabled={busy} onClick={() => act("start")} className={`${btn} bg-primary text-on-primary`}>{k.start}</button>}
      {status === "reading" && !ask && <button disabled={busy} onClick={() => setAsk(true)} className={`${btn} bg-primary text-on-primary`}>{k.finish}</button>}
      {status === "reading" && ask && (
        <div className="grid gap-3 rounded-2xl border border-line p-4"><p>{k.confirmQ}</p>
          <div className="flex gap-3"><button disabled={busy} onClick={() => act("finish")} className={`${btn} bg-primary text-on-primary`}>{k.yes}</button><button onClick={() => setAsk(false)} className={`${btn} border border-line`}>{k.back}</button></div></div>)}
      {status === "completed" && <button disabled={busy} onClick={() => act("undo")} className="min-h-11 text-muted underline">{k.undo}</button>}
      {err && <p role="alert" className="text-danger">{err}</p>}
      <div className="rounded-2xl border border-line bg-surface p-4">
        <p className="text-sm text-muted">{k.left}</p><p dir="ltr" className="text-3xl font-bold tabular-nums">{left === null ? "--:--:--" : fmt(left)}</p>
        <p className="mt-3 text-sm text-muted">{k.progress}: {done}/{p.total}</p>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-line"><div className="h-full bg-primary" style={{ width: `${p.total ? (done / p.total) * 100 : 0}%` }} /></div>
      </div>
    </section>
  );
}
