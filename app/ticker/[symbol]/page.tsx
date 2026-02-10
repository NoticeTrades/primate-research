'use client';

import { useState, useEffect, useCallback } from 'react';
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
  updateInterval?: number;
  lastUpdated?: string;
}

export default function TickerPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = (params.symbol as string).toUpperCase();
  const [cryptoData, setCryptoData] = useState<CryptoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'articles' | 'stats' | 'chart' | 'sentiment'>('stats');
  const [sentimentData, setSentimentData] = useState<{
    fearGreed: number;
    fearGreedClassification: string;
    timestamp: number;
  } | null>(null);
  const [sentimentLoading, setSentimentLoading] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [updateIntervalSeconds, setUpdateIntervalSeconds] = useState<number>(30); // Default 30 seconds
  const POLLING_INTERVAL = 30000; // 30 seconds in milliseconds

  // Filter articles that mention this ticker
  const relatedArticles = researchArticles.filter((article) => {
    const searchText = `${article.title} ${article.description} ${article.content || ''}`.toLowerCase();
    return searchText.includes(symbol.toLowerCase()) || 
           (article.tags && article.tags.some(tag => tag.toLowerCase() === symbol.toLowerCase()));
  });

  // Fetch data function
  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/ticker/${symbol}?t=${Date.now()}`); // Add timestamp to bypass cache
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to load crypto data');
        return;
      }
      const data = await res.json();
      setCryptoData(data);
      setLastUpdateTime(new Date());
      if (data.updateInterval) {
        setUpdateIntervalSeconds(data.updateInterval);
      }
    } catch (err) {
      setError('Failed to fetch crypto data');
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  // Initial fetch and polling
  useEffect(() => {
    fetchData();
    
    // Set up polling interval
    const intervalId = setInterval(fetchData, POLLING_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, [symbol, fetchData]);

  // Fetch sentiment data when sentiment tab is active
  useEffect(() => {
    if (activeTab === 'sentiment' && !sentimentData && !sentimentLoading) {
      const fetchSentiment = async () => {
        setSentimentLoading(true);
        try {
          const res = await fetch('https://api.alternative.me/fng/?limit=1');
          if (res.ok) {
            const data = await res.json();
            if (data.data && data.data.length > 0) {
              const fng = data.data[0];
              setSentimentData({
                fearGreed: parseInt(fng.value),
                fearGreedClassification: fng.value_classification,
                timestamp: parseInt(fng.timestamp) * 1000,
              });
            }
          }
        } catch (err) {
          console.error('Failed to fetch sentiment:', err);
        } finally {
          setSentimentLoading(false);
        }
      };
      fetchSentiment();
    }
  }, [activeTab, sentimentData, sentimentLoading]);

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
                <div className="flex items-center gap-2">
                  <span
                    className={`font-medium ${
                      cryptoData.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {cryptoData.priceChange24h >= 0 ? '▲' : '▼'}{' '}
                    {Math.abs(cryptoData.priceChange24h).toFixed(2)}%
                  </span>
                  <span className="text-sm text-zinc-500">24h</span>
                  {lastUpdateTime && (
                    <span className="text-xs text-zinc-500 ml-2" title={`Last updated: ${lastUpdateTime.toLocaleTimeString()}`}>
                      • Updated every {updateIntervalSeconds}s
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-8 border-b border-zinc-800">
            {[
              { id: 'stats', label: 'Statistics' },
              { id: 'articles', label: `Research (${relatedArticles.length})` },
              { id: 'sentiment', label: 'Sentiment' },
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

          {/* Sentiment Tab */}
          {activeTab === 'sentiment' && (
            <div className="space-y-6">
              {/* Fear & Greed Index */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">Crypto Fear & Greed Index</h2>
                {sentimentLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-pulse text-zinc-400">Loading sentiment data...</div>
                  </div>
                ) : sentimentData ? (
                  <div>
                    {/* Gauge Visualization */}
                    <div className="relative w-full max-w-md mx-auto mb-6">
                      <div className="relative h-48 flex items-center justify-center">
                        {/* Gauge background circle */}
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                          {/* Background arc */}
                          <circle
                            cx="100"
                            cy="100"
                            r="80"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="20"
                            className="text-zinc-800"
                          />
                          {/* Colored segments */}
                          <circle
                            cx="100"
                            cy="100"
                            r="80"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="20"
                            strokeDasharray={`${(sentimentData.fearGreed / 100) * 502.4} 502.4`}
                            strokeLinecap="round"
                            className={
                              sentimentData.fearGreed >= 75
                                ? 'text-green-500'
                                : sentimentData.fearGreed >= 50
                                ? 'text-yellow-500'
                                : sentimentData.fearGreed >= 25
                                ? 'text-orange-500'
                                : 'text-red-500'
                            }
                          />
                        </svg>
                        {/* Center value */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <div
                            className={`text-5xl font-bold ${
                              sentimentData.fearGreed >= 75
                                ? 'text-green-400'
                                : sentimentData.fearGreed >= 50
                                ? 'text-yellow-400'
                                : sentimentData.fearGreed >= 25
                                ? 'text-orange-400'
                                : 'text-red-400'
                            }`}
                          >
                            {sentimentData.fearGreed}
                          </div>
                          <div className="text-sm text-zinc-500 mt-1">/ 100</div>
                          <div
                            className={`text-lg font-semibold mt-2 ${
                              sentimentData.fearGreed >= 75
                                ? 'text-green-400'
                                : sentimentData.fearGreed >= 50
                                ? 'text-yellow-400'
                                : sentimentData.fearGreed >= 25
                                ? 'text-orange-400'
                                : 'text-red-400'
                            }`}
                          >
                            {sentimentData.fearGreedClassification}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sentiment Scale */}
                    <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden mb-4">
                      <div
                        className="absolute inset-y-0 left-0 transition-all duration-500"
                        style={{
                          width: `${sentimentData.fearGreed}%`,
                          background: `linear-gradient(to right, ${
                            sentimentData.fearGreed >= 75
                              ? '#10b981'
                              : sentimentData.fearGreed >= 50
                              ? '#eab308'
                              : sentimentData.fearGreed >= 25
                              ? '#f97316'
                              : '#ef4444'
                          }, ${
                            sentimentData.fearGreed >= 75
                              ? '#34d399'
                              : sentimentData.fearGreed >= 50
                              ? '#fde047'
                              : sentimentData.fearGreed >= 25
                              ? '#fb923c'
                              : '#f87171'
                          })`,
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-between px-2 text-[10px] text-zinc-500">
                        <span>Extreme Fear</span>
                        <span>Fear</span>
                        <span>Neutral</span>
                        <span>Greed</span>
                        <span>Extreme Greed</span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="bg-zinc-800/50 rounded-lg p-4">
                      <p className="text-sm text-zinc-300 leading-relaxed">
                        The Fear & Greed Index measures market sentiment on a scale of 0-100. Values above 50 indicate greed (bullish sentiment), while values below 50 indicate fear (bearish sentiment). This index combines volatility, market momentum, social media sentiment, surveys, and Bitcoin dominance.
                      </p>
                      <p className="text-xs text-zinc-500 mt-3">
                        Last updated: {new Date(sentimentData.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-zinc-400">Failed to load sentiment data</p>
                  </div>
                )}
              </div>

              {/* Market Sentiment Context */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">Market Context</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-zinc-200 mb-1">Current Price Action</p>
                      <p className="text-sm text-zinc-400">
                        {cryptoData.priceChange24h >= 0
                          ? `${cryptoData.name} is up ${cryptoData.priceChange24h.toFixed(2)}% in the last 24 hours, indicating positive short-term momentum.`
                          : `${cryptoData.name} is down ${Math.abs(cryptoData.priceChange24h).toFixed(2)}% in the last 24 hours, showing bearish pressure.`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-zinc-200 mb-1">Market Position</p>
                      <p className="text-sm text-zinc-400">
                        Trading at {formatNumber(cryptoData.currentPrice)} with a market cap of {formatNumber(cryptoData.marketCap)}. 
                        {cryptoData.currentPrice < cryptoData.ath * 0.5
                          ? ' Currently trading significantly below all-time high, potentially indicating value opportunity or continued bearish sentiment.'
                          : cryptoData.currentPrice < cryptoData.ath * 0.8
                          ? ' Trading below all-time high, showing room for potential recovery.'
                          : ' Trading near all-time high levels, indicating strong market confidence.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
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

