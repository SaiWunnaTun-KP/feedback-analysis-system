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

  // Robust aspect matching supporting raw and punctuation-stripped strings
  const isDriverSelected = (aspect: string) => {
    if (!selectedAspect) return false;
    const sNorm = selectedAspect.toLowerCase().replace(/[.,:;!?]+$/, '').trim();
    const aNorm = aspect.toLowerCase().replace(/[.,:;!?]+$/, '').trim();
    return sNorm === aNorm;
  };

  return (
    <Card className="shadow-sm border-slate-200/80 dark:border-slate-800 bg-card">
      <CardHeader className="pb-3 border-b border-border/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Section 1: Positive & Negative Drivers</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Aspects with the greatest impact on this product's Net Score. Click any driver to drill into its Word Cloud and Quotes.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column 1: Negative Drivers (Friction Points) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-rose-500/20">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-rose-500/10 text-rose-500 dark:text-rose-400">
                  <ThumbsDown className="h-4 w-4" />
                </span>
                <h3 className="font-semibold text-sm text-foreground">
                  Negative Drivers
                  <span className="text-xs font-normal text-muted-foreground ml-1.5">(Friction Points)</span>
                </h3>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                {negativeDrivers.length} {negativeDrivers.length === 1 ? 'driver' : 'drivers'}
              </span>
            </div>

            {isLoading ? (
              <div className="space-y-2.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-20 bg-muted/40 rounded-xl animate-pulse border border-border/50" />
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
                    isSelected={isDriverSelected(driver.aspect)}
                    onClick={onAspectClick}
                  />
                ))}
              </div>
            ) : (
              <div className="p-8 text-center rounded-xl border border-dashed border-border bg-muted/20 text-muted-foreground text-xs flex flex-col items-center justify-center gap-2">
                <AlertCircle className="h-5 w-5 text-muted-foreground/60" />
                <span>No significant negative drivers identified for this product.</span>
              </div>
            )}
          </div>

          {/* Column 2: Positive Drivers (Brand Champions) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-emerald-500/10 text-emerald-500 dark:text-emerald-400">
                  <ThumbsUp className="h-4 w-4" />
                </span>
                <h3 className="font-semibold text-sm text-foreground">
                  Positive Drivers
                  <span className="text-xs font-normal text-muted-foreground ml-1.5">(Brand Champions)</span>
                </h3>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {positiveDrivers.length} {positiveDrivers.length === 1 ? 'driver' : 'drivers'}
              </span>
            </div>

            {isLoading ? (
              <div className="space-y-2.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-20 bg-muted/40 rounded-xl animate-pulse border border-border/50" />
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
                    isSelected={isDriverSelected(driver.aspect)}
                    onClick={onAspectClick}
                  />
                ))}
              </div>
            ) : (
              <div className="p-8 text-center rounded-xl border border-dashed border-border bg-muted/20 text-muted-foreground text-xs flex flex-col items-center justify-center gap-2">
                <AlertCircle className="h-5 w-5 text-muted-foreground/60" />
                <span>No significant positive drivers identified for this product.</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
