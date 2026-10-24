import React, { useState, useMemo } from 'react';
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

  const datasets: any[] = Array.isArray(datasetsData) 
    ? datasetsData 
    : (datasetsData?.datasets || []);

  const completedDatasets = datasets.filter((d: any) => d.status === 'COMPLETED');

  const queryDatasetId = searchParams.get('datasetId');
  const defaultDatasetId = queryDatasetId || (completedDatasets.length > 0 ? completedDatasets[0].id.toString() : '');

  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(defaultDatasetId);

  // Filters for drilldown and other components
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [filterAspect, setFilterAspect] = useState<string | null>(null);

  const handleDatasetChange = (val: string) => {
    setSelectedDatasetId(val);
    setSearchParams({ datasetId: val });
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
    return <div className="p-8 text-center text-slate-500">Loading reports...</div>;
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
            <SelectTrigger className="w-[280px] bg-white">
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
          {/* Executive Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="shadow-sm border-slate-200/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                  <p className="text-sm font-medium text-slate-500">Total Feedbacks</p>
                  <Target className="h-4 w-4 text-slate-400" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{overviewData.executiveOverview.totalFeedbacks}</div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-slate-200/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                  <p className="text-sm font-medium text-slate-500">Overall Health Score</p>
                  <AlertCircle className="h-4 w-4 text-slate-400" />
                </div>
                <div className="text-2xl font-bold text-emerald-600">{overviewData.executiveOverview.healthScore}% Positive</div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-slate-200/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                  <p className="text-sm font-medium text-slate-500">Top Product</p>
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="text-lg font-bold text-slate-900 truncate" title={overviewData.executiveOverview.topProduct}>
                  {overviewData.executiveOverview.topProduct}
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-slate-200/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                  <p className="text-sm font-medium text-slate-500">Critical Product</p>
                  <AlertCircle className="h-4 w-4 text-rose-500" />
                </div>
                <div className="text-lg font-bold text-slate-900 truncate" title={overviewData.executiveOverview.criticalProduct}>
                  {overviewData.executiveOverview.criticalProduct}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Doughnut Chart */}
            <Card className="shadow-sm border-slate-200/50 h-[440px] flex flex-col lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4 text-blue-600" /> Sentiment Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={overviewData.executiveOverview.sentimentBreakdown}
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {overviewData.executiveOverview.sentimentBreakdown.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value: any, name: any) => {
                        const total = overviewData.executiveOverview.sentimentBreakdown.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);
                        const percent = total > 0 ? ((Number(value) / total) * 100).toFixed(1) : "0.0";
                        return [`${value} (${percent}%)`, name];
                      }}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Stacked Bar Chart */}
            <Card className="shadow-sm border-slate-200/50 h-[440px] flex flex-col lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-600" /> Aspect Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 relative">
                <AspectPerformanceChart
                  data={overviewData.aspectPerformance}
                  selectedAspect={filterAspect}
                  onAspectSelect={setFilterAspect}
                />
              </CardContent>
            </Card>
          </div>

          {/* Product Action Matrix */}
          <ProductActionMatrix
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
        <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200/50 flex items-center justify-center gap-3">
          {loadingOverview ? 'Loading report data...' : 'Please select a valid dataset to view its report.'}
        </div>
      )}
    </div>
  );
}
