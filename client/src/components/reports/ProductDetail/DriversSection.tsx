import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ThumbsDown, ThumbsUp, AlertCircle, Sparkles } from 'lucide-react';
import { DriverBar } from './DriverBar';
import type { DriverItem } from '@/services/api';

export interface DriversSectionProps {
  negativeDrivers: DriverItem[];
  positiveDrivers: DriverItem[];
  selectedAspect: string | null;
  onAspectClick: (aspect: string) => void;
  isLoading?: boolean;
}

export const DriversSection: React.FC<DriversSectionProps> = ({
  negativeDrivers,
  positiveDrivers,
  selectedAspect,
  onAspectClick,
  isLoading,
}) => {
  // Find maximum impact across both positive and negative drivers for proportional bar scaling
  const maxImpact = useMemo(() => {
    let maxVal = 1;
    negativeDrivers.forEach((d) => {
      const absVal = Math.abs(d.impact);
      if (absVal > maxVal) maxVal = absVal;
    });
    positiveDrivers.forEach((d) => {
      const absVal = Math.abs(d.impact);
      if (absVal > maxVal) maxVal = absVal;
    });
    return maxVal;
  }, [negativeDrivers, positiveDrivers]);

  return (
    <Card className="shadow-sm border-slate-200/80 bg-white">
      <CardHeader className="pb-3 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Section 1: Positive & Negative Drivers</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Aspects with the greatest impact on this product's Net Score. Click any driver to drill into its Word Cloud and Quotes.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column 1: Negative Drivers (Pink / Red) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-rose-100">
              <h3 className="font-semibold text-sm text-rose-700 flex items-center gap-1.5">
                <ThumbsDown className="h-4 w-4" />
                Negative Drivers (Friction Points)
              </h3>
              <span className="text-xs text-rose-600 font-medium">
                {negativeDrivers.length} {negativeDrivers.length === 1 ? 'driver' : 'drivers'}
              </span>
            </div>

            {isLoading ? (
              <div className="space-y-2.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-20 bg-rose-50/50 rounded-lg animate-pulse border border-rose-100" />
                ))}
              </div>
            ) : negativeDrivers.length > 0 ? (
              <div className="space-y-2.5">
                {negativeDrivers.map((driver) => (
                  <DriverBar
                    key={driver.aspect}
                    driver={driver}
                    type="negative"
                    maxImpact={maxImpact}
                    isSelected={selectedAspect?.toLowerCase() === driver.aspect.toLowerCase()}
                    onClick={onAspectClick}
                  />
                ))}
              </div>
            ) : (
              <div className="p-6 text-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 text-slate-400 text-xs flex flex-col items-center justify-center gap-1.5">
                <AlertCircle className="h-5 w-5 text-slate-300" />
                <span>No significant negative drivers identified for this product.</span>
              </div>
            )}
          </div>

          {/* Column 2: Positive Drivers (Green / Emerald) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-emerald-100">
              <h3 className="font-semibold text-sm text-emerald-700 flex items-center gap-1.5">
                <ThumbsUp className="h-4 w-4" />
                Positive Drivers (Brand Champions)
              </h3>
              <span className="text-xs text-emerald-600 font-medium">
                {positiveDrivers.length} {positiveDrivers.length === 1 ? 'driver' : 'drivers'}
              </span>
            </div>

            {isLoading ? (
              <div className="space-y-2.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-20 bg-emerald-50/50 rounded-lg animate-pulse border border-emerald-100" />
                ))}
              </div>
            ) : positiveDrivers.length > 0 ? (
              <div className="space-y-2.5">
                {positiveDrivers.map((driver) => (
                  <DriverBar
                    key={driver.aspect}
                    driver={driver}
                    type="positive"
                    maxImpact={maxImpact}
                    isSelected={selectedAspect?.toLowerCase() === driver.aspect.toLowerCase()}
                    onClick={onAspectClick}
                  />
                ))}
              </div>
            ) : (
              <div className="p-6 text-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 text-slate-400 text-xs flex flex-col items-center justify-center gap-1.5">
                <Sparkles className="h-5 w-5 text-slate-300" />
                <span>No significant positive drivers identified for this product.</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

