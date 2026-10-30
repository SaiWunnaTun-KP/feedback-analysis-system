import React, { useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { ProductDetailHeader } from '@/components/reports/ProductDetail/ProductDetailHeader';
import { DriversSection } from '@/components/reports/ProductDetail/DriversSection';
import { WordCloudSection } from '@/components/reports/ProductDetail/WordCloudSection';
import { KeyQuotesSection } from '@/components/reports/ProductDetail/KeyQuotesSection';

export default function ProductDetailPage() {
  const { datasetId, productName } = useParams<{ datasetId?: string; productName?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const decodedProductName = productName ? decodeURIComponent(productName) : '';
  const parsedDatasetId = datasetId ? Number(datasetId) : undefined;

  // Local filter states for interactive drill-down
  const [selectedAspect, setSelectedAspect] = useState<string | null>(null);
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);

  // Section 2 Word Cloud scroll target ref
  const wordCloudRef = useRef<HTMLDivElement>(null);

  // Fetch product detail analysis
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: [
      'product-detail',
      parsedDatasetId,
      decodedProductName,
      selectedAspect,
      selectedKeyword,
    ],
    queryFn: () =>
      reportsApi.getProductDetail(
        parsedDatasetId,
        decodedProductName,
        {
          aspect: selectedAspect || undefined,
          keyword: selectedKeyword || undefined,
        }
      ),
    enabled: !!decodedProductName,
  });

  // Handler for back navigation preserving matrix filters
  const handleBack = () => {
    // Preserve query parameters: datasetId, tab, search, sort, min_volume, page
    const params = new URLSearchParams(searchParams);
    if (parsedDatasetId && !params.has('datasetId')) {
      params.set('datasetId', String(parsedDatasetId));
    }
    const queryString = params.toString();
    navigate(`/dashboard/reports${queryString ? `?${queryString}` : ''}`);
  };

  // Handler when clicking a driver in Section 1:
  // 1. Sets selectedAspect
  // 2. Resets keyword filter
  // 3. Smooth scrolls down to Word Cloud section
  const handleAspectClick = (aspect: string) => {
    if (selectedAspect?.toLowerCase() === aspect.toLowerCase()) {
      setSelectedAspect(null);
    } else {
      setSelectedAspect(aspect);
      setSelectedKeyword(null);
      // Smooth scroll to Word Cloud
      setTimeout(() => {
        wordCloudRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  };

  const handleClearAspect = () => {
    setSelectedAspect(null);
  };

  const handleSelectKeyword = (keyword: string) => {
    if (selectedKeyword?.toLowerCase() === keyword.toLowerCase()) {
      setSelectedKeyword(null);
    } else {
      setSelectedKeyword(keyword);
    }
  };

  const handleClearKeyword = () => {
    setSelectedKeyword(null);
  };

  const handleClearAllFilters = () => {
    setSelectedAspect(null);
    setSelectedKeyword(null);
  };

  if (!decodedProductName) {
    return (
      <div className="space-y-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/dashboard/reports')}
          className="gap-2 bg-white text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Product Action Matrix</span>
        </Button>
        <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
          No product specified. Please select a product from the Product Action Matrix.
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <Button
          variant="outline"
          size="sm"
          onClick={handleBack}
          className="gap-2 bg-white text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Product Action Matrix</span>
        </Button>

        <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-xl border border-rose-200 bg-rose-50/50">
          <AlertCircle className="h-10 w-10 text-rose-500 mb-3" />
          <h2 className="text-lg font-bold text-rose-900">
            Failed to load product detail analysis
          </h2>
          <p className="text-sm text-rose-600 max-w-md mt-1 mb-4">
            {(error as any)?.message || 'An unexpected error occurred while fetching product metrics.'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5 border-rose-300 text-rose-800 hover:bg-rose-100"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const productInfo = data?.product || {
    name: decodedProductName,
    totalReviews: 0,
    positivePct: 0,
    negativePct: 0,
    netScore: 0,
  };

  const drivers = data?.drivers || { negative: [], positive: [] };
  const wordCloud = data?.wordCloud || [];
  const quotes = data?.quotes || { positive: [], negative: [] };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Page Header with Metrics & Navigation */}
      <ProductDetailHeader
        productName={productInfo.name}
        totalReviews={productInfo.totalReviews}
        positivePct={productInfo.positivePct}
        negativePct={productInfo.negativePct}
        netScore={productInfo.netScore}
        lastUpdated={productInfo.lastUpdated}
        onBack={handleBack}
        selectedAspect={selectedAspect}
        selectedKeyword={selectedKeyword}
        onClearAllFilters={handleClearAllFilters}
      />

      {/* SECTION 1: Positive & Negative Drivers (Side-by-side Chattermill style) */}
      <DriversSection
        negativeDrivers={drivers.negative}
        positiveDrivers={drivers.positive}
        selectedAspect={selectedAspect}
        onAspectClick={handleAspectClick}
        isLoading={isLoading}
      />

      {/* SECTION 2: Aspect-Opinion Word Cloud */}
      <WordCloudSection
        ref={wordCloudRef}
        wordCloud={wordCloud}
        selectedAspect={selectedAspect}
        onClearAspect={handleClearAspect}
        selectedKeyword={selectedKeyword}
        onSelectKeyword={handleSelectKeyword}
        onClearKeyword={handleClearKeyword}
        isLoading={isLoading || isFetching}
      />

      {/* SECTION 3: Key Quotes */}
      <KeyQuotesSection
        positiveQuotes={quotes.positive}
        negativeQuotes={quotes.negative}
        selectedAspect={selectedAspect}
        selectedKeyword={selectedKeyword}
        isLoading={isLoading || isFetching}
      />
    </div>
  );
}
