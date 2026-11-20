import React from 'react';
import { BookOpen, Moon, Sparkles, Sun } from 'lucide-react';
import { HealthResponse } from '../types/audit';

interface HeaderProps {
  health: HealthResponse | null;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenSyllabus: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  health,
  theme,
  onToggleTheme,
  onOpenSyllabus,
}) => {
  const isLive = health?.live_inference ?? false;

  return (
    <header className="sticky top-0 z-30 border-b border-[#ebdcc8] bg-[#fcfaf6]/85 backdrop-blur-xl transition-colors dark:border-[#ea8b21]/20 dark:bg-[#14100c]/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        {/* Minimal Brand */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#ea8b21] to-[#d97d16] text-white shadow-md shadow-[#ea8b21]/30">
            <Sparkles className="h-4.5 w-4.5" aria-hidden="true" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-extrabold tracking-tight text-[#1e293b] sm:text-lg dark:text-[#faf5ec]">
              FoundryLens
            </h1>
            <span className="rounded-md border border-[#ea8b21]/30 bg-[#ea8b21]/12 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#d97d16] dark:text-[#f5b461]">
              AI-901
            </span>
          </div>
        </div>

        {/* Status Pill + Icon-Only Controls */}
        <div className="flex items-center gap-2">
          <div
            title={health ? health.provider_label : 'Connecting'}
            className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md ${
              isLive
                ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                : 'border-[#ebdcc8] bg-[#faf5ec] text-[#b8620c] dark:border-[#ea8b21]/30 dark:bg-[#ea8b21]/12 dark:text-[#f5b461]'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-pulse-beacon absolute inline-flex h-full w-full rounded-full ${
                  isLive ? 'bg-emerald-400' : 'bg-[#ea8b21]'
                }`}
              />
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  isLive ? 'bg-emerald-500' : 'bg-[#ea8b21]'
                }`}
              />
            </span>
            <span>{isLive ? 'Foundry Live' : 'Foundry Demo'}</span>
          </div>

          <button
            type="button"
            onClick={onOpenSyllabus}
            aria-label="AI-901 Syllabus Map"
            title="AI-901 Syllabus Map"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#ebdcc8] bg-white text-[#d97d16] transition hover:border-[#ea8b21] hover:bg-[#faf5ec] focus:outline-none focus:ring-2 focus:ring-[#ea8b21]/35 dark:border-[#ea8b21]/25 dark:bg-[#211a14] dark:text-[#f5b461] dark:hover:border-[#ea8b21]"
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Cream Light Mode' : 'Espresso Dark Mode'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#ebdcc8] bg-white text-[#d97d16] transition hover:border-[#ea8b21] hover:bg-[#faf5ec] focus:outline-none focus:ring-2 focus:ring-[#ea8b21]/35 dark:border-[#ea8b21]/25 dark:bg-[#211a14] dark:text-[#f5b461] dark:hover:border-[#ea8b21]"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
