import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { getAdmin } from "@/lib/rbac";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ad } from "@/i18n/admin";
export const dynamic = "force-dynamic";
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await currentUser())) redirect("/login");
  const a = await getAdmin();
  if (!a) redirect("/home"); // authorization is enforced here and again in every API route
  const links = [["/admin", ad.nav.dashboard, true], ["/admin/daily", ad.nav.daily, true], ["/admin/groups", ad.nav.groups, true], ["/admin/users", ad.nav.users, a.can("users:manage")], ["/admin/history", ad.nav.history, true],
    ["/admin/notifications", "الإشعارات", a.can("readings:manage")],
    ["/admin/audit", ad.nav.audit, a.can("audit:read")], ["/admin/admins", ad.nav.admins, a.can("admins:manage")], ["/home", ad.nav.app, true]] as const;
  return (
    <div className="mx-auto min-h-dvh max-w-3xl px-4 pb-16 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between py-2"><div className="flex items-center gap-2"><Logo size={32} /><b>{ad.title}</b></div><ThemeToggle /></header>
      <nav aria-label="admin" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-2">
        {links.filter((l) => l[2]).map(([href, label]) => <a key={href} href={href} className="min-h-11 shrink-0 rounded-full border border-line px-4 py-2 text-sm">{label}</a>)}
      </nav>
      <div id="main">{children}</div>
    </div>
  );
}
