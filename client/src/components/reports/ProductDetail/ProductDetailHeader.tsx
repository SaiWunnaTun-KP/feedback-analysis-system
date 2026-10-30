import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, RotateCcw } from 'lucide-react';
import { getNetScoreVariant } from '../ProductActionMatrix/ProductCard';

export interface ProductDetailHeaderProps {
  productName: string;
  totalReviews: number;
  positivePct: number;
  negativePct: number;
  netScore: number;
  lastUpdated?: string;
  onBack: () => void;
  selectedAspect: string | null;
  selectedKeyword: string | null;
  onClearAllFilters: () => void;
}

export const ProductDetailHeader: React.FC<ProductDetailHeaderProps> = ({
  productName,
  totalReviews,
  positivePct,
  negativePct,
  netScore,
  lastUpdated,
  onBack,
  selectedAspect,
  selectedKeyword,
  onClearAllFilters,
}) => {
  const netVariant = getNetScoreVariant(netScore);

  return (
    <div className="space-y-4">
      {/* Back Button & Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="gap-2 bg-white text-slate-700 hover:text-slate-900 border-slate-200 cursor-pointer shadow-2xs"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Product Action Matrix</span>
        </Button>

        {(selectedAspect || selectedKeyword) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAllFilters}
            className="gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Aspect & Keyword Filters</span>
          </Button>
        )}
      </div>

      {/* Product Title & Metrics Card */}
      <div className="p-5 rounded-xl border border-slate-200/90 bg-white shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {productName}
            </h1>
            <Badge
              className={`font-mono font-bold text-sm px-3 py-0.5 border shadow-2xs ${netVariant.bg} ${netVariant.text} ${netVariant.border}`}
            >
              Net Score: {netScore > 0 ? `+${netScore}` : netScore}
            </Badge>
          </div>

          {/* Subline metrics */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-slate-500">
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 whitespace-nowrap">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
              {positivePct}% Positive
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1 font-semibold text-rose-600 whitespace-nowrap">
              <span className="h-2 w-2 rounded-full bg-rose-500 inline-block" />
              {negativePct}% Negative
            </span>
            <span>·</span>
            <span className="text-slate-600 font-medium whitespace-nowrap">
              {totalReviews.toLocaleString()} {totalReviews === 1 ? 'review' : 'reviews'} analyzed
            </span>
            {lastUpdated && (
              <>
                <span className="text-slate-300 hidden sm:inline">·</span>
                <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
                  <Calendar className="h-3 w-3" />
                  Last updated: {lastUpdated}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

