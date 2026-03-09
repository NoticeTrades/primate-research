/**
 * Tickers that show price + % change in chat when users type them.
 * Indices/crypto: link to /indices or /ticker. Stocks: link to Yahoo Finance.
 */

export const CHAT_INDICES_AND_CRYPTO = [
  'NQ', 'ES', 'YM', 'RTY', 'DXY', 'CL', 'GC', 'SI', 'N225', 'BTC', 'ETH',
] as const;

/** Set of all tickers that get a price pill in chat (indices + crypto + stocks). */
const STOCK_TICKERS = [
  'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'META', 'AMZN', 'NVDA', 'TSLA', 'AMD', 'INTC', 'CRM', 'ORCL', 'ADBE', 'NFLX', 'PYPL', 'SHOP', 'SQ', 'UBER', 'ABNB', 'SNOW', 'PLTR',
  'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'BLK', 'SCHW', 'AXP', 'V', 'MA', 'COF', 'USB', 'PNC', 'TFC',
  'UNH', 'JNJ', 'PFE', 'ABBV', 'MRK', 'LLY', 'TMO', 'ABT', 'BMY', 'AMGN', 'GILD', 'ISRG', 'MDT', 'CVS', 'CI',
  'XOM', 'CVX', 'COP', 'SLB', 'EOG', 'MPC', 'PSX', 'VLO', 'OXY', 'HAL', 'DVN', 'FANG', 'BKR', 'KMI', 'WMB',
  'WMT', 'PG', 'KO', 'PEP', 'COST', 'HD', 'MCD', 'NKE', 'SBUX', 'TGT', 'LOW', 'TJX', 'EL', 'DG', 'F', 'GM',
  'CAT', 'DE', 'BA', 'HON', 'UPS', 'RTX', 'LMT', 'GE', 'MMM', 'FDX', 'CSX', 'UNP', 'NSC', 'WM', 'EMR',
  'DIS', 'CMCSA', 'T', 'VZ', 'TMUS', 'CHTR', 'EA', 'ROKU', 'SPOT', 'SNAP', 'TTWO', 'RBLX', 'U',
  'COIN', 'MARA', 'RIOT', 'MSTR', 'HOOD', 'SOFI', 'AFRM', 'UPST', 'RIVN', 'LCID', 'NIO', 'XPEV', 'LI', 'FSR',
  'AI', 'CRWD', 'PANW', 'ZS', 'DDOG', 'NET', 'MDB', 'OKTA', 'FTNT', 'TEAM', 'WDAY', 'VEEV', 'HUBS', 'DOCU',
  'SPY', 'QQQ', 'IWM', 'DIA', 'VOO', 'VTI', 'ARKK', 'XLF', 'XLK', 'XLE', 'XLV', 'XLY', 'XLP', 'XLI', 'XLB', 'XLU', 'XLRE', 'XLC',
  'BABA', 'JD', 'PDD', 'BIDU', 'NIO', 'TME', 'VIPS', 'BILI', 'NTES', 'TCEHY', 'CPNG', 'GRAB',
  'SAP', 'ASML', 'NVO', 'NFLX', 'SAP', 'ORAN', 'TM', 'SONY', 'TTM', 'HMC', 'AZN', 'GSK', 'SAN', 'DB', 'BNPQY', 'RY', 'TD', 'BP', 'SHEL', 'TTE', 'TOT',
  'MU', 'QCOM', 'AVGO', 'AMAT', 'LRCX', 'KLAC', 'MRVL', 'NXPI', 'ON', 'MCHP', 'ADI', 'TXN',
  'WBA', 'RITE', 'COST', 'KR', 'SYY', 'GIS', 'K', 'KMB', 'CL', 'PG', 'EL', 'HLT', 'MAR', 'BKNG', 'EXPE', 'CCL', 'RCL', 'NCLH', 'DAL', 'LUV', 'UAL', 'AAL',
  'PM', 'MO', 'BTI', 'JMIA', 'ICLN', 'TAN', 'LIT', 'REMX', 'GLD', 'SLV', 'USO', 'UNG',
  'DOCS', 'HCA', 'CYH', 'THC', 'DVA', 'LH', 'DGX', 'IQV', 'WAT', 'IDXX', 'ZBH', 'SYK', 'BSX', 'EW', 'BDX', 'RMD', 'HOLX', 'BAX', 'ALGN', 'DXCM', 'PODD', 'MTD', 'A', 'WST',
  'LMT', 'NOC', 'GD', 'HII', 'LHX', 'TDG', 'TXT', 'CARR', 'OTIS', 'JCI', 'IR', 'ROK', 'ETN', 'DOV', 'ITW', 'SWK', 'PH', 'CBE', 'GNRC', 'TT', 'AME', 'NDSN', 'IEX', 'XYL', 'VRSK', 'FTV', 'IT', 'EMR', 'EFX', 'CTAS', 'FAST', 'POOL', 'PAYX', 'CDNS', 'ANSS', 'KEYS', 'TER', 'ZBRA', 'TYL', 'HPE', 'HPQ', 'NTAP', 'WDC', 'STX', 'LEN', 'DHI', 'PHM', 'NVR', 'TOL', 'MTH', 'MHO', 'MDC', 'RYL', 'KBH',
  'COST', 'WMT', 'TGT', 'DG', 'DLTR', 'BBY', 'WSM', 'RH', 'DKS', 'BOOT', 'ULTA', 'TSCO', 'ORLY', 'AZO', 'AAP', 'KMX', 'LAD', 'AN', 'PAG', 'GPC', 'WHR', 'NWL', 'MHK', 'LEG', 'JCI', 'ALB', 'FMC', 'CE', 'DD', 'DOW', 'EMN', 'CF', 'MOS', 'NEM', 'FCX', 'SCCO', 'TECK', 'VALE', 'RIO', 'BHP', 'LIN', 'APD', 'SHW', 'ECL', 'IFF', 'PPG', 'ROHM', 'VMC', 'MLM', 'EXP', 'SUM', 'CX', 'FLR', 'PWR', 'J', 'BLDR', 'GVA', 'PCL', 'RSG', 'WM', 'RSG', 'CNC', 'HUM', 'MOH', 'CI', 'ANTM', 'ELV', 'CNC',
  'BRK.B', 'BRK.A', 'SPCE', 'RKLB', 'ASTS', 'LUNR', 'PATH', 'DOCN', 'CFLT', 'ESTC', 'GTLB', 'DUOL', 'ZM', 'TWLO', 'BILL', 'PAYC', 'HUBS', 'DOCU', 'BOX', 'FSLY', 'BBAI', 'AI', 'PR',
  'SMCI', 'DELL', 'HPQ', 'HPE', 'IBM', 'NOW', 'CDW', 'AKAM', 'FFIV', 'IT', 'GDDY', 'WIX', 'IOT', 'SMAR', 'VRT', 'APP', 'RUN', 'ENPH', 'SEDG', 'FSLR', 'DQ', 'MAXN', 'ETSY', 'EBAY', 'W', 'CHWY', 'CVNA', 'CARG', 'LYFT', 'DASH', 'GRAB', 'CPNG',
  'JBL', 'WDC', 'STX', 'QRVO', 'SWKS', 'CRUS', 'SYNA', 'LOGI', 'PCTY', 'ADP', 'FIS', 'FISV', 'GPN', 'GLOB', 'FLT', 'WEX', 'JKHY', 'BR', 'CBOE', 'CME', 'ICE', 'NDAQ', 'MCO', 'SPGI', 'MSCI', 'FDS', 'TRAD', 'VIRT', 'IBKR', 'RJF', 'LAZ', 'RBC', 'BRO', 'WRB', 'AON', 'AJG', 'MMC', 'WTW', 'ALL', 'TRV', 'PGR', 'CINF', 'AFG', 'L', 'AIG', 'MET', 'PRU', 'AFL',
];

