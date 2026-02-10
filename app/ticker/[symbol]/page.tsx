'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Navigation from '../../components/Navigation';
import MarketTicker from '../../components/MarketTicker';
import { researchArticles } from '../../../data/research';

interface CryptoData {
  symbol: string;
  name: string;
  description: string;
  currentPrice: number;
  priceChange24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  marketCap: number;
  fullyDilutedValuation: number;
  circulatingSupply: number;
  totalSupply: number;
  maxSupply: number | null;
  ath: number;
  athChangePercentage: number;
  atl: number;
  atlChangePercentage: number;
  image: string;
  links: {
    homepage: string;
    blockchain: string[];
  };
  categories: string[];
}

export default function TickerPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = (params.symbol as string).toUpperCase();
  const [cryptoData, setCryptoData] = useState<CryptoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'articles' | 'stats' | 'chart'>('stats');

  // Filter articles that mention this ticker
  const relatedArticles = researchArticles.filter((article) => {
    const searchText = `${article.title} ${article.description} ${article.content || ''}`.toLowerCase();
    return searchText.includes(symbol.toLowerCase()) || 
           (article.tags && article.tags.some(tag => tag.toLowerCase() === symbol.toLowerCase()));
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/ticker/${symbol}`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Failed to load crypto data');
          return;
        }
        const data = await res.json();
        setCryptoData(data);
      } catch (err) {
        setError('Failed to fetch crypto data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [symbol]);

  // Format large numbers
  const formatNumber = (num: number): string => {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const formatSupply = (num: number): string => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-zinc-50">
        <Navigation />
        <div className="fixed top-[72px] left-0 right-0 z-40">
          <MarketTicker />
        </div>
        <div className="pt-44 px-6 text-center">
          <div className="animate-pulse text-zinc-400">Loading {symbol}...</div>
        </div>
      </div>
    );
  }

  if (error || !cryptoData) {
    return (
      <div className="min-h-screen bg-black text-zinc-50">
        <Navigation />
        <div className="fixed top-[72px] left-0 right-0 z-40">
          <MarketTicker />
        </div>
        <div className="pt-44 px-6 text-center">
          <h1 className="text-3xl font-bold mb-4">Crypto Not Found</h1>
          <p className="text-zinc-400 mb-8">{error || `${symbol} is not supported yet.`}</p>
          <button
            onClick={() => router.push('/research')}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            Back to Research
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-50">
      <Navigation />
      <div className="fixed top-[72px] left-0 right-0 z-40">
        <MarketTicker />
      </div>

      <div className="pt-44 pb-24 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Back link */}
          <button
            onClick={() => router.push('/research')}
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-8"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Research
          </button>

          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            {cryptoData.image && (
              <Image
                src={cryptoData.image}
                alt={cryptoData.name}
                width={64}
                height={64}
                className="rounded-full"
                unoptimized
              />
            )}
            <div>
              <h1 className="text-4xl font-bold text-zinc-50 mb-1">
                {cryptoData.name} ({cryptoData.symbol})
              </h1>
              <div className="flex items-center gap-4 text-lg">
                <span className="font-semibold">
                  {formatNumber(cryptoData.currentPrice)}
                </span>
                <span
                  className={`font-medium ${
                    cryptoData.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {cryptoData.priceChange24h >= 0 ? '▲' : '▼'}{' '}
                  {Math.abs(cryptoData.priceChange24h).toFixed(2)}%
                </span>
                <span className="text-sm text-zinc-500">24h</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-8 border-b border-zinc-800">
            {[
              { id: 'stats', label: 'Statistics' },
              { id: 'articles', label: `Your Articles (${relatedArticles.length})` },
              { id: 'chart', label: 'Chart' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              {/* Price Stats */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">Price Statistics</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">24h High</p>
                    <p className="text-lg font-semibold">{formatNumber(cryptoData.high24h)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">24h Low</p>
                    <p className="text-lg font-semibold">{formatNumber(cryptoData.low24h)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">All-Time High</p>
                    <p className="text-lg font-semibold">{formatNumber(cryptoData.ath)}</p>
                    <p className="text-xs text-zinc-500">
                      {cryptoData.athChangePercentage.toFixed(2)}% from ATH
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">All-Time Low</p>
                    <p className="text-lg font-semibold">{formatNumber(cryptoData.atl)}</p>
                    <p className="text-xs text-zinc-500">
                      {cryptoData.atlChangePercentage.toFixed(2)}% from ATL
                    </p>
                  </div>
                </div>
              </div>

              {/* Market Data */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">Market Data</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Market Cap</p>
                    <p className="text-xl font-semibold">{formatNumber(cryptoData.marketCap)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">24h Volume</p>
                    <p className="text-xl font-semibold">{formatNumber(cryptoData.volume24h)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Fully Diluted Valuation</p>
                    <p className="text-xl font-semibold">
                      {formatNumber(cryptoData.fullyDilutedValuation)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Supply Data */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">Supply</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Circulating Supply</p>
                    <p className="text-xl font-semibold">{formatSupply(cryptoData.circulatingSupply)}</p>
                    <p className="text-xs text-zinc-500 mt-1">{cryptoData.symbol}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Total Supply</p>
                    <p className="text-xl font-semibold">{formatSupply(cryptoData.totalSupply)}</p>
                    <p className="text-xs text-zinc-500 mt-1">{cryptoData.symbol}</p>
                  </div>
                  {cryptoData.maxSupply && (
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Max Supply</p>
                      <p className="text-xl font-semibold">{formatSupply(cryptoData.maxSupply)}</p>
                      <p className="text-xs text-zinc-500 mt-1">{cryptoData.symbol}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {cryptoData.description && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                  <h2 className="text-lg font-semibold mb-4">About {cryptoData.name}</h2>
                  <div
                    className="text-sm text-zinc-300 leading-relaxed prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: cryptoData.description.slice(0, 1000) + '...',
                    }}
                  />
                  {cryptoData.links.homepage && (
                    <a
                      href={cryptoData.links.homepage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-4 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Visit Website
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              )}

              {/* Categories */}
              {cryptoData.categories && cryptoData.categories.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                  <h2 className="text-lg font-semibold mb-4">Categories</h2>
                  <div className="flex flex-wrap gap-2">
                    {cryptoData.categories.map((cat, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-lg bg-zinc-800 text-zinc-300 text-sm border border-zinc-700"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Articles Tab */}
          {activeTab === 'articles' && (
            <div>
              {relatedArticles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {relatedArticles.map((article, i) => (
                    <div
                      key={i}
                      onClick={() => router.push(`/research/${article.slug || article.title.toLowerCase().replace(/\s+/g, '-')}`)}
                      className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 cursor-pointer hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-medium px-2 py-1 rounded bg-blue-900/40 text-blue-400">
                          {article.category}
                        </span>
                        {article.date && (
                          <span className="text-xs text-zinc-500">{article.date}</span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-zinc-50 mb-2 hover:text-blue-400 transition-colors">
                        {article.title}
                      </h3>
                      <p className="text-sm text-zinc-400 line-clamp-3">{article.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
                  <p className="text-zinc-400 mb-2">No articles found mentioning {symbol}</p>
                  <p className="text-sm text-zinc-500">Check back later for analysis on this crypto.</p>
                </div>
              )}
            </div>
          )}

          {/* Chart Tab */}
          {activeTab === 'chart' && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Price Chart</h2>
              <div className="h-[600px] w-full">
                <iframe
                  src={`https://www.tradingview.com/widgetembed/?symbol=BINANCE:${cryptoData.symbol}USDT&interval=D&theme=dark&style=1&locale=en&toolbar_bg=1a1a1a&enable_publishing=false&allow_symbol_change=false`}
                  className="w-full h-full rounded-lg"
                  frameBorder="0"
                  allow="clipboard-write"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

