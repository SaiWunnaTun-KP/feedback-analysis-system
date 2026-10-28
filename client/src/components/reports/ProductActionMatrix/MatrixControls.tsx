import React, { useState, useEffect } from 'react';
import { Search, X, LayoutList, TableProperties } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type SortOption = 'volume' | 'net_score' | 'pos_pct' | 'neg_pct';
export type ViewMode = 'list' | 'heatmap';

export interface MatrixControlsProps {
  search: string;
  onSearchChange: (value: string) => void;
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
  minVolume: number;
  onMinVolumeChange: (value: number) => void;
  viewMode: ViewMode;
  onViewModeChange: (value: ViewMode) => void;
}

export const MatrixControls: React.FC<MatrixControlsProps> = ({
  search,
  onSearchChange,
  sortBy,
  onSortChange,
  minVolume,
  onMinVolumeChange,
  viewMode,
  onViewModeChange,
}) => {
  // Local state for debounced search input (350ms)
  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== search) {
        onSearchChange(localSearch);
      }
    }, 350);

    return () => clearTimeout(handler);
  }, [localSearch, search, onSearchChange]);

  const handleClearSearch = () => {
    setLocalSearch('');
    onSearchChange('');
  };

  return (
    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3 pt-1">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <Input
          type="text"
          placeholder="Search products by name..."
          className="pl-9 pr-8 h-9 text-sm bg-white border-slate-200 focus-visible:ring-1 focus-visible:ring-indigo-500"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
        />
        {localSearch && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full transition-colors"
            title="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Filter Controls Group */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Sort Dropdown */}
        <Select value={sortBy} onValueChange={(val: SortOption) => onSortChange(val)}>
          <SelectTrigger className="w-[155px] h-9 text-xs sm:text-sm bg-white border-slate-200">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="volume">Sort: Volume</SelectItem>
            <SelectItem value="net_score">Sort: Net Score</SelectItem>
            <SelectItem value="pos_pct">Sort: Positive %</SelectItem>
            <SelectItem value="neg_pct">Sort: Negative %</SelectItem>
          </SelectContent>
        </Select>

        {/* Min. Volume Dropdown */}
        <Select
          value={String(minVolume)}
          onValueChange={(val) => onMinVolumeChange(Number(val))}
        >
          <SelectTrigger className="w-[145px] h-9 text-xs sm:text-sm bg-white border-slate-200">
            <SelectValue placeholder="Min. Volume" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Min. Volume: 1</SelectItem>
            <SelectItem value="5">Min. Volume: 5</SelectItem>
            <SelectItem value="10">Min. Volume: 10</SelectItem>
            <SelectItem value="20">Min. Volume: 20</SelectItem>
          </SelectContent>
        </Select>

        {/* View Toggle (Segmented Control) */}
        <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 shadow-xs">
          <button
            type="button"
            onClick={() => onViewModeChange('list')}
            aria-pressed={viewMode === 'list'}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150 cursor-pointer",
              viewMode === 'list'
                ? "bg-white text-slate-900 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <LayoutList className="h-3.5 w-3.5" />
            <span>List</span>
          </button>

          <button
            type="button"
            onClick={() => onViewModeChange('heatmap')}
            aria-pressed={viewMode === 'heatmap'}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150 cursor-pointer",
              viewMode === 'heatmap'
                ? "bg-white text-slate-900 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <TableProperties className="h-3.5 w-3.5" />
            <span>Heatmap</span>
          </button>
        </div>
      </div>
    </div>
  );
};
