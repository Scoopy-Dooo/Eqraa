import { currentUser } from "@/lib/session";
import { db } from "@/db";
import { khatmahView } from "@/lib/khatmah";
import { rollover } from "@/lib/rollover";
import { aladhan } from "@/lib/prayer";
import { kh } from "@/i18n/khatmah";

const k = kh.ar;

function statusText(status: string): string {
  const map: Record<string, string> = {
    assigned: k.statusAssigned,
    reading: k.statusReading,
    completed: k.statusCompleted,
    missed: k.statusMissed,
    backup_assigned: k.statusBackupAssigned,
    completed_by_backup: k.statusCompletedByBackup,
  };
  return map[status] || status;
}

function Countdown({ endsAt }: { endsAt: string }) {
  const ms = Date.parse(endsAt) - Date.now();
  const h = Math.floor(ms / 36e5);
  const m = Math.floor((ms % 36e5) / 6e4);
  return (
    <div className="text-center">
      <p className="text-sm text-muted">{k.timeLeft}</p>
      <p className="text-3xl font-bold text-primary">
        {h}:{m.toString().padStart(2, "0")}
      </p>
    </div>
  );
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>{k.progressBar}</span>
        <span className="font-semibold">
          {done}/{total}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-line">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default async function KhatmahPage() {
  const me = (await currentUser())!;
  let view = await khatmahView(db, me.id);

  // Lazy rollover if cron is late (same pattern as home page)
  if (view.state === "not_started") {
    const [membership] = await db.query.groupMembers.findMany({
      where: (gm, { eq, isNull, and }) =>
        and(eq(gm.userId, me.id), isNull(gm.leftAt)),
      with: { group: true },
    });
    if (membership) {
      await rollover(db, aladhan, new Date(), { groupId: membership.groupId });
      view = await khatmahView(db, me.id);
    }
  }

  if (view.state === "no_group") {
    return (
      <main className="mt-6 space-y-6">
        <h1 className="text-2xl font-bold">{k.khatmahTitle}</h1>
        <section className="rounded-2xl border border-line bg-surface p-6">
          <h2 className="text-xl font-bold">{k.noGroup}</h2>
          <p className="mt-2 text-muted">{k.noGroupBody}</p>
        </section>
      </main>
    );
  }

  if (view.state === "not_started") {
    return (
      <main className="mt-6 space-y-6">
        <h1 className="text-2xl font-bold">{k.khatmahTitle}</h1>
        <section className="rounded-2xl border border-line bg-surface p-6">
          <h2 className="text-xl font-bold">{view.groupName}</h2>
          <p className="mt-2 text-muted">{k.notStartedYetBody}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="mt-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{k.khatmahTitle}</h1>
        <p className="text-muted">{view.groupName}</p>
      </div>

      <section className="rounded-2xl border border-line bg-surface p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted">{k.dayNum}</p>
            <p className="text-2xl font-bold">{view.dayNumber}</p>
          </div>
          <Countdown endsAt={view.endsAt} />
        </div>
        <ProgressBar done={view.progress.done} total={view.progress.total} />
      </section>

      <div className="space-y-3">
        {view.parts.map((p) => (
          <section
            key={p.partNumber}
            className={`rounded-xl border p-4 ${
              p.isCurrentUser
                ? "border-primary bg-primary/5"
                : "border-line bg-surface"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">
                    {k.part} {p.partNumber}
                  </span>
                  {p.isCurrentUser && (
                    <span className="text-xs font-semibold text-primary">
                      (أنت)
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted">
                  {k.reader}: {p.readerName}
                </p>
                {p.backupName && (
                  <p className="mt-1 text-sm text-muted">
                    {k.backup}: {p.backupName}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span
                  className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                    ["completed", "completed_by_backup"].includes(p.status)
                      ? "bg-primary/10 text-primary"
                      : p.status === "reading"
                      ? "bg-dawn/10 text-dawn-text"
                      : p.status === "missed"
                      ? "bg-danger/10 text-danger"
                      : "bg-muted/10 text-muted"
                  }`}
                >
                  {statusText(p.status)}
                </span>
              </div>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
