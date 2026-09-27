"use client";
import { useEffect, useState } from "react";
import { ui } from "@/i18n/ui";
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => { const d = document.documentElement.dataset.theme; setDark(d ? d === "dark" : matchMedia("(prefers-color-scheme: dark)").matches); }, []);
  function toggle() {
    const n = dark ? "light" : "dark";
    document.documentElement.dataset.theme = n;
    try { localStorage.setItem("eqraa-theme", n); } catch {}
    setDark(!dark);
  }
  return <button type="button" onClick={toggle} aria-pressed={dark} aria-label={ui.ar.theme} className="size-11 rounded-full border border-line text-lg">{dark ? "☀" : "☾"}</button>;
}
