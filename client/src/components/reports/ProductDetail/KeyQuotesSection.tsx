import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { QuoteCard } from './QuoteCard';
import { ThumbsUp, ThumbsDown, MessageSquareQuote } from 'lucide-react';
import type { QuoteItem } from '@/services/api';

export interface KeyQuotesSectionProps {
  positiveQuotes: QuoteItem[];
  negativeQuotes: QuoteItem[];
  selectedAspect: string | null;
  selectedKeyword: string | null;
  isLoading?: boolean;
}

export const KeyQuotesSection: React.FC<KeyQuotesSectionProps> = ({
  positiveQuotes,
  negativeQuotes,
  selectedAspect,
  selectedKeyword,
  isLoading,
}) => {
  return (
    <Card className="shadow-sm border-slate-200/80 bg-white">
      <CardHeader className="pb-3 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <MessageSquareQuote className="h-4 w-4 text-indigo-600" />
              <span>Section 3: Key Quotes</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {selectedAspect
                ? `Actual customer reviews explicitly discussing aspect "${selectedAspect}".`
                : 'Representative customer reviews highlighting strengths and critical friction points.'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column 1: Negative Quotes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-rose-100">
              <h3 className="font-semibold text-sm text-rose-700 flex items-center gap-1.5">
                <ThumbsDown className="h-4 w-4" />
                Negative Quotes (Friction & Defect Feedback)
              </h3>
              <span className="text-xs text-rose-600 font-medium">
                {negativeQuotes.length} {negativeQuotes.length === 1 ? 'quote' : 'quotes'}
              </span>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-28 bg-rose-50/40 rounded-xl animate-pulse border border-rose-100" />
                ))}
              </div>
            ) : negativeQuotes.length > 0 ? (
              <div className="space-y-3">
                {negativeQuotes.map((quote) => (
                  <QuoteCard key={quote.id} quote={quote} type="negative" />
                ))}
              </div>
            ) : (
              <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-slate-400 text-xs flex flex-col items-center justify-center gap-1.5">
                <span>No negative quotes found matching the current filter.</span>
              </div>
            )}
          </div>

          {/* Column 2: Positive Quotes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-emerald-100">
              <h3 className="font-semibold text-sm text-emerald-700 flex items-center gap-1.5">
                <ThumbsUp className="h-4 w-4" />
                Positive Quotes (Praise & Highlights)
              </h3>
              <span className="text-xs text-emerald-600 font-medium">
                {positiveQuotes.length} {positiveQuotes.length === 1 ? 'quote' : 'quotes'}
              </span>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-28 bg-emerald-50/40 rounded-xl animate-pulse border border-emerald-100" />
                ))}
              </div>
            ) : positiveQuotes.length > 0 ? (
              <div className="space-y-3">
                {positiveQuotes.map((quote) => (
                  <QuoteCard key={quote.id} quote={quote} type="positive" />
                ))}
              </div>
            ) : (
              <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-slate-400 text-xs flex flex-col items-center justify-center gap-1.5">
                <span>No positive quotes found matching the current filter.</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

