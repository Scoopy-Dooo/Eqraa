"use client";
import { usePathname } from "next/navigation";
import { ui } from "@/i18n/ui";
const items = [["/home", ui.ar.nav.home], ["/khatmah", ui.ar.nav.khatmah], ["/ranking", ui.ar.nav.ranking], ["/history", ui.ar.nav.history], ["/profile", ui.ar.nav.profile]] as const;
const live = new Set(["/home", "/ranking"]); // routes enabled as phases ship
export function BottomNav() {
  const path = usePathname();
  return (
    <nav aria-label="main" className="fixed inset-x-0 bottom-0 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-xl">
        {items.map(([href, label]) => (
          <li key={href} className="flex-1">
            {live.has(href) ? (
              <a href={href} aria-current={path === href ? "page" : undefined} className={`flex min-h-14 items-center justify-center text-sm ${path === href ? "font-bold text-primary" : "text-muted"}`}>{label}</a>
            ) : (
              <span aria-disabled="true" title={ui.ar.soon} className="flex min-h-14 items-center justify-center text-sm text-muted opacity-50">{label}</span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
