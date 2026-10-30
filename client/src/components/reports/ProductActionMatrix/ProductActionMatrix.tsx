import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { reportsApi } from '@/services/api';
import type { ProductMatrixProduct } from '@/services/api';
import { MatrixControls } from './MatrixControls';
import type { SortOption } from './MatrixControls';
import { CategoryTabs } from './CategoryTabs';
import type { MatrixCategory } from './CategoryTabs';
import { ProductListView } from './ProductListView';
import { MatrixPagination } from './MatrixPagination';

export interface RawProductData {
  name: string;
  totalReviews: number;
  positivePct: number;
  negativePct: number;
  score?: number;
}

export interface ProductActionMatrixProps {
  datasetId?: number;
  data?: RawProductData[];
  selectedProduct?: string | null;
  onProductSelect?: (product: string | null) => void;
}

const STORAGE_KEYS = {
  MIN_VOLUME: 'pam_min_volume',
};

export const ProductActionMatrix: React.FC<ProductActionMatrixProps> = ({
  datasetId,
  selectedProduct,
  onProductSelect,
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Read initial values from URL search params if coming back from Product Detail Page
  const queryTab = searchParams.get('tab') as MatrixCategory | null;
  const validTabs: MatrixCategory[] = ['star', 'needs_attention', 'mixed'];
  const initialTab = queryTab && validTabs.includes(queryTab) ? queryTab : 'needs_attention';

  const initialSearch = searchParams.get('search') || '';
  const querySort = searchParams.get('sort') as SortOption | null;
  const validSorts: SortOption[] = ['volume', 'net_score', 'pos_pct', 'neg_pct'];
  const initialSort = querySort && validSorts.includes(querySort) ? querySort : 'volume';

  const queryMinVol = Number(searchParams.get('min_volume'));
  const initialMinVol = [1, 5, 10, 20].includes(queryMinVol)
    ? queryMinVol
    : (() => {
        try {
          const saved = localStorage.getItem(STORAGE_KEYS.MIN_VOLUME);
          const parsed = Number(saved);
          return [1, 5, 10, 20].includes(parsed) ? parsed : 5;
        } catch {
          return 5;
        }
      })();

  const queryPage = Number(searchParams.get('page'));
  const initialPage = queryPage && queryPage > 0 ? queryPage : 1;

  // Local state with localStorage & URL persistence
  const [activeTab, setActiveTab] = useState<MatrixCategory>(initialTab);
  const [search, setSearch] = useState<string>(initialSearch);
  const [sortBy, setSortBy] = useState<SortOption>(initialSort);
  const [minVolume, setMinVolume] = useState<number>(initialMinVol);
  const [page, setPage] = useState<number>(initialPage);
  const pageSize = 10;

  // Navigate to full-page Product Detail Analysis while preserving matrix query params
  const handleProductClick = (productName: string) => {
    const params = new URLSearchParams();
    if (datasetId) params.set('datasetId', String(datasetId));
    params.set('tab', activeTab);
    if (search) params.set('search', search);
    params.set('sort', sortBy);
    params.set('min_volume', String(minVolume));
    params.set('page', String(page));

    const encodedName = encodeURIComponent(productName);
    const targetUrl = datasetId
      ? `/dashboard/reports/${datasetId}/product/${encodedName}?${params.toString()}`
      : `/dashboard/reports/product/${encodedName}?${params.toString()}`;

    if (onProductSelect) {
      onProductSelect(productName);
    }
    navigate(targetUrl);
  };

  // Persist minVolume and reset page
  const handleMinVolumeChange = (vol: number) => {
    setMinVolume(vol);
    setPage(1);
    try {
      localStorage.setItem(STORAGE_KEYS.MIN_VOLUME, String(vol));
    } catch (e) {
      console.warn('Failed to save min volume to localStorage', e);
    }
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleSortChange = (val: SortOption) => {
    setSortBy(val);
    setPage(1);
  };

  const handleTabChange = (tab: MatrixCategory) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setMinVolume(5);
    setSortBy('volume');
    setPage(1);
    try {
      localStorage.setItem(STORAGE_KEYS.MIN_VOLUME, '5');
    } catch {
      // ignore
    }
  };

  // Server-driven data query
  const {
    data: matrixData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: [
      'product-matrix',
      datasetId,
      activeTab,
      search,
      sortBy,
      minVolume,
      page,
      pageSize,
    ],
    queryFn: () =>
      reportsApi.getProductMatrix({
        datasetId,
        category: activeTab,
        search,
        sort: sortBy,
        min_volume: minVolume,
        page,
        page_size: pageSize,
      }),
    enabled: datasetId !== undefined && !isNaN(datasetId),
    placeholderData: (previousData) => previousData,
  });

  const tabsCounts = matrixData?.tabs || {
    star: 0,
    needs_attention: 0,
    mixed: 0,
  };

  const products: ProductMatrixProduct[] = matrixData?.products || [];
  const pagination = matrixData?.pagination || {
    page: 1,
    page_size: pageSize,
    total_items: 0,
    total_pages: 1,
  };

  return (
    <Card className="shadow-sm border-slate-200/80 bg-white">
      {/* Header */}
      <CardHeader className="pb-0 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
          <div>
            <CardTitle className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Product Action Matrix
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Triage products into operational buckets to prioritize marketing champions and address critical feedback risks.
            </CardDescription>
          </div>
          {isFetching && !isLoading && (
            <span className="inline-flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full font-medium shrink-0 animate-in fade-in">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Updating...
            </span>
          )}
        </div>

        {/* Category Tabs */}
        <CategoryTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          counts={tabsCounts}
          isLoading={isFetching}
        />
      </CardHeader>

      <CardContent className="space-y-3 pt-3">
        {/* Controls Bar: Search & Filters directly above the table */}
        <MatrixControls
          search={search}
          onSearchChange={handleSearchChange}
          sortBy={sortBy}
          onSortChange={handleSortChange}
          minVolume={minVolume}
          onMinVolumeChange={handleMinVolumeChange}
        />

        {/* Error State */}
        {isError ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-xl border border-rose-200 bg-rose-50/50">
            <AlertCircle className="h-8 w-8 text-rose-500 mb-2" />
            <h4 className="text-sm font-semibold text-rose-900">
              Failed to load product matrix
            </h4>
            <p className="text-xs text-rose-600 max-w-sm mt-1">
              {(error as any)?.message || 'An unexpected error occurred while communicating with the server.'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="mt-3 gap-1.5 text-xs border-rose-300 text-rose-800 hover:bg-rose-100"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try Again
            </Button>
          </div>
        ) : (
          <>
            {/* Content Area: Table View */}
            <div
              id={`panel-${activeTab}`}
              role="tabpanel"
              aria-labelledby={`tab-${activeTab}`}
            >
              <ProductListView
                products={products}
                selectedProduct={selectedProduct}
                onProductSelect={onProductSelect}
                onProductClick={handleProductClick}
                isLoading={isLoading}
                activeTab={activeTab}
                onResetFilters={handleResetFilters}
                page={pagination.page}
                pageSize={pagination.page_size}
              />
            </div>

            {/* Pagination Controls */}
            {!isLoading && pagination.total_items > 0 && (
              <MatrixPagination
                page={pagination.page}
                pageSize={pagination.page_size}
                totalItems={pagination.total_items}
                totalPages={pagination.total_pages}
                onPageChange={(p) => setPage(p)}
                isLoading={isFetching}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductActionMatrix;
