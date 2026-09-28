"use client";
import { useState } from "react";
import { messages } from "@/i18n/messages";
import { ui } from "@/i18n/ui";
import { AVATARS, Avatar } from "./Avatar";
import { stringifyAvatarConfig, AVATAR_PRESETS } from "@/lib/avataaars";
import { Logo } from "./Logo";
const t = messages.ar, u = ui.ar;
const field = "min-h-12 w-full rounded-xl border border-line bg-surface px-4 text-lg";
export function AuthForm({ mode }: { mode: "register" | "login" }) {
  const reg = mode === "register";
  const [gender, setGender] = useState<"male" | "female">("male");
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setErr("");
    const f = new FormData(e.currentTarget);
    const avatarConfig = AVATAR_PRESETS[gender][avatarIndex];
    const avatarKey = stringifyAvatarConfig({ ...avatarConfig, avatarStyle: "Circle" });
    const body = reg ? { firstName: f.get("firstName"), lastName: f.get("lastName") || undefined, phone: f.get("phone"), pin: f.get("pin"), gender, avatarKey } : { phone: f.get("phone"), pin: f.get("pin") };
    try {
      const r = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (r.ok) { location.href = "/home"; return; }
      const j = await r.json().catch(() => ({}));
      setErr(j.error === "rateLimited" ? u.rate : (t.err as Record<string, string>)[j.error] ?? u.generic);
    } catch { setErr(u.offline); }
    setBusy(false);
  }
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-10">
      <Logo size={48} />
      <form onSubmit={submit} className="flex flex-col gap-4">
        {reg && <>
          <label className="grid gap-1">{u.firstName}<input name="firstName" required maxLength={30} autoComplete="given-name" className={field} /></label>
          <label className="grid gap-1">{u.lastName}<input name="lastName" maxLength={30} autoComplete="family-name" className={field} /></label>
        </>}
        <label className="grid gap-1">{u.phone}<input name="phone" required type="tel" dir="ltr" inputMode="tel" autoComplete="tel" defaultValue="+249" className={field} /></label>
        <label className="grid gap-1">{u.pin}<input name="pin" required type="password" dir="ltr" inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete={reg ? "new-password" : "current-password"} className={field} /></label>
        {reg && <>
          <fieldset className="flex gap-3"><legend className="mb-1">{u.gender}</legend>
            {(["male", "female"] as const).map((g) => (
              <label key={g} className={`flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-xl border px-4 transition-colors ${gender === g ? "border-primary bg-primary/5 font-bold text-primary" : "border-line hover:border-primary/50"}`}>
                <input type="radio" name="gender" className="sr-only" checked={gender === g} onChange={() => { setGender(g); setAvatarIndex(0); }} />{u[g]}
              </label>))}
          </fieldset>
          <fieldset className="flex flex-wrap gap-3"><legend className="mb-1">{u.avatar}</legend>
            {AVATAR_PRESETS[gender].map((config, idx) => {
              const key = stringifyAvatarConfig({ ...config, avatarStyle: "Circle" });
              return (
                <label key={idx} className={`cursor-pointer rounded-full p-1 transition-all ${avatarIndex === idx ? "ring-2 ring-primary ring-offset-2" : "hover:ring-2 hover:ring-primary/30"}`}>
                  <input type="radio" name="avatar" className="sr-only" checked={avatarIndex === idx} onChange={() => setAvatarIndex(idx)} />
                  <Avatar k={key} size={52} />
                </label>
              );
            })}
          </fieldset>
        </>}
        {err && <p role="alert" className="text-danger">{err}</p>}
        <button disabled={busy} className="min-h-12 rounded-xl bg-primary px-6 font-semibold text-on-primary disabled:opacity-60">{reg ? u.register : u.login}</button>
      </form>
      <a href={reg ? "/login" : "/register"} className="text-center text-muted underline">{reg ? u.toLogin : u.toRegister}</a>
    </main>
  );
}
