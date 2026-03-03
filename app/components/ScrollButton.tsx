'use client';

interface ScrollButtonProps {
  targetId: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

export default function ScrollButton({
  targetId,
  children,
  variant = 'primary',
}: ScrollButtonProps) {
  const handleClick = () => {
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (variant === 'primary') {
    return (
      <button
        onClick={handleClick}
        className="px-8 py-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
        suppressHydrationWarning
      >
        {children}
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="px-8 py-4 border-2 border-zinc-300 dark:border-zinc-700 text-black dark:text-zinc-50 rounded-lg font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors flex items-center gap-2"
      suppressHydrationWarning
    >
      {children}
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}
