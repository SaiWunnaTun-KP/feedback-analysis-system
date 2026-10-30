import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type SortOption = 'volume' | 'net_score' | 'pos_pct' | 'neg_pct';

export interface MatrixControlsProps {
  search: string;
  onSearchChange: (value: string) => void;
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
  minVolume: number;
  onMinVolumeChange: (value: number) => void;
}

export const MatrixControls: React.FC<MatrixControlsProps> = ({
  search,
  onSearchChange,
  sortBy,
  onSortChange,
  minVolume,
  onMinVolumeChange,
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
    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3">
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
          <SelectTrigger className="w-[170px] h-9 text-xs sm:text-sm bg-white border-slate-200">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="volume">Sort: Volume (Asc)</SelectItem>
            <SelectItem value="net_score">Sort: Net Score (Asc)</SelectItem>
            <SelectItem value="pos_pct">Sort: Positive % (Asc)</SelectItem>
            <SelectItem value="neg_pct">Sort: Negative % (Asc)</SelectItem>
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
      </div>
    </div>
  );
};
