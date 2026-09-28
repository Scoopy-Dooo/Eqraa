import { currentUser } from "@/lib/session";
import { db } from "@/db";
import { historyView } from "@/lib/history";
import { missedFor } from "@/lib/reading";
import { hist } from "@/i18n/history";
import { kh } from "@/i18n/khatmah";
import Link from "next/link";

const h = hist.ar;
const k = kh.ar;

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const me = (await currentUser())!;
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const perPage = 30;

  const { days, total } = await historyView(db, me.id, page, perPage);
  const missed = await missedFor(db, me.id, 10);

  const totalPages = Math.ceil(total / perPage);

  return (
    <main className="mt-6 space-y-6">
      <h1 className="text-2xl font-bold">{h.title}</h1>

      {/* User's missed parts */}
      {missed.length > 0 && (
        <section className="rounded-2xl border border-dawn bg-dawn/5 p-6">
          <h2 className="text-xl font-bold text-dawn-text">{h.yourMissed}</h2>
          <p className="mt-2 text-sm text-muted">{h.yourMissedDesc}</p>
          <div className="mt-4 space-y-2">
            {missed.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-xl border border-line bg-surface p-3"
              >
                <div>
                  <span className="font-semibold">
                    {k.part} {m.part}
                  </span>
                  <span className="mr-2 text-sm text-muted">{m.date}</span>
                </div>
                <a
                  href="/"
                  className="rounded-lg bg-primary px-3 py-1 text-sm font-semibold text-surface"
                >
                  {k.makeup}
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      {missed.length === 0 && (
        <section className="rounded-2xl border border-primary bg-primary/5 p-6">
          <p className="text-center text-primary">{h.noMissed}</p>
        </section>
      )}

      {/* Closed days list */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">{h.closedDays}</h2>

        {days.length === 0 && (
          <div className="rounded-2xl border border-line bg-surface p-12 text-center text-muted">
            {h.empty}
          </div>
        )}

        <div className="space-y-3">
          {days.map((d) => (
            <Link
              key={d.dayId}
              href={`/history/${d.dayId}`}
              className="block rounded-xl border border-line bg-surface p-4 transition-colors hover:border-primary"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="font-semibold">{d.date}</p>
                  <p className="text-sm text-muted">{d.groupName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {d.done}/{d.total}
                  </p>
                  <p
                    className={`text-xs ${
                      d.completed ? "text-primary" : "text-muted"
                    }`}
                  >
                    {d.completed ? h.completed : h.incomplete}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            {page > 1 && (
              <Link
                href={`/history?page=${page - 1}`}
                className="min-h-11 rounded-lg border border-line px-4 py-2 font-semibold"
              >
                {h.prev}
              </Link>
            )}
            <span className="px-4 text-sm text-muted">
              {h.page} {page} {h.of} {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`/history?page=${page + 1}`}
                className="min-h-11 rounded-lg border border-line px-4 py-2 font-semibold"
              >
                {h.next}
              </Link>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
