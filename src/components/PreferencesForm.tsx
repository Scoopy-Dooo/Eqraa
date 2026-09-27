"use client";
import { useEffect, useState } from "react";
import { OPTIONAL_TYPES, TYPE_LABELS } from "@/i18n/templates";
export function PreferencesForm() {
  const [prefs, setPrefs] = useState<Record<string, boolean> | null>(null);
  useEffect(() => { fetch("/api/notifications/preferences").then((r) => r.json()).then(setPrefs); }, []);
  async function toggle(type: string) {
    const next = !prefs![type]; setPrefs((p) => ({ ...p!, [type]: next }));
    await fetch("/api/notifications/preferences", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, enabled: next }) });
  }
  if (!prefs) return null;
  return (
    <section className="grid gap-2 rounded-2xl border border-line bg-surface p-4">
      <h2 className="font-bold">تخصيص الإشعارات</h2>
      <p className="text-sm text-muted">الإشعارات المهمة (فجر، جزء فائت، انقطاع الـStreak) لا يمكن إيقافها.</p>
      {OPTIONAL_TYPES.map((t) => (
        <label key={t} className="flex items-center justify-between py-1"><span>{TYPE_LABELS[t]}</span><input type="checkbox" checked={prefs[t]} onChange={() => toggle(t)} className="size-6 accent-[var(--primary)]" /></label>))}
    </section>
  );
}
