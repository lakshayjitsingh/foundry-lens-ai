import React, { useEffect, useRef } from 'react';

/**
 * SankhyaSetu AI Inspired Colorful Cream & Saffron Atmospheric Background
 * Light Mode: Warm Cream (#faf5ec -> #eee3d3) + vibrant Saffron (#ea8b21), Honey Gold, Peach & subtle Emerald/Sky mist
 * Dark Mode:  Deep Warm Espresso (#14100c -> #1c1610) + luminous Saffron (#ea8b21) & Warm Gold aurora clouds
 */
export const FoundryBackground: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleMove = (e: PointerEvent) => {
      el.style.setProperty('--mx', `${e.clientX}px`);
      el.style.setProperty('--my', `${e.clientY}px`);
    };

    window.addEventListener('pointermove', handleMove, { passive: true });
    return () => window.removeEventListener('pointermove', handleMove);
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{ '--mx': '50vw', '--my': '20vh' } as React.CSSProperties}
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
    >
      {/* 1. Signature SankhyaSetu Cream / Warm Espresso Base */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#fcfaf6] via-[#faf5ec] to-[#eee3d3] dark:from-[#14100c] dark:via-[#1c1610] dark:to-[#120e0a]" />

      {/* 2. Top Saffron Sunbeam Horizon */}
      <div className="absolute top-0 left-1/2 h-[520px] w-full max-w-7xl -translate-x-1/2 bg-[radial-gradient(ellipse_78%_56%_at_50%_-12%,rgba(234,139,33,0.28),rgba(251,191,36,0.16),transparent_72%)] dark:bg-[radial-gradient(ellipse_80%_58%_at_50%_-12%,rgba(234,139,33,0.42),rgba(217,125,22,0.18),transparent_72%)]" />

      {/* 3. Crisp Saffron Top Horizon Line */}
      <div className="absolute top-0 left-1/2 h-[2px] w-4/5 max-w-5xl -translate-x-1/2 bg-gradient-to-r from-transparent via-[#ea8b21]/80 to-transparent" />

      {/* 4. Cursor-Reactive Warm Saffron Spotlight */}
      <div
        className="absolute inset-0 opacity-90 transition-opacity duration-500"
        style={{
          background:
            'radial-gradient(500px circle at var(--mx) var(--my), rgba(234, 139, 33, 0.14), rgba(251, 191, 36, 0.06) 40%, transparent 72%)',
        }}
      />

      {/* 5. Colorful Warm Aurora Orbs (Saffron, Honey, Peach-Coral, Soft Emerald) */}
      <div className="animate-aurora-a absolute -top-20 -left-16 h-[460px] w-[460px] rounded-full bg-[#ea8b21]/24 blur-[120px] dark:bg-[#ea8b21]/28" />
      <div className="animate-aurora-b absolute top-[22%] -right-16 h-[480px] w-[480px] rounded-full bg-[#f59e0b]/20 blur-[130px] dark:bg-[#d97d16]/24" />
      <div className="animate-aurora-a absolute bottom-[-10%] left-[22%] h-[420px] w-[420px] rounded-full bg-[#fb923c]/20 blur-[125px] dark:bg-[#ea8b21]/18" />
      <div className="animate-aurora-b absolute right-[20%] bottom-[6%] h-[320px] w-[320px] rounded-full bg-[#10b981]/10 blur-[110px] dark:bg-[#10b981]/12" />

      {/* 6. Subtle Radial-Masked Warm Dot Matrix */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(217,125,22,0.18)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(234,139,33,0.18)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(ellipse_85%_75%_at_50%_30%,#000_50%,transparent_100%)]" />

      {/* 7. Flowing Saffron-Gold Neural Ribbons SVG */}
      <svg
        className="absolute inset-0 h-full w-full opacity-55 dark:opacity-60"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        viewBox="0 0 1440 900"
      >
        <defs>
          <linearGradient id="saffronRibbonA" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d97d16" stopOpacity="0" />
            <stop offset="50%" stopColor="#ea8b21" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="saffronRibbonB" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0" />
            <stop offset="50%" stopColor="#ea8b21" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path
          d="M -40 180 Q 360 70, 720 215 T 1480 135"
          fill="none"
          stroke="url(#saffronRibbonA)"
          strokeWidth="1.5"
          className="animate-dash-flow"
        />
        <path
          d="M -20 660 Q 440 530, 860 675 T 1490 555"
          fill="none"
          stroke="url(#saffronRibbonB)"
          strokeWidth="1.3"
          className="animate-dash-flow"
        />

        <g fill="#ea8b21">
          <circle cx="220" cy="140" r="2.8" opacity="0.6" />
          <circle cx="720" cy="215" r="3.2" opacity="0.7" />
          <circle cx="1180" cy="172" r="2.6" opacity="0.55" />
          <circle cx="440" cy="590" r="2.8" opacity="0.5" />
          <circle cx="1040" cy="632" r="3.0" opacity="0.6" />
        </g>
      </svg>
    </div>
  );
};
