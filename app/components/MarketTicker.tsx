'use client';

import { useState, useEffect } from 'react';

interface TickerData {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  isLoading: boolean;
}

export default function MarketTicker() {
  const [tickers, setTickers] = useState<TickerData[]>([
    { symbol: 'NQ', name: 'Nasdaq 100', price: null, change: null, changePercent: null, isLoading: true },
    { symbol: 'ES', name: 'S&P 500 E-mini', price: null, change: null, changePercent: null, isLoading: true },
    { symbol: 'YM', name: 'Dow E-mini', price: null, change: null, changePercent: null, isLoading: true },
    { symbol: 'RTY', name: 'Russell 2000', price: null, change: null, changePercent: null, isLoading: true },
    { symbol: 'GC', name: 'Gold Futures', price: null, change: null, changePercent: null, isLoading: true },
    { symbol: 'SI', name: 'Silver Futures', price: null, change: null, changePercent: null, isLoading: true },
    { symbol: 'N225', name: 'Nikkei 225', price: null, change: null, changePercent: null, isLoading: true },
    { symbol: 'BTC', name: 'Bitcoin', price: null, change: null, changePercent: null, isLoading: true },
    { symbol: 'ETH', name: 'Ethereum', price: null, change: null, changePercent: null, isLoading: true },
  ]);

  const fetchMarketData = async () => {
    try {
      // Fetch Bitcoin and Ethereum prices via our API route (avoids CORS issues)
      // Wrap in Promise to catch extension-intercepted errors
      let cryptoResponse;
      try {
        const timestamp = Date.now();
        cryptoResponse = await new Promise<Response | null>((resolve) => {
          fetch(`/api/crypto-data?t=${timestamp}`, {
            method: 'GET',
            cache: 'no-store',
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'no-cache',
            },
          })
            .then(resolve)
            .catch((error: any) => {
              // Silently ignore browser extension interference
              // These errors are non-critical
              resolve(null);
            });
        });
      } catch (fetchError: any) {
        // Additional catch for any remaining errors
        cryptoResponse = null;
      }

      if (cryptoResponse?.ok) {
        const cryptoData = await cryptoResponse.json();
      
        if (cryptoData.bitcoin) {
          setTickers((prev) =>
            prev.map((ticker) =>
              ticker.symbol === 'BTC'
                ? {
                    ...ticker,
                    price: cryptoData.bitcoin.usd,
                    change: cryptoData.bitcoin.usd_24h_change,
                    changePercent: cryptoData.bitcoin.usd_24h_change,
                    isLoading: false,
                  }
                : ticker
            )
          );
        }

        if (cryptoData.ethereum) {
          setTickers((prev) =>
            prev.map((ticker) =>
              ticker.symbol === 'ETH'
                ? {
                    ...ticker,
                    price: cryptoData.ethereum.usd,
                    change: cryptoData.ethereum.usd_24h_change,
                    changePercent: cryptoData.ethereum.usd_24h_change,
                    isLoading: false,
                  }
                : ticker
            )
          );
        }
      } else {
        setTickers((prev) =>
          prev.map((ticker) =>
            ticker.symbol === 'BTC' || ticker.symbol === 'ETH'
              ? { ...ticker, isLoading: false }
              : ticker
          )
        );
      }

      // Fetch Gold and Silver futures prices via our API route
      try {
        const timestamp = Date.now();
        const [goldResponse, silverResponse] = await Promise.all([
          fetch(`/api/market-data?symbol=GC&t=${timestamp}`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' },
          }).catch(() => null),
          fetch(`/api/market-data?symbol=SI&t=${timestamp}`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' },
          }).catch(() => null),
        ]);

        if (goldResponse?.ok) {
          const goldData = await goldResponse.json();
          if (!goldData.error) {
            setTickers((prev) =>
              prev.map((ticker) =>
                ticker.symbol === 'GC'
                  ? {
                      ...ticker,
                      price: goldData.price,
                      change: goldData.change,
                      changePercent: goldData.changePercent,
                      isLoading: false,
                    }
                  : ticker
              )
            );
          } else {
            setTickers((prev) =>
              prev.map((t) => (t.symbol === 'GC' ? { ...t, isLoading: false } : t))
            );
          }
        } else {
          setTickers((prev) =>
            prev.map((t) => (t.symbol === 'GC' ? { ...t, isLoading: false } : t))
          );
        }

        if (silverResponse?.ok) {
          const silverData = await silverResponse.json();
          if (!silverData.error) {
            setTickers((prev) =>
              prev.map((ticker) =>
                ticker.symbol === 'SI'
                  ? {
                      ...ticker,
                      price: silverData.price,
                      change: silverData.change,
                      changePercent: silverData.changePercent,
                      isLoading: false,
                    }
                  : ticker
              )
            );
          } else {
            setTickers((prev) =>
              prev.map((t) => (t.symbol === 'SI' ? { ...t, isLoading: false } : t))
            );
          }
        } else {
          setTickers((prev) =>
            prev.map((t) => (t.symbol === 'SI' ? { ...t, isLoading: false } : t))
          );
        }
      } catch (error) {
        console.error('Error fetching metals data:', error);
      }

      // For futures (NQ, ES, YM, RTY), you'll need to use a financial API
      // Options:
      // 1. Alpha Vantage API (https://www.alphavantage.co/) - Free tier available
      // 2. Yahoo Finance API (unofficial, via yfinance library or API)
      // 3. CME Group API for futures data
      // 4. Your preferred financial data provider
      //
      // Example API call structure:
      // const futuresResponse = await fetch(`YOUR_API_ENDPOINT`);
      // const futuresData = await futuresResponse.json();
      // Process and update state accordingly
      
      // Fetch Nikkei 225 and other futures via our API route
      try {
      const fetchWithErrorHandling = async (url: string, options?: RequestInit) => {
        try {
          return await fetch(url, {
            ...options,
            cache: 'no-store',
            headers: {
              ...options?.headers,
              'Cache-Control': 'no-cache',
            },
          });
        } catch (error: any) {
          // Ignore browser extension interference
          if (error?.message?.includes('Failed to fetch') || 
              error?.message?.includes('chrome-extension')) {
            return null;
          }
          throw error;
        }
      };

        const futuresSymbols = ['N225', 'NQ', 'ES', 'YM', 'RTY'];
        const timestamp = Date.now();
        const futuresResponses = await Promise.all(
          futuresSymbols.map((symbol) => 
            fetchWithErrorHandling(`/api/market-data?symbol=${symbol}&t=${timestamp}`, {
              cache: 'no-store',
              headers: { 'Cache-Control': 'no-cache' },
            })
          )
        );

        const futuresData = await Promise.all(
          futuresResponses.map((response) => (response && response.ok ? response.json() : null))
        );

        futuresData.forEach((data, index) => {
          const symbol = futuresSymbols[index];
          setTickers((prev) =>
            prev.map((ticker) =>
              ticker.symbol === symbol
                ? {
                    ...ticker,
                    price: data?.price ?? null,
                    change: data?.change ?? null,
                    changePercent: data?.changePercent ?? null,
                    isLoading: false,
                  }
                : ticker
            )
          );
        });
      } catch (error) {
        console.error('Error fetching futures data:', error);
        // Set loading to false on error
        setTickers((prev) =>
          prev.map((ticker) => {
            if (!['BTC', 'ETH', 'GC', 'SI'].includes(ticker.symbol) && ticker.isLoading) {
              return { ...ticker, isLoading: false };
            }
            return ticker;
          })
        );
      }
    } catch (error) {
      console.error('Error fetching market data:', error);
      // Set loading to false even on error
      setTickers((prev) =>
        prev.map((ticker) => ({ ...ticker, isLoading: false }))
      );
    }
  };

  useEffect(() => {
    // Suppress browser extension fetch errors
    const originalError = console.error;
    const originalWarn = console.warn;
    
    // Filter console errors from browser extensions
    console.error = (...args: any[]) => {
      const errorString = String(args[0] || '');
      if (errorString.includes('chrome-extension://') || 
          (errorString.includes('Failed to fetch') && errorString.includes('fetchMarketData'))) {
        return; // Suppress extension-related errors
      }
      originalError.apply(console, args);
    };

    // Handle unhandled promise rejections from extensions
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorString = String(event.reason || '');
      if (errorString.includes('chrome-extension://') || 
          (errorString.includes('Failed to fetch') && errorString.includes('fetch'))) {
        event.preventDefault(); // Suppress the error
        return;
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Fetch data immediately
    fetchMarketData();

    // Update every 3 seconds for real-time feel
    const interval = setInterval(() => {
      console.log(`[MarketTicker] Refreshing at ${new Date().toLocaleTimeString()}`);
      fetchMarketData();
    }, 3000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      // Restore original console methods
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  const formatPrice = (price: number | null): string => {
    if (price === null) return '--';
    if (price >= 1000) {
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return price.toFixed(2);
  };

  const formatChange = (change: number | null): string => {
    if (change === null) return '--';
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}`;
  };

  const formatChangePercent = (changePercent: number | null): string => {
    if (changePercent === null) return '--';
    const sign = changePercent >= 0 ? '+' : '';
    return `${sign}${changePercent.toFixed(2)}%`;
  };

  const TickerItem = ({ ticker }: { ticker: TickerData }) => (
    <div
      className="flex items-center gap-4 min-w-[220px] flex-shrink-0 px-4 py-2 bg-zinc-800/30 dark:bg-zinc-900/50 rounded-lg mx-1 border border-blue-500/20"
    >
      <div className="flex flex-col min-w-[80px]">
        <span className="text-xs font-medium text-blue-400 dark:text-blue-500">
          {ticker.symbol}
        </span>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          {ticker.name}
        </span>
      </div>
      {ticker.isLoading ? (
        <div className="flex items-center gap-2">
          <div className="w-16 h-4 bg-zinc-800 rounded animate-pulse"></div>
          <div className="w-12 h-4 bg-zinc-800 rounded animate-pulse"></div>
        </div>
      ) : (
        <div className="flex flex-col items-end">
          <span className="text-sm font-bold text-white">
            {formatPrice(ticker.price)}
          </span>
          <div
            className={`flex items-center gap-1 text-xs font-medium ${
              (ticker.changePercent ?? 0) >= 0
                ? 'text-green-400'
                : 'text-red-400'
            }`}
          >
            <span>{formatChange(ticker.change)}</span>
            <span>({formatChangePercent(ticker.changePercent)})</span>
          </div>
        </div>
      )}
    </div>
  );

  // Duplicate tickers for seamless loop
  const duplicatedTickers = [...tickers, ...tickers];

  return (
    <div className="bg-zinc-900 dark:bg-black text-white border-b border-zinc-800 overflow-hidden relative z-40">
      <div className="relative py-3">
        <div className="flex items-center animate-scroll">
          {duplicatedTickers.map((ticker, index) => (
            <TickerItem key={`${ticker.symbol}-${index}`} ticker={ticker} />
          ))}
        </div>
      </div>
    </div>
  );
}
