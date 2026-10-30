import React from 'react';
import { cn } from '@/lib/utils';
import type { DriverItem } from '@/services/api';

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
  const barWidth = maxImpact > 0 ? Math.min(100, Math.max(12, (absImpact / maxImpact) * 100)) : 12;

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
        "group relative p-3 rounded-lg border transition-all duration-150 cursor-pointer select-none outline-none",
        isPositive
          ? "border-emerald-100/90 bg-emerald-50/30 hover:bg-emerald-50/70 hover:border-emerald-300"
          : "border-rose-100/90 bg-rose-50/30 hover:bg-rose-50/70 hover:border-rose-300",
        isSelected && (
          isPositive
            ? "ring-2 ring-emerald-500 border-emerald-400 bg-emerald-50/90 shadow-xs"
            : "ring-2 ring-rose-500 border-rose-400 bg-rose-50/90 shadow-xs"
        )
      )}
    >
      {/* Top Header: Aspect Name & Impact Number */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-xs sm:text-sm text-slate-800 capitalize truncate group-hover:text-slate-950">
            {driver.aspect}
          </span>
          <span className="text-[11px] text-slate-400 whitespace-nowrap">
            ({driver.mentionCount} {driver.mentionCount === 1 ? 'mention' : 'mentions'})
          </span>
        </div>

        {/* Impact badge */}
        <span
          className={cn(
            "font-mono font-bold text-xs px-2 py-0.5 rounded-md border shrink-0 transition-transform group-hover:scale-105",
            isPositive
              ? "bg-emerald-500 text-white border-emerald-600 shadow-2xs"
              : "bg-rose-500 text-white border-rose-600 shadow-2xs"
          )}
        >
          {isPositive ? `+${driver.impact}` : driver.impact}
        </span>
      </div>

      {/* Horizontal Bar Graphic */}
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-1.5">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            isPositive ? "bg-emerald-500" : "bg-rose-500"
          )}
          style={{ width: `${barWidth}%` }}
        />
      </div>

      {/* Top Opinion keywords tags */}
      {driver.topOpinions && driver.topOpinions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-slate-400">Common:</span>
          {driver.topOpinions.map((op, idx) => (
            <span
              key={idx}
              className={cn(
                "px-1.5 py-0.2 rounded text-[10px] font-medium border",
                isPositive
                  ? "bg-emerald-100/70 text-emerald-800 border-emerald-200"
                  : "bg-rose-100/70 text-rose-800 border-rose-200"
              )}
            >
              "{op}"
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

