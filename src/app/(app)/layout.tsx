import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BottomNav } from "@/components/BottomNav";
import { Bell } from "@/components/Bell";
import { SyncManager } from "@/components/SyncManager";
export const dynamic = "force-dynamic";
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await currentUser();
  if (!me) redirect("/login");
  return (
    <div className="mx-auto min-h-dvh max-w-xl px-5 pb-24 pt-[max(1rem,env(safe-area-inset-top))]">
      <SyncManager />
      <header className="flex items-center justify-between py-2"><Logo size={36} /><div className="flex items-center gap-2"><Bell userId={me.id} /><ThemeToggle /></div></header>
      <div id="main">{children}</div>
      <BottomNav />
    </div>
  );
}
