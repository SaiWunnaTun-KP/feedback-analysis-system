import React from 'react';
import { Badge } from '@/components/ui/badge';
import { TableRow, TableCell } from '@/components/ui/table';
import { Check, Star, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProductMatrixProduct } from '@/services/api';

export interface ProductCardProps {
  product: ProductMatrixProduct;
  isSelected?: boolean;
  onSelect?: (name: string) => void;
  onClick?: (name: string) => void;
  rowNumber?: number;
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
  onClick,
  rowNumber,
}) => {
  const isStar = product.category === 'star';
  const isNeedsAttention = product.category === 'needs_attention';

  const netVariant = getNetScoreVariant(product.netScore);

  const handleClick = () => {
    if (onClick) {
      onClick(product.name);
    } else if (onSelect) {
      onSelect(product.name);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <TableRow
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "cursor-pointer transition-colors text-xs sm:text-sm border-b border-slate-100 group outline-none select-none",
        isSelected
          ? "bg-indigo-50/80 hover:bg-indigo-50"
          : "hover:bg-slate-50/80"
      )}
    >
      {/* 0. Row Number */}
      {rowNumber !== undefined && (
        <TableCell className="py-2.5 px-3 text-center font-mono text-xs text-slate-500 font-medium w-12 shrink-0">
          {rowNumber}
        </TableCell>
      )}

      {/* Product Name */}
      <TableCell className="py-2.5 px-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={cn(
              "w-1.5 h-4 rounded-full shrink-0",
              isStar ? "bg-emerald-500" : isNeedsAttention ? "bg-rose-500" : "bg-amber-400"
            )}
            title={isStar ? "Star Product" : isNeedsAttention ? "Needs Attention" : "Mixed Reviews"}
          />
          <span
            className={cn(
              "font-medium text-xs sm:text-sm truncate transition-colors text-slate-800 group-hover:text-slate-900 max-w-[260px] sm:max-w-xs md:max-w-md",
              isSelected && "text-indigo-950 font-bold"
            )}
            title={product.name}
          >
            {product.name}
          </span>
          {product.score ? (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 bg-amber-50 px-1 py-0.2 rounded border border-amber-100 shrink-0">
              <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-500" />
              {product.score.toFixed(1)}
            </span>
          ) : null}
        </div>
      </TableCell>

      {/* Sentiment Breakdown */}
      <TableCell className="py-2.5 px-3">
        <div className="flex items-center gap-2.5 text-xs">
          <span className="inline-flex items-center gap-1 font-medium text-emerald-600 whitespace-nowrap">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
            {product.positivePct}% Pos
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-rose-600 whitespace-nowrap">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 inline-block" />
            {product.negativePct}% Neg
          </span>
        </div>
      </TableCell>

      {/* Review Volume */}
      <TableCell className="py-2.5 px-3 text-right font-mono text-xs text-slate-600">
        {product.totalReviews.toLocaleString()}
      </TableCell>

      {/* Net Score Badge */}
      <TableCell className="py-2.5 px-3 text-right">
        <Badge
          className={cn(
            "font-mono font-bold text-xs px-2 py-0.5 border shadow-2xs transition-transform group-hover:scale-105",
            netVariant.bg,
            netVariant.text,
            netVariant.border
          )}
        >
          {product.netScore > 0 ? `+${product.netScore}` : product.netScore}
        </Badge>
      </TableCell>

      {/* Action: View Detail */}
      <TableCell className="py-2.5 px-3 text-center">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 group-hover:text-indigo-600 transition-colors">
          View Detail
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </TableCell>
    </TableRow>
  );
};
