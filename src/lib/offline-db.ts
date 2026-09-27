"use client";
/**
 * A small FIFO queue in IndexedDB for reading actions made while offline. Order matters (e.g. a finish must reach
 * the server before an undo of it), so the store uses an auto-incrementing key rather than the idempotency key —
 * two different actions on the same part must never overwrite each other locally (BR-O1..O3, Case 8).
 */
export type QueuedAction = { idempotencyKey: string; endpoint: string; body: Record<string, unknown> };
function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open("eqraa", 1);
    r.onupgradeneeded = () => { r.result.createObjectStore("queue", { autoIncrement: true }); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
export async function enqueue(a: QueuedAction) {
  const db = await open();
  await new Promise<void>((res, rej) => { const tx = db.transaction("queue", "readwrite"); tx.objectStore("queue").add(a); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
}
async function listQueue(): Promise<{ key: IDBValidKey; value: QueuedAction }[]> {
  const db = await open();
  return new Promise((res, rej) => {
    const tx = db.transaction("queue", "readonly"), items: { key: IDBValidKey; value: QueuedAction }[] = [];
    const req = tx.objectStore("queue").openCursor();
    req.onsuccess = () => { const c = req.result; if (c) { items.push({ key: c.key, value: c.value }); c.continue(); } else res(items); };
    req.onerror = () => rej(req.error);
  });
}
async function dequeue(key: IDBValidKey) {
  const db = await open();
  await new Promise<void>((res, rej) => { const tx = db.transaction("queue", "readwrite"); tx.objectStore("queue").delete(key); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
}
export const queueCount = async () => (await listQueue()).length;
/** Replays queued actions in order. Stops at the first one that still can't reach the server (still offline). A
 * rejection the server will never accept (e.g. the day closed) is dropped rather than retried forever. */
export async function flushQueue() {
  for (const { key, value } of await listQueue()) {
    try {
      const r = await fetch(value.endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value.body) });
      if (r.ok || r.status === 409 || r.status === 404) await dequeue(key);
      else break; // unexpected error: leave queued, don't risk silently dropping a real reading
    } catch { break; } // still offline
  }
}
