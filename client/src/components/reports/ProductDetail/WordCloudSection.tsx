import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquareText, RefreshCw, X, Sparkles } from 'lucide-react';
import WordCloud from 'react-d3-cloud';
import type { WordCloudItem } from '@/services/api';

export interface WordCloudSectionProps {
  wordCloud: WordCloudItem[];
  selectedAspect: string | null;
  onClearAspect: () => void;
  selectedKeyword: string | null;
  onSelectKeyword: (keyword: string) => void;
  onClearKeyword: () => void;
  isLoading?: boolean;
}

export const WordCloudSection = React.forwardRef<HTMLDivElement, WordCloudSectionProps>(
  (
    {
      wordCloud,
      selectedAspect,
      onClearAspect,
      selectedKeyword,
      onSelectKeyword,
      onClearKeyword,
      isLoading,
    },
    ref
  ) => {
    // Clone words into a fresh array to prevent d3-cloud's in-place object mutations
    // from causing stale state or memoization bugs on re-render.
    const cloudData = useMemo(() => {
      if (!Array.isArray(wordCloud)) return [];
      return wordCloud
        .filter((w) => w && typeof w.text === 'string' && w.text.trim().length > 0)
        .map((w) => ({
          text: w.text.trim(),
          value: Number(w.value) || 1,
          sentiment: w.sentiment,
        }));
    }, [wordCloud]);

    // Resilient word click handler supporting both d3 v5 (d) and v6+ (event, d) signatures
    const handleWordClick = (_arg1: any, _arg2: any) => {
      const datum = _arg2 && _arg2.text ? _arg2 : _arg1 && _arg1.text ? _arg1 : null;
      if (datum?.text) {
        onSelectKeyword(datum.text);
      }
    };

    return (
      <div ref={ref} className="scroll-mt-6">
        <Card className="shadow-sm border-slate-200/80 bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <MessageSquareText className="h-4 w-4 text-indigo-600" />
                  <span>Section 2: Aspect-Opinion Word Cloud</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  High-frequency customer opinion terms. Sized by frequency and color-coded by sentiment. Click any word to filter customer quotes.
                </CardDescription>
              </div>

              {/* Active Filter Badges */}
              <div className="flex flex-wrap items-center gap-2">
                {selectedAspect && (
                  <Badge
                    variant="outline"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 border-indigo-200 cursor-pointer hover:bg-indigo-100"
                    onClick={onClearAspect}
                    title="Clear aspect filter"
                  >
                    <span>Aspect: {selectedAspect}</span>
                    <X className="h-3 w-3" />
                  </Badge>
                )}

                {selectedKeyword && (
                  <Badge
                    variant="outline"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-800 border-amber-200 cursor-pointer hover:bg-amber-100"
                    onClick={onClearKeyword}
                    title="Clear keyword filter"
                  >
                    <span>Keyword: "{selectedKeyword}"</span>
                    <X className="h-3 w-3" />
                  </Badge>
                )}

                {(selectedAspect || selectedKeyword) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onClearAspect();
                      onClearKeyword();
                    }}
                    className="h-7 text-xs text-slate-500 hover:text-slate-900 px-2"
                  >
                    Clear All
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            <div className="border border-slate-200/90 rounded-xl p-4 bg-slate-50/40 flex flex-col items-center justify-center min-h-[460px] relative overflow-hidden">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                  <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
                  <span className="text-xs">Generating word cloud...</span>
                </div>
              ) : cloudData.length > 0 ? (
                <div className="w-full flex-1 flex items-center justify-center min-h-[400px] py-2 [&>div]:w-full [&>div]:max-w-[760px] [&>div]:h-full [&>div]:flex [&>div]:items-center [&>div]:justify-center [&_svg]:w-full [&_svg]:h-auto [&_svg]:max-h-[400px] [&_svg]:overflow-visible [&_text]:cursor-pointer [&_text]:transition-opacity hover:[&_text]:opacity-80">
                  <WordCloud
                    data={cloudData}
                    width={760}
                    height={460}
                    font="Inter, system-ui, -apple-system, sans-serif"
                    fontWeight="bold"
                    fontSize={(word) => {
                      const val = Math.max(1, word.value || 1);
                      return Math.min(58, Math.max(22, Math.log2(val + 1) * 14 + 18));
                    }}
                    spiral="rectangular"
                    rotate={0}
                    padding={6}
                    onWordClick={handleWordClick}
                    fill={(d: any) => {
                      const sentiment = String(d?.sentiment || '').toLowerCase();
                      if (sentiment === 'positive') return '#10b981';
                      if (sentiment === 'negative') return '#ef4444';
                      return '#f59e0b';
                    }}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 text-slate-400 text-center py-16">
                  <Sparkles className="h-8 w-8 text-slate-300" />
                  <span className="text-sm font-medium text-slate-600">No opinion keywords found</span>
                  <p className="text-xs text-slate-400 max-w-sm">
                    {selectedAspect
                      ? `No opinion terms detected for aspect "${selectedAspect}". Try clearing the filter.`
                      : 'There are not enough customer opinions to generate a cloud for this product.'}
                  </p>
                  {selectedAspect && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onClearAspect}
                      className="mt-2 text-xs"
                    >
                      Clear Aspect Filter
                    </Button>
                  )}
                </div>
              )}

              {/* Legend Footer */}
              <div className="mt-4 pt-3 border-t border-slate-200/60 w-full flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    Positive Opinion
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium text-rose-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                    Negative Opinion
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium text-amber-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    Neutral Opinion
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Tip: Click any word to filter quotes below
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
);

WordCloudSection.displayName = 'WordCloudSection';

