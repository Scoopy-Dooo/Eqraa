import { currentUser } from "@/lib/session";
import { db } from "@/db";
import { dayDetail } from "@/lib/history";
import { hist } from "@/i18n/history";
import { kh } from "@/i18n/khatmah";
import { notFound } from "next/navigation";
import Link from "next/link";

const h = hist.ar;
const k = kh.ar;

function statusText(status: string): string {
  const map: Record<string, string> = {
    completed: h.statusCompleted,
    completed_by_backup: h.statusCompletedByBackup,
    missed: h.statusMissed,
    assigned: "لم يُقرأ",
    reading: "لم يُقرأ",
    backup_assigned: "لم يُقرأ",
  };
  return map[status] || status;
}

export default async function DayDetailPage({
  params,
}: {
  params: Promise<{ dayId: string }>;
}) {
  const me = (await currentUser())!;
  const { dayId } = await params;
  
  const detail = await dayDetail(db, me.id, dayId);

  if (!detail) {
    notFound();
  }

  const missedParts = detail.parts.filter((p) => p.status === "missed");

  return (
    <main className="mt-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/history"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line"
        >
          ←
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{detail.date}</h1>
          <p className="text-muted">{detail.groupName}</p>
        </div>
      </div>

      {/* All parts */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold">{k.khatmahTitle}</h2>
        {detail.parts.map((p) => (
          <div
            key={p.partNumber}
            className="rounded-xl border border-line bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-bold">
                  {k.part} {p.partNumber}
                </p>
                <p className="text-sm text-muted">
                  {h.reader}: {p.readerName}
                </p>
                {p.backupName && (
                  <p className="text-sm text-muted">
                    {h.backup}: {p.backupName}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span
                  className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                    ["completed", "completed_by_backup"].includes(p.status)
                      ? "bg-primary/10 text-primary"
                      : p.status === "missed"
                      ? "bg-danger/10 text-danger"
                      : "bg-muted/10 text-muted"
                  }`}
                >
                  {statusText(p.status)}
                </span>
                {p.completedByBackup && (
                  <p className="mt-1 text-xs text-muted">بواسطة البديل</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Missed parts */}
      {missedParts.length > 0 && (
        <section className="rounded-2xl border border-danger bg-danger/5 p-6">
          <h2 className="text-lg font-bold text-danger">{h.missedParts}</h2>
          <div className="mt-4 space-y-2">
            {missedParts.map((p) => (
              <div key={p.partNumber} className="text-sm">
                <span className="font-semibold">
                  {k.part} {p.partNumber}
                </span>
                <span className="mr-2 text-muted">— {p.readerName}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Makeup readings */}
      {detail.makeups.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">{h.makeupReadings}</h2>
          {detail.makeups.map((m, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-primary bg-primary/5 p-4"
            >
              <p className="font-semibold">
                {k.part} {m.partNumber}
              </p>
              <p className="text-sm text-muted">
                {h.madeUpBy}: {m.madeUpBy}
              </p>
              <p className="text-xs text-muted">
                {new Date(m.madeUpAt).toLocaleString("ar-SD", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
