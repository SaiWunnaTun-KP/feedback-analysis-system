import React from 'react';
import { ProductCard } from './ProductCard';
import type { ProductMatrixProduct } from '@/services/api';
import type { MatrixCategory } from './CategoryTabs';
import { Inbox, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ProductListViewProps {
  products: ProductMatrixProduct[];
  selectedProduct?: string | null;
  onProductSelect?: (name: string | null) => void;
  isLoading?: boolean;
  activeTab: MatrixCategory;
  onResetFilters?: () => void;
}

export const ProductListView: React.FC<ProductListViewProps> = ({
  products,
  selectedProduct,
  onProductSelect,
  isLoading,
  activeTab,
  onResetFilters,
}) => {
  const handleSelect = (name: string) => {
    if (!onProductSelect) return;
    if (selectedProduct === name) {
      onProductSelect(null);
    } else {
      onProductSelect(name);
    }
  };

  // Loading skeleton state
  if (isLoading) {
    return (
      <div className="space-y-2.5" aria-busy="true" aria-label="Loading products">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200/60 bg-white/60 animate-pulse border-l-4 border-l-slate-200"
          >
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="flex items-center gap-3">
                <div className="h-3 bg-slate-200 rounded w-16" />
                <div className="h-3 bg-slate-200 rounded w-16" />
                <div className="h-3 bg-slate-200 rounded w-20" />
              </div>
            </div>
            <div className="h-6 w-12 bg-slate-200 rounded-md" />
          </div>
        ))}
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
    <div className="space-y-2.5">
      {products.map((product) => (
        <ProductCard
          key={product.name}
          product={product}
          isSelected={selectedProduct === product.name}
          onSelect={handleSelect}
        />
      ))}
    </div>
  );
};
