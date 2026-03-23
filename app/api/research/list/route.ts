import { NextResponse } from 'next/server';
import { researchArticles, generateSlug } from '../../../../data/research';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Parse display dates like "Mar 23, 2026" for reliable sorting across runtimes. */
function parseResearchDateMs(dateStr?: string): number {
  if (!dateStr) return 0;
  const trimmed = dateStr.trim();
  const fromNative = new Date(trimmed);
  if (Number.isFinite(fromNative.getTime())) return fromNative.getTime();

  const m = trimmed.match(/^([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{4})$/);
  if (m) {
    const months: Record<string, number> = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
    };
    const mon = months[m[1]];
    if (mon != null) {
      return new Date(Number(m[3]), mon, Number(m[2])).getTime();
    }
  }
  return 0;
}

/**
 * Public metadata for dashboard / nav — always matches server `data/research.ts` on each request
 * (no stale client bundle).
 */
export async function GET() {
  const articles = researchArticles
    .map((a) => {
      const slug = a.slug || generateSlug(a.title);
      return {
        title: a.title,
        description: a.description || '',
        date: a.date ?? null,
        category: a.category,
        slug,
        sortTs: parseResearchDateMs(a.date),
      };
    })
    .sort((x, y) => y.sortTs - x.sortTs);

  return NextResponse.json(
    { articles },
    {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
      },
    }
  );
}
