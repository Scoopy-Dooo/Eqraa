"use client";
function urlBase64ToUint8Array(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4), b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64), arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}
export async function subscribeToPush(): Promise<"subscribed" | "unsupported" | "denied" | "no-key"> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return "denied";
  const reg = await navigator.serviceWorker.register("/sw.js");
  const { publicKey } = await (await fetch("/api/push/subscribe")).json();
  if (!publicKey) return "no-key";
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
  const json = sub.toJSON();
  await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys, device: navigator.userAgent.slice(0, 100) }) });
  return "subscribed";
}
