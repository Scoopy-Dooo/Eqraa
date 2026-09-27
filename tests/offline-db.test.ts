import "fake-indexeddb/auto";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { enqueue, queueCount, flushQueue } from "../src/lib/offline-db";
describe("offline queue (client-side, BR-O1)", () => {
  beforeEach(() => { vi.restoreAllMocks(); });
  it("queues and flushes in FIFO order, dequeuing only what the server accepted", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => { calls.push(url); return { ok: true, status: 200 } as Response; }));
    await enqueue({ idempotencyKey: "k1", endpoint: "/api/reading/finish", body: { assignmentId: "a" } });
    await enqueue({ idempotencyKey: "k2", endpoint: "/api/reading/undo", body: { assignmentId: "a" } });
    expect(await queueCount()).toBe(2);
    await flushQueue();
    expect(calls).toEqual(["/api/reading/finish", "/api/reading/undo"]); // order preserved: finish before its undo
    expect(await queueCount()).toBe(0);
  });
  it("stops at the first still-offline action and retries it next time, without skipping ahead", async () => {
    let attempt = 0;
    vi.stubGlobal("fetch", vi.fn(async () => { attempt++; if (attempt === 1) throw new TypeError("network"); return { ok: true, status: 200 } as Response; }));
    await enqueue({ idempotencyKey: "k3", endpoint: "/api/reading/finish", body: {} });
    await enqueue({ idempotencyKey: "k4", endpoint: "/api/reading/undo", body: {} });
    await flushQueue();
    expect(await queueCount()).toBe(2); // first call failed, so nothing was sent out of order
    await flushQueue();
    expect(await queueCount()).toBe(0);
  });
  it("drops an action the server will never accept (already_completed/404) instead of retrying forever", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 409 }) as Response));
    await enqueue({ idempotencyKey: "k5", endpoint: "/api/reading/finish", body: {} });
    await flushQueue();
    expect(await queueCount()).toBe(0);
  });
  it("keeps a genuine server error queued rather than silently dropping a real reading", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500 }) as Response));
    await enqueue({ idempotencyKey: "k6", endpoint: "/api/reading/finish", body: {} });
    await flushQueue();
    expect(await queueCount()).toBe(1);
  });
});
