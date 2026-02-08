'use client';

export default function ChartBackground() {
  return (
    <div 
      className="fixed inset-0 pointer-events-none z-[1]"
      aria-hidden="true"
    >
      {/* Trading chart bars pattern using SVG */}
      <svg
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Pattern for chart bars */}
          <pattern
            id="chart-bars"
            x="0"
            y="0"
            width="120"
            height="100"
            patternUnits="userSpaceOnUse"
          >
            {/* Bar chart bars - varying heights to simulate market data */}
            <rect x="10" y="60" width="8" height="30" fill="white" className="opacity-[0.08] dark:opacity-[0.12]" />
            <rect x="25" y="45" width="8" height="45" fill="white" className="opacity-[0.1] dark:opacity-[0.15]" />
            <rect x="40" y="70" width="8" height="20" fill="white" className="opacity-[0.06] dark:opacity-[0.1]" />
            <rect x="55" y="35" width="8" height="55" fill="white" className="opacity-[0.12] dark:opacity-[0.18]" />
            <rect x="70" y="50" width="8" height="40" fill="white" className="opacity-[0.08] dark:opacity-[0.12]" />
            <rect x="85" y="65" width="8" height="25" fill="white" className="opacity-[0.07] dark:opacity-[0.11]" />
            <rect x="100" y="40" width="8" height="50" fill="white" className="opacity-[0.1] dark:opacity-[0.15]" />
            
            {/* Additional smaller bars for density */}
            <rect x="15" y="75" width="4" height="15" fill="white" className="opacity-[0.05] dark:opacity-[0.08]" />
            <rect x="30" y="55" width="4" height="35" fill="white" className="opacity-[0.06] dark:opacity-[0.1]" />
            <rect x="45" y="80" width="4" height="10" fill="white" className="opacity-[0.04] dark:opacity-[0.06]" />
            <rect x="60" y="50" width="4" height="40" fill="white" className="opacity-[0.07] dark:opacity-[0.11]" />
            <rect x="75" y="70" width="4" height="20" fill="white" className="opacity-[0.05] dark:opacity-[0.08]" />
            <rect x="90" y="60" width="4" height="30" fill="white" className="opacity-[0.06] dark:opacity-[0.1]" />
            <rect x="105" y="45" width="4" height="45" fill="white" className="opacity-[0.07] dark:opacity-[0.11]" />
          </pattern>
        </defs>
        {/* Apply pattern to entire background */}
        <rect width="100%" height="100%" fill="url(#chart-bars)" />
      </svg>
    </div>
  );
}
