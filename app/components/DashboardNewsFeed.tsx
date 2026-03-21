'use client';

import { useEffect, useMemo, useState } from 'react';

type MarketNewsItem = {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
};

const REFRESH_MS = 30_000;

function formatPublished(dateValue: string): string {
  if (!dateValue) return '';
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function getHeadlineTopicTags(title: string): Array<{ label: string; className: string }> {
  const t = title.toLowerCase();
  const tags: Array<{ label: string; className: string }> = [];
  const add = (label: string, className: string) => tags.push({ label, className });

  if (/\b(es|e-mini s&p|s&p ?500|spx|spy)\b/.test(t)) add('ES / S&P 500', 'border-blue-500/40 bg-blue-500/15 text-blue-200');
  if (/\b(nq|nasdaq|nasdaq-?100|ndx|qqq)\b/.test(t)) add('NQ / Nasdaq', 'border-indigo-500/40 bg-indigo-500/15 text-indigo-200');
  if (/\b(ym|dow|dow jones|djia)\b/.test(t)) add('YM / Dow', 'border-sky-500/40 bg-sky-500/15 text-sky-200');
  if (/\b(rty|russell ?2000|iwm)\b/.test(t)) add('RTY / Russell', 'border-cyan-500/40 bg-cyan-500/15 text-cyan-200');
  if (/\b(dxy|us dollar|dollar index|forex|fx|eur\/usd|usd\/jpy|gbp\/usd)\b/.test(t)) add('DXY / FX', 'border-violet-500/40 bg-violet-500/15 text-violet-200');
  if (/\b(cl|wti|crude|brent|opec|oil)\b/.test(t)) add('Crude Oil', 'border-amber-500/40 bg-amber-500/15 text-amber-200');
  if (/\b(gc|gold)\b/.test(t)) add('Gold', 'border-yellow-500/40 bg-yellow-500/15 text-yellow-200');
  if (/\b(si|silver)\b/.test(t)) add('Silver', 'border-zinc-400/50 bg-zinc-500/10 text-zinc-200');
  if (/\b(bitcoin|btc|ethereum|eth|crypto|coinbase)\b/.test(t)) add('Crypto', 'border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-200');
  if (/\b(geopolitic|war|conflict|missile|sanction|middle east|russia|china|taiwan)\b/.test(t)) add('Geopolitics', 'border-rose-500/40 bg-rose-500/15 text-rose-200');
  if (/\b(fed|fomc|interest rate|treasury|bond yield|cpi|inflation|jobs report|nfp)\b/.test(t)) add('Rates / Macro', 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200');
  if (/\b(earnings|guidance|revenue|eps|quarter results)\b/.test(t)) add('Earnings', 'border-orange-500/40 bg-orange-500/15 text-orange-200');
  if (/\b(apple|microsoft|nvidia|amazon|meta|tesla|google|alphabet)\b/.test(t)) add('Mega Caps', 'border-teal-500/40 bg-teal-500/15 text-teal-200');

  return tags.slice(0, 4);
}

export default function DashboardNewsFeed() {
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<MarketNewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const queryLabel = useMemo(() => {
    const q = query.trim();
    return q ? `Topic: ${q}` : 'Trending: top companies + geopolitics';
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    const fetchNews = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('limit', '12');
        if (query.trim()) params.set('q', query.trim());
        const res = await fetch(`/api/market-news?${params.toString()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const body = (await res.json()) as { items?: MarketNewsItem[] };
        if (cancelled) return;
        setItems(Array.isArray(body.items) ? body.items : []);
        setLastUpdated(new Date());
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchNews();
    const timer = setInterval(fetchNews, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [query]);

  return (
    <section className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 shadow-xl">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Market news</h2>
        <p className="text-xs text-zinc-500 mt-1">Live feed for markets, megacaps, and geopolitical drivers</p>
      </div>

      <form
        className="mb-3"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(queryInput.trim());
        }}
      >
        <label className="block">
          <span className="text-xs text-zinc-500">Search topic</span>
          <div className="mt-1 flex gap-2">
            <input
              type="search"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="e.g. Nvidia earnings, tariffs, oil supply"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800/40 px-3 py-2 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Search
            </button>
          </div>
        </label>
      </form>

      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] text-zinc-500">{queryLabel}</p>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[11px] text-zinc-500">
              Updated {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setQueryInput('');
            }}
            className="text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-zinc-800/50 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-zinc-500">No market news found for this topic.</p>
      ) : (
        <ul className="space-y-2 max-h-[420px] overflow-auto pr-1">
          {items.map((item, i) => (
            <li key={`${item.url}-${i}`}>
              {(() => {
                const topicTags = getHeadlineTopicTags(item.title);
                return (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl border border-zinc-800 bg-zinc-950/30 p-3 transition-colors hover:border-zinc-700"
              >
                {topicTags.length > 0 && (
                  <div className="mb-1.5 flex flex-wrap gap-1.5">
                    {topicTags.map((tag) => (
                      <span
                        key={tag.label}
                        className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tag.className}`}
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-sm font-semibold text-zinc-100 line-clamp-2">{item.title}</p>
                <p className="mt-1 text-[11px] text-zinc-500">
                  {item.source}
                  {formatPublished(item.publishedAt) ? ` · ${formatPublished(item.publishedAt)}` : ''}
                </p>
              </a>
                );
              })()}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

