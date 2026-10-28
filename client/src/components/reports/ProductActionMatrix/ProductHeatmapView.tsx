import type { ProductMatrixProduct } from '@/services/api';
import type { MatrixCategory } from './CategoryTabs';
import type { SortOption } from './MatrixControls';
import { getNetScoreVariant } from './ProductCard';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, ArrowDown, ArrowUpDown, Inbox, RotateCcw, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProductHeatmapViewProps {
  products: ProductMatrixProduct[];
  selectedProduct?: string | null;
  onProductSelect?: (name: string | null) => void;
  isLoading?: boolean;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  activeTab: MatrixCategory;
  onResetFilters?: () => void;
}

// Compute color intensity for Positive Percentage (Green)
function getPosIntensityClass(pct: number): string {
  if (pct >= 80) return 'bg-emerald-100/90 text-emerald-950 font-semibold';
  if (pct >= 60) return 'bg-emerald-50 text-emerald-900 font-medium';
  if (pct >= 40) return 'bg-emerald-50/60 text-emerald-800';
  return 'text-slate-600';
}

// Compute color intensity for Negative Percentage (Red/Rose)
function getNegIntensityClass(pct: number): string {
  if (pct >= 50) return 'bg-rose-100/90 text-rose-950 font-semibold';
  if (pct >= 30) return 'bg-rose-50 text-rose-900 font-medium';
  if (pct >= 15) return 'bg-rose-50/60 text-rose-800';
  return 'text-slate-600';
}

export const ProductHeatmapView: React.FC<ProductHeatmapViewProps> = ({
  products,
  selectedProduct,
  onProductSelect,
  isLoading,
  sortBy,
  onSortChange,
  activeTab,
  onResetFilters,
}) => {
  const handleRowClick = (name: string) => {
    if (!onProductSelect) return;
    if (selectedProduct === name) {
      onProductSelect(null);
    } else {
      onProductSelect(name);
    }
  };

  const renderSortHeader = (label: string, field: SortOption, align: 'left' | 'right' = 'right') => {
    const isSorted = sortBy === field;
    return (
      <button
        type="button"
        onClick={() => onSortChange(field)}
        className={cn(
          "inline-flex items-center gap-1 font-semibold text-xs tracking-wide uppercase transition-colors hover:text-slate-900 cursor-pointer select-none",
          align === 'right' ? "ml-auto" : "",
          isSorted ? "text-indigo-600" : "text-slate-500"
        )}
      >
        <span>{label}</span>
        {isSorted ? (
          <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
        ) : (
          <ArrowUpDown className="h-3 w-3 text-slate-300 group-hover:text-slate-500" />
        )}
      </button>
    );
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs" aria-busy="true">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="h-4 bg-slate-200 rounded w-1/4 animate-pulse" />
          <div className="flex gap-4">
            <div className="h-4 bg-slate-200 rounded w-16 animate-pulse" />
            <div className="h-4 bg-slate-200 rounded w-16 animate-pulse" />
            <div className="h-4 bg-slate-200 rounded w-16 animate-pulse" />
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-3.5 flex items-center justify-between animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="flex items-center gap-6">
                <div className="h-4 bg-slate-200 rounded w-12" />
                <div className="h-5 bg-slate-200 rounded w-16" />
                <div className="h-5 bg-slate-200 rounded w-16" />
                <div className="h-6 bg-slate-200 rounded-md w-14" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (products.length === 0) {
    const categoryName =
      activeTab === 'star'
        ? 'Star Products'
        : activeTab === 'needs_attention'
        ? 'Needs Attention'
        : 'Mixed Reviews';

    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
        <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3 shadow-2xs">
          <Inbox className="h-6 w-6" />
        </div>
        <h4 className="text-sm font-semibold text-slate-900">
          No products found in {categoryName}
        </h4>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          No items match your active search or minimum volume criteria. Try adjusting your filters.
        </p>
        {onResetFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onResetFilters}
            className="mt-4 gap-1.5 text-xs text-slate-600 hover:text-slate-900"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow className="border-b border-slate-200/80 hover:bg-transparent">
              <TableHead className="py-3 px-4 font-semibold text-xs tracking-wide uppercase text-slate-500 w-[40%]">
                Product
              </TableHead>
              <TableHead className="py-3 px-4 text-right">
                {renderSortHeader('Volume', 'volume')}
              </TableHead>
              <TableHead className="py-3 px-4 text-right">
                {renderSortHeader('Pos %', 'pos_pct')}
              </TableHead>
              <TableHead className="py-3 px-4 text-right">
                {renderSortHeader('Neg %', 'neg_pct')}
              </TableHead>
              <TableHead className="py-3 px-4 text-right">
                {renderSortHeader('Net Score', 'net_score')}
              </TableHead>
              <TableHead className="py-3 px-4 text-center w-24">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100">
            {products.map((product) => {
              const isSelected = selectedProduct === product.name;
              const netVariant = getNetScoreVariant(product.netScore);
              const posIntensity = getPosIntensityClass(product.positivePct);
              const negIntensity = getNegIntensityClass(product.negativePct);

              return (
                <TableRow
                  key={product.name}
                  onClick={() => handleRowClick(product.name)}
                  className={cn(
                    "cursor-pointer transition-colors duration-150 select-none",
                    isSelected
                      ? "bg-indigo-50/70 hover:bg-indigo-50"
                      : "hover:bg-slate-50/80"
                  )}
                >
                  {/* Product Name */}
                  <TableCell className="py-3 px-4 font-medium text-slate-800">
                    <div className="flex items-center gap-2 max-w-[280px] sm:max-w-md">
                      <span className="truncate" title={product.name}>
                        {product.name}
                      </span>
                      {product.score ? (
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-100 shrink-0">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                          {product.score.toFixed(1)}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>

                  {/* Volume */}
                  <TableCell className="py-3 px-4 text-right font-mono text-sm text-slate-600">
                    {product.totalReviews.toLocaleString()}
                  </TableCell>

                  {/* Positive % (Heatmap colored cell) */}
                  <TableCell className="py-3 px-4 text-right">
                    <span
                      className={cn(
                        "inline-block px-2.5 py-0.5 rounded-md font-mono text-xs transition-colors",
                        posIntensity
                      )}
                    >
                      🟢 {product.positivePct}%
                    </span>
                  </TableCell>

                  {/* Negative % (Heatmap colored cell) */}
                  <TableCell className="py-3 px-4 text-right">
                    <span
                      className={cn(
                        "inline-block px-2.5 py-0.5 rounded-md font-mono text-xs transition-colors",
                        negIntensity
                      )}
                    >
                      🔴 {product.negativePct}%
                    </span>
                  </TableCell>

                  {/* Net Score Badge */}
                  <TableCell className="py-3 px-4 text-right">
                    <Badge
                      className={cn(
                        "font-mono font-bold text-xs px-2.5 py-0.5 border shadow-2xs",
                        netVariant.bg,
                        netVariant.text,
                        netVariant.border
                      )}
                    >
                      {product.netScore > 0 ? `+${product.netScore}` : product.netScore}
                    </Badge>
                  </TableCell>

                  {/* Filter Status */}
                  <TableCell className="py-3 px-4 text-center">
                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                        <Check className="h-3 w-3" /> Filtered
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 opacity-0 group-hover:opacity-100">
                        —
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
