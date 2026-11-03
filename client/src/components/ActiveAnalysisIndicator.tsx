import React, { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { datasetsApi } from '../services/api';
import { Link } from 'react-router';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function ActiveAnalysisIndicator() {
  const queryClient = useQueryClient();
  const prevActiveRef = useRef<number | null>(null);

  const { data } = useQuery({
    queryKey: ['activeDatasetProgress'],
    queryFn: datasetsApi.getActiveProgress,
    refetchInterval: (query) => {
      // Poll every 2.5 seconds when an analysis is active, otherwise poll slowly every 10 seconds
      return query.state.data?.activeDataset ? 2500 : 10000;
    },
  });

  const active = data?.activeDataset;

  useEffect(() => {
    if (active?.id) {
      prevActiveRef.current = active.id;
    } else if (prevActiveRef.current !== null && !active) {
      // Transitioned from processing to finished (either completed or failed)
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      prevActiveRef.current = null;
    }
  }, [active, queryClient]);

  if (!active) {
    return null;
  }

  const total = Number(active.totalReviews) || 0;
  const processed = Number(active.processedReviews) || 0;
  const pct = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 5;

  return (
    <Link
      to="/dashboard/datasets"
      title={`Analyzing dataset "${active.filename}": ${pct}% complete (${processed}/${total} reviews). Click to manage datasets.`}
      className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/30 dark:border-blue-400/30 text-xs hover:bg-blue-500/20 dark:hover:bg-blue-500/25 transition-all shadow-xs group cursor-pointer"
    >
      <div className="relative flex items-center justify-center shrink-0">
        <Loader2 className="h-4 w-4 text-blue-600 dark:text-sky-400 animate-spin" />
      </div>

      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-2 font-medium leading-none">
          <span className="truncate max-w-[120px] sm:max-w-[170px] text-slate-900 font-semibold text-xs" title={active.filename}>
            {active.filename}
          </span>
          <span className="text-blue-600 dark:text-sky-400 font-mono font-bold text-xs shrink-0">
            {pct}%
          </span>
          {total > 0 && (
            <span className="text-slate-500 text-[11px] font-mono hidden md:inline shrink-0">
              ({processed}/{total})
            </span>
          )}
        </div>

        {/* High-Contrast Progress Bar */}
        <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden mt-1.5 border border-slate-300/50">
          <div
            className="bg-blue-600 dark:bg-sky-400 h-full rounded-full transition-all duration-300 shadow-xs"
            style={{ width: `${Math.max(4, pct)}%` }}
          />
        </div>
      </div>
    </Link>
  );
}

