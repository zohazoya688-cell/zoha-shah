import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3 text-sm font-medium text-slate-700 transition-colors duration-150 hover:border-blue-300 hover:bg-blue-50/50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-slate-800 dark:bg-[#141C2E] dark:text-slate-200 dark:hover:border-blue-500/40 dark:hover:bg-[#1B253B] dark:hover:text-white whitespace-nowrap shrink-0"
    >
      {isDark ? (
        <>
          <Sun className="h-4 w-4 text-amber-400" aria-hidden="true" />
          <span className="hidden sm:inline">Light</span>
        </>
      ) : (
        <>
          <Moon className="h-4 w-4 text-blue-600" aria-hidden="true" />
          <span className="hidden sm:inline">Dark</span>
        </>
      )}
    </button>
  );
}
