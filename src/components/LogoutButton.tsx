"use client";
import { ui } from "@/i18n/ui";
export function LogoutButton() {
  return <button type="button" className="min-h-11 rounded-xl border border-line px-4 text-sm" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); location.href = "/"; }}>{ui.ar.logout}</button>;
}
