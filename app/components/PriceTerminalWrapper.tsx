'use client';

import { useTicker } from '../contexts/TickerContext';
import PriceTerminal from './PriceTerminal';

export default function PriceTerminalWrapper() {
  const { openTickers } = useTicker();
  return (
    <>
      {openTickers.map((symbol, index) => (
        <PriceTerminal key={symbol} symbol={symbol} index={index} />
      ))}
    </>
  );
}
