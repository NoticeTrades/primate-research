import Link from 'next/link';
import {
  DASHBOARD_GUIDE_INTRO,
  DASHBOARD_GUIDE_PUTTING_IT_TOGETHER,
  DASHBOARD_GUIDE_SECTIONS,
} from '../../../data/dashboard-getting-started';

export default function GettingStartedPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-16">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-400/90">Dashboard</p>
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{DASHBOARD_GUIDE_INTRO.title}</h1>
        <p className="text-sm text-zinc-400 max-w-3xl leading-relaxed">{DASHBOARD_GUIDE_INTRO.subtitle}</p>
        <p className="text-xs text-zinc-500 max-w-3xl leading-relaxed border-l-2 border-amber-500/40 pl-3">
          {DASHBOARD_GUIDE_INTRO.disclaimer}
        </p>
      </header>

      <section className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-blue-950/40 to-zinc-900/50 p-5 md:p-6">
        <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider mb-3">Jump to a tool</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {DASHBOARD_GUIDE_SECTIONS.map((s) => (
            <Link
              key={s.id}
              href={s.href}
              className="group rounded-xl border border-zinc-700/80 bg-zinc-950/50 px-4 py-3 transition-colors hover:border-blue-500/40 hover:bg-zinc-900/70"
            >
              <span className="block text-sm font-semibold text-white group-hover:text-blue-200">{s.title}</span>
              <span className="mt-1 block text-xs text-zinc-500 line-clamp-2">{s.whatItIs.slice(0, 120)}…</span>
              <span className="mt-2 inline-flex text-xs font-medium text-blue-400/90">Open →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 md:p-6">
        <h2 className="text-lg font-semibold text-white mb-2">Why this matters for indices</h2>
        <p className="text-sm text-zinc-400 leading-relaxed max-w-3xl">
          Index futures (NQ, ES, etc.) embed expectations for earnings, rates, and risk appetite. Macro releases move the
          <span className="text-zinc-300"> policy rate path</span> and{' '}
          <span className="text-zinc-300">growth/inflation mix</span> that investors use to discount future cash flows.
          This dashboard separates <strong className="text-zinc-200">price</strong> (main page) from{' '}
          <strong className="text-zinc-200">drivers</strong> (CPI, Fed, labor) and{' '}
          <strong className="text-zinc-200">multiples</strong> (Valuation — how cheap or rich index ETFs look vs history)
          so you can line up narrative vs tape.
        </p>
      </section>

      <div className="space-y-8">
        {DASHBOARD_GUIDE_SECTIONS.map((s) => (
          <article
            key={s.id}
            id={s.id}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 md:p-6 scroll-mt-24"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">{s.title}</h2>
                <Link
                  href={s.href}
                  className="text-sm text-blue-400 hover:text-blue-300 hover:underline mt-1 inline-block"
                >
                  Go to {s.shortLabel} →
                </Link>
              </div>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed mb-4">{s.whatItIs}</p>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90 mb-2">How to use it</h3>
                <ul className="space-y-2 text-sm text-zinc-300 list-disc pl-5">
                  {s.howToUse.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400/90 mb-2">
                  Markets & indices
                </h3>
                <ul className="space-y-2 text-sm text-zinc-300 list-disc pl-5">
                  {s.indicesAndMarkets.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        ))}
      </div>

      <section className="rounded-2xl border border-zinc-700/80 bg-zinc-950/60 p-5 md:p-6">
        <h2 className="text-lg font-semibold text-white mb-3">{DASHBOARD_GUIDE_PUTTING_IT_TOGETHER.title}</h2>
        <div className="space-y-3 text-sm text-zinc-400 leading-relaxed max-w-3xl mb-6">
          {DASHBOARD_GUIDE_PUTTING_IT_TOGETHER.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Quick checklist</h3>
        <ul className="grid sm:grid-cols-2 gap-2 text-sm text-zinc-300">
          {DASHBOARD_GUIDE_PUTTING_IT_TOGETHER.checklist.map((item) => (
            <li key={item} className="flex gap-2 items-start">
              <span className="text-emerald-500 mt-0.5">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-center text-xs text-zinc-600 max-w-2xl mx-auto">
        Questions about methodology are noted on each sub-page (sources, disclaimers). When in doubt, cross-check
        against official releases and your own risk rules.
      </p>
    </div>
  );
}