const INDICES_CRYPTO_SET = new Set(CHAT_INDICES_AND_CRYPTO.map((s) => s.toUpperCase()));
const STOCK_SET = new Set(STOCK_TICKERS.map((s) => s.toUpperCase()));

/** All tickers that get a price pill in chat. */
export const CHAT_TICKER_SET = new Set<string>([
  ...INDICES_CRYPTO_SET,
  ...STOCK_SET,
]);

/** Whether symbol is an index/future we have a page for (/indices/...). */
export function isIndexTicker(symbol: string): boolean {
  const s = symbol.toUpperCase();
  return ['NQ', 'ES', 'YM', 'RTY', 'DXY', 'CL', 'GC', 'SI', 'N225'].includes(s);
}

/** Whether symbol is crypto we have a page for (/ticker/...). */
export function isCryptoTicker(symbol: string): boolean {
  const s = symbol.toUpperCase();
  return ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'LINK', 'DOT', 'MATIC', 'UNI', 'ATOM', 'LTC', 'BCH', 'XLM', 'ALGO', 'NEAR', 'FTM', 'SAND', 'MANA', 'APE', 'ARB', 'OP', 'SUI', 'APT'].includes(s);
}

/** Link for a ticker pill: indices → /indices, crypto → /ticker, stocks → Yahoo. */
export function getTickerHref(symbol: string): string {
  const s = symbol.toUpperCase();
  if (isIndexTicker(s)) return `/indices/${s}`;
  if (isCryptoTicker(s)) return `/ticker/${s}`;
  return `https://finance.yahoo.com/quote/${encodeURIComponent(s)}`;
}
