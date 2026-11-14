import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { datasetsApi, reportsApi } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Download,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  Target,
  AlertCircle
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import AspectPerformanceChart from '../../components/reports/AspectPerformanceChart';
import ProductActionMatrix from '../../components/reports/ProductActionMatrix';
import DeepDiveDrillDown from '../../components/reports/DeepDiveDrillDown';

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: datasetsData, isLoading: loadingDatasets } = useQuery({
    queryKey: ['datasets', { all: true }],
    queryFn: () => datasetsApi.get({ all: true }),
  });

  const datasets: any[] = useMemo(() => {
    return Array.isArray(datasetsData) 
      ? datasetsData 
      : (datasetsData?.datasets || []);
  }, [datasetsData]);

  // Sort completed datasets descending by creation date (newest first)
  const completedDatasets = useMemo(() => {
    return datasets
      .filter((d: any) => d.status === 'COMPLETED')
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [datasets]);

  const queryDatasetId = searchParams.get('datasetId');
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(() => queryDatasetId || '');

  // Automatically default to the latest completed dataset if no valid dataset is selected
  useEffect(() => {
    if (completedDatasets.length === 0) return;

    const currentQueryId = searchParams.get('datasetId');
    const isValidQueryId = currentQueryId && completedDatasets.some((d: any) => d.id.toString() === currentQueryId);

    if (isValidQueryId) {
      if (selectedDatasetId !== currentQueryId) {
        setSelectedDatasetId(currentQueryId);
      }
    } else {
      // Latest completed dataset is at index 0
      const latestDatasetId = completedDatasets[0].id.toString();
      if (selectedDatasetId !== latestDatasetId) {
        setSelectedDatasetId(latestDatasetId);
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set('datasetId', latestDatasetId);
          return next;
        }, { replace: true });
      }
    }
  }, [completedDatasets, searchParams, selectedDatasetId, setSearchParams]);

  // Filters for drilldown and other components
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [filterAspect, setFilterAspect] = useState<string | null>(null);

  const handleDatasetChange = (val: string) => {
    setSelectedDatasetId(val);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('datasetId', val);
      return next;
    }, { replace: true });
    setSelectedProduct(null);
    setFilterAspect(null);
  };

  const selectedDataset = completedDatasets.find((d: any) => d.id.toString() === selectedDatasetId);

  const { data: overviewData, isLoading: loadingOverview } = useQuery({
    queryKey: ['reports', 'overview', selectedDatasetId],
    queryFn: () => reportsApi.getOverview(Number(selectedDatasetId)),
    enabled: !!selectedDatasetId,
  });

  const allProducts = useMemo(() => {
    if (!overviewData?.actionMatrix) return [];
    return [
      ...overviewData.actionMatrix.star,
      ...overviewData.actionMatrix.needsAttention,
      ...overviewData.actionMatrix.mixed,
    ];
  }, [overviewData]);

  if (loadingDatasets) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        <div className="flex items-center gap-3">
          <span className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading reports...</span>
        </div>
      </div>
    );
  }

  if (completedDatasets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="h-16 w-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center">
          <BarChart3 size={32} />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">No Reports Available</h2>
        <p className="text-slate-500 max-w-md">
          You don't have any completed dataset analyses yet. Go to Dataset Management to upload a CSV file and run an analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Analysis Reports</h1>
          <p className="text-slate-500">Detailed insights and sentiment analysis results.</p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedDatasetId} onValueChange={handleDatasetChange}>
            <SelectTrigger className="w-[280px] bg-card border-slate-200">
              <SelectValue placeholder="Select a dataset" />
            </SelectTrigger>
            <SelectContent>
              {completedDatasets.map((d: any) => (
                <SelectItem key={d.id} value={d.id.toString()}>
                  {d.filename} ({new Date(d.createdAt).toLocaleDateString()})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2" onClick={() => window.print()}>
            <Download size={16} /> Export
          </Button>
        </div>
      </div>

      {selectedDataset && overviewData ? (
        <>
          {/* Executive Overview - Modern 3-Column Layout */}
          {(() => {
            const executive = overviewData.executiveOverview;
            const totalFeedbacks = executive.totalFeedbacks || 0;
            const formattedVolume = totalFeedbacks >= 1000
              ? `${(totalFeedbacks / 1000).toFixed(1).replace(/\.0$/, '')}k`
              : totalFeedbacks.toLocaleString();

            const positiveItem = executive.sentimentBreakdown?.find((s: any) => s.name === 'Positive');
            const negativeItem = executive.sentimentBreakdown?.find((s: any) => s.name === 'Negative');
            const neutralItem = executive.sentimentBreakdown?.find((s: any) => s.name === 'Neutral');

            const posCount = positiveItem?.value ?? executive.positiveCount ?? 0;
            const negCount = negativeItem?.value ?? executive.negativeCount ?? 0;
            const neuCount = neutralItem?.value ?? executive.neutralCount ?? 0;
            const totalAspects = (posCount + negCount + neuCount) || totalFeedbacks || 1;

            const positivePct = executive.positivePct ?? Math.round((posCount / totalAspects) * 100);
            const negativePct = executive.negativePct ?? Math.round((negCount / totalAspects) * 100);
            const neutralPct = executive.neutralPct ?? Math.max(0, 100 - positivePct - negativePct);

            // Option A: 5 for Pos, 3 for Neu, 1 for Neg
            const avgScore = executive.averageScore !== undefined
              ? Number(executive.averageScore).toFixed(1)
              : (totalAspects > 0
                  ? ((posCount * 5.0 + neuCount * 3.0 + negCount * 1.0) / totalAspects).toFixed(1)
                  : '0.0');

            const topProductObj = executive.topProductDetails ||
              allProducts.find((p: any) => p.name === executive.topProduct);
            const criticalProductObj = executive.criticalProductDetails ||
              allProducts.find((p: any) => p.name === executive.criticalProduct);

            const topProductName = executive.topProduct || topProductObj?.name || 'N/A';
            const criticalProductName = executive.criticalProduct || criticalProductObj?.name || 'N/A';

            // SVG Donut Calculations (r=38, C ≈ 238.76)
            const radius = 38;
            const circumference = 2 * Math.PI * radius;
            const posStroke = (positivePct / 100) * circumference;
            const negStroke = (negativePct / 100) * circumference;
            const neuStroke = (neutralPct / 100) * circumference;

            const posOffset = 0;
            const negOffset = -posStroke;
            const neuOffset = -(posStroke + negStroke);

            return (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                {/* 1. Feedback Volume Card */}
                <div className="bg-slate-100/70 dark:bg-card rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs min-h-[220px]">
                  <h3 className="text-base font-semibold text-slate-800 tracking-tight">
                    Feedback volume
                  </h3>
                  <div className="flex-1 flex items-center justify-center py-4">
                    <span className="font-serif text-5xl sm:text-6xl text-slate-900 tracking-tight select-all">
                      {formattedVolume}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-slate-400">
                    Total customer reviews processed
                  </div>
                </div>

                {/* 2. Sentiment Breakdown Card with Donut & Avg Score */}
                <div className="bg-card rounded-2xl border border-slate-200 p-6 shadow-xs min-h-[220px] flex flex-col justify-between">
                  <h3 className="text-base font-semibold text-slate-800 tracking-tight">
                    Sentiment
                  </h3>
                  <div className="flex items-center justify-between gap-4 my-auto py-2">
                    {/* Left: Percentage Breakdown */}
                    <div className="space-y-3.5 flex-1 max-w-[150px]">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2.5 font-medium text-slate-700">
                          <span className="h-2.5 w-2.5 rounded-full bg-[#34d399] shadow-xs shadow-emerald-200 dark:shadow-none" />
                          Positive
                        </span>
                        <span className="font-semibold text-slate-900">{positivePct}%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2.5 font-medium text-slate-700">
                          <span className="h-2.5 w-2.5 rounded-full bg-[#fda4af] shadow-xs shadow-rose-200 dark:shadow-none" />
                          Negative
                        </span>
                        <span className="font-semibold text-slate-900">{negativePct}%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2.5 font-medium text-slate-700">
                          <span className="h-2.5 w-2.5 rounded-full bg-[#93c5fd] shadow-xs shadow-sky-200 dark:shadow-none" />
                          Neutral
                        </span>
                        <span className="font-semibold text-slate-900">{neutralPct}%</span>
                      </div>
                    </div>

                    {/* Right: Donut Chart with Average Score inside */}
                    <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        {/* Background subtle ring */}
                        <circle
                          cx="50"
                          cy="50"
                          r={radius}
                          className="stroke-slate-100 dark:stroke-slate-800"
                          strokeWidth="8"
                          fill="none"
                        />
                        {/* Positive segment */}
                        {positivePct > 0 && (
                          <circle
                            cx="50"
                            cy="50"
                            r={radius}
                            stroke="#34d399"
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray={`${Math.max(0, posStroke - 2)} ${circumference}`}
                            strokeDashoffset={posOffset}
                            strokeLinecap="round"
                          />
                        )}
                        {/* Negative segment */}
                        {negativePct > 0 && (
                          <circle
                            cx="50"
                            cy="50"
                            r={radius}
                            stroke="#fda4af"
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray={`${Math.max(0, negStroke - 2)} ${circumference}`}
                            strokeDashoffset={negOffset}
                            strokeLinecap="round"
                          />
                        )}
                        {/* Neutral segment */}
                        {neutralPct > 0 && (
                          <circle
                            cx="50"
                            cy="50"
                            r={radius}
                            stroke="#93c5fd"
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray={`${Math.max(0, neuStroke - 2)} ${circumference}`}
                            strokeDashoffset={neuOffset}
                            strokeLinecap="round"
                          />
                        )}
                      </svg>

                      {/* Score inside Donut Ring */}
                      <div className="absolute inset-0 flex items-center justify-center gap-1.5 pointer-events-none select-none">
                        <span className="font-serif text-3xl font-bold text-slate-900 leading-none">
                          {avgScore}
                        </span>
                        <div className="flex flex-col text-[10px] text-slate-500 font-medium leading-[1.15] text-left">
                          <span>average</span>
                          <span>score</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs font-medium text-slate-400">
                    Weighted 5-star sentiment scale
                  </div>
                </div>

                {/* 3. Section 3: Stacked Cards (Top Score & Critical Product) */}
                <div className="flex flex-col gap-4 h-full">
                  {/* Top Score Product Card */}
                  <div className="flex-1 bg-card rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-emerald-300 dark:hover:border-emerald-500/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <TrendingUp className="h-4 w-4" />
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Top Score Product
                        </span>
                      </div>
                      {topProductObj?.score ? (
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                          ★ {topProductObj.score}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          Top Rated
                        </span>
                      )}
                    </div>
                    <div className="mt-2">
                      <h4 className="text-base sm:text-lg font-bold text-slate-900 truncate" title={topProductName}>
                        {topProductName}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                        {topProductObj?.positivePct !== undefined ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{topProductObj.positivePct}% Positive</span>
                        ) : null}
                        {topProductObj?.totalReviews ? (
                          <span className="text-slate-400">• {topProductObj.totalReviews} feedbacks</span>
                        ) : null}
                      </p>
                    </div>
                  </div>

                  {/* Critical Product Card */}
                  <div className="flex-1 bg-card rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-rose-300 dark:hover:border-rose-500/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                          <AlertCircle className="h-4 w-4" />
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Critical Product
                        </span>
                      </div>
                      {criticalProductObj?.negativePct ? (
                        <span className="text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
                          {criticalProductObj.negativePct}% Negative
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">
                          Needs Review
                        </span>
                      )}
                    </div>
                    <div className="mt-2">
                      <h4 className="text-base sm:text-lg font-bold text-slate-900 truncate" title={criticalProductName}>
                        {criticalProductName}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                        <span className="text-rose-600 dark:text-rose-400 font-semibold">Needs Attention</span>
                        {criticalProductObj?.totalReviews ? (
                          <span className="text-slate-400">• {criticalProductObj.totalReviews} feedbacks</span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          

          {/* Product Action Matrix (Server-Driven) */}
          <ProductActionMatrix
            datasetId={selectedDatasetId ? Number(selectedDatasetId) : undefined}
            data={allProducts}
            selectedProduct={selectedProduct}
            onProductSelect={setSelectedProduct}
          />

          {/* Deep Dive Drill-Down */}
          <DeepDiveDrillDown
            datasetId={Number(selectedDatasetId)}
            products={overviewData.products || []}
            aspects={overviewData.aspects || []}
            selectedProduct={selectedProduct}
            onProductSelect={setSelectedProduct}
            selectedAspect={filterAspect}
            onAspectSelect={setFilterAspect}
          />
        </>
      ) : (
        <div className="p-12 text-center text-slate-500 bg-card rounded-2xl border border-slate-200 flex flex-col items-center justify-center gap-3 shadow-xs">
          {loadingOverview ? (
            <div className="flex items-center gap-3 text-slate-600 font-medium">
              <span className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span>Loading report data...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <BarChart3 className="h-8 w-8 text-slate-400" />
              <p className="text-slate-800 font-semibold">Please select a valid dataset</p>
              <p className="text-xs text-slate-400 max-w-sm">
                Choose a completed dataset from the dropdown above to view insights, performance charts, and product action matrices.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
