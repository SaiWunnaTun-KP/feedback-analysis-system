import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Quote, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QuoteItem } from '@/services/api';

export interface QuoteCardProps {
  quote: QuoteItem;
  type: 'positive' | 'negative';
}

export const QuoteCard: React.FC<QuoteCardProps> = ({ quote, type }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isPositive = type === 'positive';

  const shouldTruncate = quote.text.length > 180;
  const displayText = shouldTruncate && !isExpanded
    ? `${quote.text.slice(0, 180)}...`
    : quote.text;

  return (
    <div
      className={cn(
        "p-4 rounded-xl border transition-all duration-150 flex flex-col justify-between gap-3 text-xs sm:text-sm",
        isPositive
          ? "border-emerald-100 bg-white hover:border-emerald-300 shadow-2xs hover:shadow-xs"
          : "border-rose-100 bg-white hover:border-rose-300 shadow-2xs hover:shadow-xs"
      )}
    >
      {/* Review Text */}
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <Quote
            className={cn(
              "h-4 w-4 shrink-0 mt-0.5",
              isPositive ? "text-emerald-500" : "text-rose-500"
            )}
          />
          <p className="text-slate-800 leading-relaxed font-normal italic">
            "{displayText}"
          </p>
        </div>

        {shouldTruncate && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors ml-6"
          >
            {isExpanded ? 'Read less' : 'Read more'}
          </button>
        )}
      </div>

      {/* Metadata Footer: Aspect tag, Opinion tag, Date */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant="outline"
            className="bg-slate-50 text-slate-700 border-slate-200 text-[11px] font-medium"
          >
            Aspect: {quote.aspect}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "text-[11px] font-medium",
              isPositive
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            )}
          >
            "{quote.opinion}"
          </Badge>
        </div>

        {quote.date && (
          <span className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
            <Calendar className="h-3 w-3" />
            {quote.date}
          </span>
        )}
      </div>
    </div>
  );
};

