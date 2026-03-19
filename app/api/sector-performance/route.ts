import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type SectorPerf = {
  sector: string;
  changePercent: number;
};

function parsePercent(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v !== 'string') return 0;
  const n = parseFloat(v.replace(/[%()+]/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

const CACHE_MS = 60_000;
let cache: { until: number; rows: SectorPerf[] } | null = null;

export async function GET() {
  const now = Date.now();
  if (cache && cache.until > now) {
    return NextResponse.json({ sectors: cache.rows }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  }

  const apiKey = process.env.FMP_API_KEY || process.env.FINANCIAL_MODELING_PREP_API_KEY || 'demo';
  try {
    const res = await fetch(
      `https://financialmodelingprep.com/api/v3/sectors-performance?apikey=${encodeURIComponent(apiKey)}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return NextResponse.json({ sectors: [] as SectorPerf[] }, { status: 200 });

    const body = (await res.json()) as Record<string, unknown>;
    const raw = Array.isArray(body.sectorPerformance) ? body.sectorPerformance : [];
    const sectors: SectorPerf[] = raw
      .map((r) => {
        if (!r || typeof r !== 'object') return null;
        const obj = r as Record<string, unknown>;
        const sector = String(obj.sector || '').trim();
        if (!sector) return null;
        return {
          sector,
          changePercent: parsePercent(obj.changesPercentage),
        };
      })
      .filter((x): x is SectorPerf => x !== null)
      .sort((a, b) => b.changePercent - a.changePercent);

    cache = { until: now + CACHE_MS, rows: sectors };
    return NextResponse.json({ sectors }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch {
    return NextResponse.json({ sectors: [] as SectorPerf[] }, { status: 200 });
  }
}

