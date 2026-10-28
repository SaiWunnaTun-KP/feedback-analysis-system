import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Check, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProductMatrixProduct } from '@/services/api';

export interface ProductCardProps {
  product: ProductMatrixProduct;
  isSelected: boolean;
  onSelect: (name: string) => void;
}

export function getNetScoreVariant(score: number): {
  bg: string;
  text: string;
  border: string;
  labelBg: string;
} {
  if (score >= 40) {
    return {
      bg: 'bg-emerald-500',
      text: 'text-white',
      border: 'border-emerald-600',
      labelBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  }
  if (score >= 10) {
    return {
      bg: 'bg-amber-400',
      text: 'text-slate-900',
      border: 'border-amber-500',
      labelBg: 'bg-amber-50 text-amber-800 border-amber-200',
    };
  }
  return {
    bg: 'bg-rose-500',
    text: 'text-white',
    border: 'border-rose-600',
    labelBg: 'bg-rose-50 text-rose-700 border-rose-200',
  };
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isSelected,
  onSelect,
}) => {
  const isStar = product.category === 'star';
  const isNeedsAttention = product.category === 'needs_attention';

  const categoryBorderColor = isStar
    ? 'border-l-emerald-500'
    : isNeedsAttention
    ? 'border-l-rose-500'
    : 'border-l-amber-500';

  const selectedBgAndRing = isStar
    ? 'bg-emerald-50/50 ring-2 ring-emerald-400/80 border-emerald-300'
    : isNeedsAttention
    ? 'bg-rose-50/50 ring-2 ring-rose-400/80 border-rose-300'
    : 'bg-amber-50/50 ring-2 ring-amber-400/80 border-amber-300';

  const netVariant = getNetScoreVariant(product.netScore);

  const handleClick = () => {
    onSelect(product.name);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(product.name);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "group relative flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg border border-slate-200/80 border-l-4 transition-all duration-150 cursor-pointer select-none outline-none shadow-xs hover:shadow-sm",
        categoryBorderColor,
        isSelected
          ? selectedBgAndRing
          : "bg-white hover:bg-slate-50/80 hover:border-slate-300"
      )}
    >
      {/* Product Information */}
      <div className="flex-1 min-w-0 pr-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "font-medium sm:font-semibold text-sm sm:text-base truncate transition-colors",
              isSelected ? "text-slate-900 font-bold" : "text-slate-800 group-hover:text-slate-900"
            )}
            title={product.name}
          >
            {product.name}
          </span>
          {product.score ? (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-100 shrink-0">
              <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
              {product.score.toFixed(1)}
            </span>
          ) : null}
        </div>

        {/* Sentiment & Volume Subline */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs sm:text-sm text-slate-500">
          <span className="inline-flex items-center gap-1 font-medium text-emerald-600 whitespace-nowrap">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
            {product.positivePct}% Pos
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-rose-600 whitespace-nowrap">
            <span className="h-2 w-2 rounded-full bg-rose-500 inline-block" />
            {product.negativePct}% Neg
          </span>
          <span className="text-slate-300 hidden sm:inline">·</span>
          <span className="text-slate-500 whitespace-nowrap">
            {product.totalReviews.toLocaleString()} reviews
          </span>
        </div>
      </div>

      {/* Net Score Badge & Filter Status */}
      <div className="flex items-center justify-between sm:justify-end gap-3 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
        {isSelected && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 animate-in fade-in duration-150">
            <Check className="h-3.5 w-3.5" />
            Filtered
          </span>
        )}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium sm:hidden">
            Net:
          </span>
          <Badge
            className={cn(
              "font-mono font-bold text-xs px-2.5 py-0.5 border shadow-2xs transition-transform group-hover:scale-105",
              netVariant.bg,
              netVariant.text,
              netVariant.border
            )}
          >
            {product.netScore > 0 ? `+${product.netScore}` : product.netScore}
          </Badge>
        </div>
      </div>
    </div>
  );
};
