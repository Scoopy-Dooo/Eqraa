export function TimelineSteps({ steps }: { steps: { title: string; body: string }[] }) {
  return (
    <ol className="grid gap-8 sm:grid-cols-3 sm:gap-6">
      {steps.map((s) => (
        <li key={s.title} className="grid gap-2 border-s-2 border-dawn ps-4 sm:border-s-0 sm:border-t-2 sm:pt-4 sm:ps-0">
          <h3 className="font-bold">{s.title}</h3>
          <p className="text-muted">{s.body}</p>
        </li>
      ))}
    </ol>
  );
}
