"use client";
import { useEffect, useState } from "react";
import { flushQueue, queueCount } from "@/lib/offline-db";
/** Registers the service worker (offline shell + push) and flushes any queued offline reading actions
 * on load and whenever the browser regains connectivity. Shows a small banner while anything is pending. */
export function SyncManager() {
  const [pending, setPending] = useState(0);
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    const refresh = () => queueCount().then(setPending).catch(() => {});
    const sync = () => flushQueue().catch(() => {}).then(refresh);
    sync();
    window.addEventListener("online", sync);
    const id = setInterval(refresh, 15_000);
    return () => { window.removeEventListener("online", sync); clearInterval(id); };
  }, []);
  if (!pending) return null;
  return <p role="status" className="fixed inset-x-0 top-0 z-50 bg-dawn py-1.5 text-center text-sm font-semibold text-on-primary" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>بانتظار الاتصال بالإنترنت لمزامنة {pending} عملية</p>;
}
