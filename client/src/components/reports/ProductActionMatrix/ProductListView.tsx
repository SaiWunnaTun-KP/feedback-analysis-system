import React from 'react';
import { ProductCard } from './ProductCard';
import type { ProductMatrixProduct } from '@/services/api';
import type { MatrixCategory } from './CategoryTabs';
import { Inbox, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';

export interface ProductListViewProps {
  products: ProductMatrixProduct[];
  selectedProduct?: string | null;
  onProductSelect?: (name: string | null) => void;
  onProductClick?: (name: string) => void;
  isLoading?: boolean;
  activeTab: MatrixCategory;
  onResetFilters?: () => void;
  page?: number;
  pageSize?: number;
}

export const ProductListView: React.FC<ProductListViewProps> = ({
  products,
  selectedProduct,
  onProductSelect,
  onProductClick,
  isLoading,
  activeTab,
  onResetFilters,
  page = 1,
  pageSize = 10,
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
      <div
        className="rounded-lg border border-slate-200 overflow-hidden bg-white shadow-2xs"
        aria-busy="true"
        aria-label="Loading products"
      >
        <Table>
          <TableHeader className="bg-slate-50/90 border-b border-slate-200">
            <TableRow className="hover:bg-transparent border-b border-slate-200">
              <TableHead className="py-2.5 px-3 text-xs font-semibold text-slate-500 text-center w-12">#</TableHead>
              <TableHead className="py-2.5 px-3 text-xs font-semibold text-slate-600">Product Name</TableHead>
              <TableHead className="py-2.5 px-3 text-xs font-semibold text-slate-600">Sentiment Breakdown</TableHead>
              <TableHead className="py-2.5 px-3 text-xs font-semibold text-slate-600 text-right">Reviews</TableHead>
              <TableHead className="py-2.5 px-3 text-xs font-semibold text-slate-600 text-right">Net Score</TableHead>
              <TableHead className="py-2.5 px-3 text-xs font-semibold text-slate-600 text-center w-24">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 10 }).map((_, i) => (
              <TableRow key={i} className="animate-pulse border-b border-slate-100">
                <TableCell className="py-2.5 px-3 text-center">
                  <div className="h-3.5 bg-slate-100 rounded w-4 mx-auto" />
                </TableCell>
                <TableCell className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-slate-200 rounded-full" />
                    <div className="h-3.5 bg-slate-200 rounded w-2/3" />
                  </div>
                </TableCell>
                <TableCell className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    <div className="h-3 bg-slate-100 rounded w-14" />
                    <div className="h-3 bg-slate-100 rounded w-14" />
                  </div>
                </TableCell>
                <TableCell className="py-2.5 px-3 text-right">
                  <div className="h-3.5 bg-slate-100 rounded w-10 ml-auto" />
                </TableCell>
                <TableCell className="py-2.5 px-3 text-right">
                  <div className="h-5 bg-slate-200 rounded w-12 ml-auto" />
                </TableCell>
                <TableCell className="py-2.5 px-3 text-center">
                  <div className="h-3.5 bg-slate-100 rounded w-10 mx-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
    <div className="rounded-lg border border-slate-200 overflow-hidden bg-white shadow-2xs">
      <Table>
        <TableHeader className="bg-slate-50/90 border-b border-slate-200">
          <TableRow className="hover:bg-transparent border-b border-slate-200">
            <TableHead className="py-2.5 px-3 text-xs font-semibold text-slate-500 text-center w-12">#</TableHead>
            <TableHead className="py-2.5 px-3 text-xs font-semibold text-slate-600">Product Name</TableHead>
            <TableHead className="py-2.5 px-3 text-xs font-semibold text-slate-600">Sentiment Breakdown</TableHead>
            <TableHead className="py-2.5 px-3 text-xs font-semibold text-slate-600 text-right">Reviews</TableHead>
            <TableHead className="py-2.5 px-3 text-xs font-semibold text-slate-600 text-right">Net Score</TableHead>
            <TableHead className="py-2.5 px-3 text-xs font-semibold text-slate-600 text-center w-24">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product, index) => {
            const rowNumber = (page - 1) * pageSize + index + 1;
            return (
              <ProductCard
                key={product.name}
                product={product}
                isSelected={selectedProduct === product.name}
                onSelect={handleSelect}
                onClick={onProductClick}
                rowNumber={rowNumber}
              />
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
