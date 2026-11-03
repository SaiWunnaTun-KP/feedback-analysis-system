import React from 'react';
import { cn } from '@/lib/utils';
import type { DriverItem } from '@/services/api';
import { Check } from 'lucide-react';

export interface DriverBarProps {
  driver: DriverItem;
  type: 'positive' | 'negative';
  maxImpact: number;
  isSelected?: boolean;
  onClick: (aspect: string) => void;
}

export const DriverBar: React.FC<DriverBarProps> = ({
  driver,
  type,
  maxImpact,
  isSelected,
  onClick,
}) => {
  const isPositive = type === 'positive';
  const absImpact = Math.abs(driver.impact);
  const barWidth = maxImpact > 0 ? Math.min(100, Math.max(10, (absImpact / maxImpact) * 100)) : 10;

  // Clean trailing punctuation from raw aspect strings (e.g. "Battery Life." -> "Battery Life")
  const cleanAspect = driver.aspect.replace(/[.,:;!?]+$/, '').trim();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(driver.aspect)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(driver.aspect);
        }
      }}
      className={cn(
        "group relative p-3.5 rounded-xl border transition-all duration-200 cursor-pointer select-none outline-none",
        "bg-card/90 hover:bg-card shadow-2xs hover:shadow-xs",
        isPositive
          ? "border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/40 hover:bg-emerald-500/[0.03]"
          : "border-slate-200/80 dark:border-slate-800 hover:border-rose-500/40 hover:bg-rose-500/[0.03]",
        isSelected && (
          isPositive
            ? "border-emerald-500/70 bg-emerald-500/[0.08] dark:bg-emerald-500/[0.12] ring-1 ring-emerald-500/40 shadow-xs"
            : "border-rose-500/70 bg-rose-500/[0.08] dark:bg-rose-500/[0.12] ring-1 ring-rose-500/40 shadow-xs"
        )
      )}
    >
      {/* Top Row: Aspect Name & Impact Badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-xs sm:text-sm text-foreground capitalize truncate group-hover:text-primary transition-colors">
            {cleanAspect}
          </span>
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
            • {driver.mentionCount} {driver.mentionCount === 1 ? 'mention' : 'mentions'}
          </span>
          {isSelected && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                isPositive
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
              )}
            >
              <Check className="h-2.5 w-2.5" /> Filtered
            </span>
          )}
        </div>

        {/* Impact badge */}
        <span
          className={cn(
            "font-mono font-bold text-xs px-2.5 py-0.5 rounded-full border shrink-0 transition-transform group-hover:scale-105",
            isPositive
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
              : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30"
          )}
        >
          {isPositive ? `+${driver.impact}` : driver.impact}
        </span>
      </div>

      {/* Horizontal Bar Graphic */}
      <div className="w-full bg-slate-100 dark:bg-slate-800/90 rounded-full h-2 overflow-hidden mb-2">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            isPositive
              ? "bg-gradient-to-r from-emerald-500 to-teal-400"
              : "bg-gradient-to-r from-rose-500 to-rose-400"
          )}
          style={{ width: `${barWidth}%` }}
        />
      </div>

      {/* Top Opinion keywords tags */}
      {driver.topOpinions && driver.topOpinions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-muted-foreground font-medium text-[10px]">Common:</span>
          {driver.topOpinions.map((op, idx) => {
            const cleanOp = op.replace(/[.,:;!?]+$/, '').trim();
            return (
              <span
                key={idx}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[10px] font-medium border transition-colors",
                  isPositive
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20"
                )}
              >
                "{cleanOp}"
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};
