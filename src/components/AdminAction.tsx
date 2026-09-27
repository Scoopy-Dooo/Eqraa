"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ad } from "@/i18n/admin";
export type Field = { name: string; label: string; type?: "text" | "number" | "date" | "select"; options?: { value: string; label: string }[]; value?: string };
const input = "min-h-11 w-full rounded-xl border border-line bg-surface px-3";
export function AdminAction({ endpoint, body = {}, label, fields = [], confirm, danger }: { endpoint: string; body?: Record<string, unknown>; label: string; fields?: Field[]; confirm?: string; danger?: boolean }) {
  const [open, setOpen] = useState(false), [err, setErr] = useState(""), [busy, setBusy] = useState(false), router = useRouter();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setErr("");
    const f = new FormData(e.currentTarget), extra = Object.fromEntries(fields.map((x) => [x.name, x.type === "number" ? Number(f.get(x.name)) : String(f.get(x.name) ?? "")]));
    const r = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, ...extra }) });
    if (r.ok) { setOpen(false); router.refresh(); } else { const j = await r.json().catch(() => ({})); setErr(ad.err[j.error] ?? ad.err.generic); }
    setBusy(false);
  }
  if (!open) return <button type="button" onClick={() => setOpen(true)} className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${danger ? "border-danger text-danger" : "border-line"}`}>{label}</button>;
  return (
    <form onSubmit={submit} className="grid gap-2 rounded-xl border border-line bg-surface p-3">
      {confirm && <p>{confirm}</p>}
      {fields.map((f) => (
        <label key={f.name} className="grid gap-1 text-sm">{f.label}
          {f.type === "select"
            ? <select name={f.name} required defaultValue="" className={input}><option value="" disabled>—</option>{f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
            : <input name={f.name} type={f.type ?? "text"} required defaultValue={f.value} dir={f.type === "text" ? "ltr" : undefined} className={input} />}
        </label>))}
      {err && <p role="alert" className="text-danger">{err}</p>}
      <div className="flex gap-2"><button disabled={busy} className={`min-h-11 flex-1 rounded-xl px-3 font-semibold text-on-primary ${danger ? "bg-danger" : "bg-primary"}`}>{ad.ok}</button><button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-xl border border-line px-3">{ad.cancel}</button></div>
    </form>
  );
}
