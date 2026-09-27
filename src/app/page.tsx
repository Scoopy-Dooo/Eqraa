import { Logo } from "@/components/Logo";
import { DawnArc } from "@/components/landing/DawnArc";
import { TimelineSteps } from "@/components/landing/TimelineSteps";
import { JuzGrid } from "@/components/landing/JuzGrid";
import { RotationDiagram } from "@/components/landing/RotationDiagram";
import { StreakMotif } from "@/components/landing/StreakMotif";
import { LeaderboardMock } from "@/components/landing/LeaderboardMock";
import { NotificationMock } from "@/components/landing/NotificationMock";
import { messages } from "@/i18n/messages";
import { lp } from "@/i18n/landing";
const t = messages.ar, l = lp.ar;
const Section = ({ title, children, id }: { title?: string; children: React.ReactNode; id?: string }) => (
  <section id={id} className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
    {title && <h2 className="mb-8 text-center text-2xl font-bold sm:text-3xl">{title}</h2>}
    {children}
  </section>
);
const Divider = () => <div className="border-t border-line py-6"><DawnArc variant="divider" /></div>;
const CTAButtons = () => (
  <div className="flex flex-wrap justify-center gap-3">
    <a href="/register" className="min-h-12 rounded-xl bg-primary px-6 py-3 font-semibold text-on-primary">{t.signup}</a>
    <a href="/login" className="min-h-12 rounded-xl border border-line px-6 py-3 font-semibold">{t.login}</a>
  </div>
);
export default function Landing() {
  return (
    <main id="main">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6"><Logo size={40} /><span className="text-xl font-bold">{t.brand}</span></header>
      <section className="mx-auto grid max-w-2xl gap-6 px-6 pb-10 pt-4 text-center">
        <DawnArc />
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">{l.hero.h1}</h1>
        <p className="mx-auto max-w-[42ch] text-lg text-muted">{l.hero.sub}</p>
        <CTAButtons />
      </section>

      <Divider />
      <Section title={l.how.title}><TimelineSteps steps={[...l.how.steps]} /></Section>

      <Divider />
      <Section title={l.group.title}>
        <div className="grid items-center gap-8 sm:grid-cols-2">
          <p className="text-lg text-muted">{l.group.body}</p>
          <div className="grid gap-2 justify-items-center"><JuzGrid /><p className="text-sm text-muted">{l.group.caption}</p></div>
        </div>
      </Section>

      <Divider />
      <Section title={l.rotation.title}>
        <div className="grid items-center gap-8 sm:grid-cols-2">
          <RotationDiagram />
          <p className="text-lg text-muted">{l.rotation.body}</p>
        </div>
      </Section>

      <Divider />
      <Section title={l.streak.title}>
        <div className="grid items-center gap-8 sm:grid-cols-2">
          <p className="text-lg text-muted sm:order-2">{l.streak.body}</p>
          <div className="sm:order-1"><StreakMotif /></div>
        </div>
      </Section>

      <Divider />
      <Section title={l.leaderboard.title}>
        <div className="grid items-center gap-8 sm:grid-cols-2">
          <p className="text-lg text-muted">{l.leaderboard.body}</p>
          <LeaderboardMock />
        </div>
      </Section>

      <Divider />
      <Section title={l.notifications.title}>
        <div className="grid items-center gap-8 sm:grid-cols-2">
          <NotificationMock />
          <p className="text-lg text-muted">{l.notifications.body}</p>
        </div>
      </Section>

      <Divider />
      <Section title={l.privacy.title}><p className="mx-auto max-w-[55ch] text-center text-lg text-muted">{l.privacy.body}</p></Section>

      <Divider />
      <Section title={l.install.title}>
        <p className="mx-auto mb-6 max-w-[55ch] text-center text-lg text-muted">{l.install.body}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface p-5"><h3 className="font-bold">{l.install.ios.label}</h3><p className="mt-1 text-muted">{l.install.ios.body}</p></div>
          <div className="rounded-2xl border border-line bg-surface p-5"><h3 className="font-bold">{l.install.android.label}</h3><p className="mt-1 text-muted">{l.install.android.body}</p></div>
        </div>
      </Section>

      <Divider />
      <section className="mx-auto grid max-w-2xl gap-6 px-6 py-16 pb-24 text-center">
        <h2 className="text-3xl font-bold">{l.cta.title}</h2>
        <p className="mx-auto max-w-[42ch] text-lg text-muted">{l.cta.body}</p>
        <CTAButtons />
      </section>
    </main>
  );
}
