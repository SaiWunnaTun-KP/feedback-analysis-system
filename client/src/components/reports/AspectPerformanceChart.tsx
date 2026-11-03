import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

export interface RawAspectData {
  aspect: string;
  Positive: number;
  Neutral: number;
  Negative: number;
}

export interface ProcessedAspect {
  aspect: string;
  Positive: number;
  Neutral: number;
  Negative: number;
  total: number;
  positivePct: number;
  neutralPct: number;
  negativePct: number;
  netScore: number;
}

function processAspects(
  raw: RawAspectData[],
  options: {
    sortBy: "volume" | "negativePct" | "positivePct" | "netScore";
    showNeutral: boolean;
  }
): ProcessedAspect[] {
  let data = raw.map((item) => {
    const total = item.Positive + item.Neutral + item.Negative;
    const netScore = total === 0 ? 0 : ((item.Positive - item.Negative) / total) * 100;

    if (options.showNeutral) {
      return {
        ...item,
        total,
        positivePct: total === 0 ? 0 : (item.Positive / total) * 100,
        neutralPct: total === 0 ? 0 : (item.Neutral / total) * 100,
        negativePct: total === 0 ? 0 : (item.Negative / total) * 100,
        netScore,
      };
    }

    // Neutral hidden → recalculate using only positive + negative
    const relevantTotal = item.Positive + item.Negative;
    return {
      ...item,
      total,
      positivePct: relevantTotal === 0 ? 0 : (item.Positive / relevantTotal) * 100,
      neutralPct: 0,
      negativePct: relevantTotal === 0 ? 0 : (item.Negative / relevantTotal) * 100,
      netScore,
    };
  });

  // Sort
  data.sort((a, b) => {
    switch (options.sortBy) {
      case "volume":
        return b.total - a.total;
      case "negativePct":
        return b.negativePct - a.negativePct;
      case "positivePct":
        return b.positivePct - a.positivePct;
      case "netScore":
        return b.netScore - a.netScore;
      default:
        return 0;
    }
  });

  return data;
}

interface AspectPerformanceChartProps {
  data: RawAspectData[];
  isLoading?: boolean;
  onAspectSelect?: (aspect: string | null) => void;
  selectedAspect?: string | null;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const netSign = data.netScore > 0 ? '+' : '';
    return (
      <div className="bg-card text-card-foreground border border-slate-200 p-3 rounded-lg shadow-md text-sm">
        <p className="font-bold mb-2 border-b pb-1">Aspect: {label}</p>
        <div className="flex justify-between gap-4">
          <span className="text-emerald-600">Positive</span>
          <span>{data.Positive} ({((data.Positive / (data.total || 1)) * 100).toFixed(0)}%)</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-amber-500">Neutral</span>
          <span>{data.Neutral} ({((data.Neutral / (data.total || 1)) * 100).toFixed(0)}%)</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-rose-500">Negative</span>
          <span>{data.Negative} ({((data.Negative / (data.total || 1)) * 100).toFixed(0)}%)</span>
        </div>
        <div className="flex justify-between gap-4 font-bold border-t pt-1 mt-1">
          <span>Total</span>
          <span>{data.total}</span>
        </div>
        <div className="flex justify-between gap-4 text-slate-500">
          <span>Net Score</span>
          <span>{netSign}{data.netScore.toFixed(0)}</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function AspectPerformanceChart({ data, isLoading, onAspectSelect, selectedAspect }: AspectPerformanceChartProps) {
  const [sortBy, setSortBy] = useState<"volume" | "negativePct" | "positivePct" | "netScore">("volume");
  const [showNeutral, setShowNeutral] = useState(false);
  
  const [page, setPage] = useState(0);
  const ITEMS_PER_PAGE = 6;

  const processedData = useMemo(() => {
    return processAspects(data || [], { sortBy, showNeutral });
  }, [data, sortBy, showNeutral]);

  React.useEffect(() => {
    setPage(0);
  }, [sortBy, showNeutral]);

  const paginatedData = useMemo(() => {
    return processedData.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
  }, [processedData, page]);

  if (isLoading) {
    return <div className="h-full flex items-center justify-center text-slate-400">Loading chart...</div>;
  }

  if (!data || data.length === 0) {
    return <div className="h-full flex items-center justify-center text-slate-400">No data available</div>;
  }

  const handleBarClick = (entry: any) => {
    if (onAspectSelect) {
      onAspectSelect(entry.aspect === selectedAspect ? null : entry.aspect);
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
        <div className="flex gap-2">
          <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="volume">Sort by: Volume</SelectItem>
              <SelectItem value="negativePct">Sort by: % Negative</SelectItem>
              <SelectItem value="positivePct">Sort by: % Positive</SelectItem>
              <SelectItem value="netScore">Sort by: Net Score</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <Checkbox 
            id="showNeutral" 
            checked={showNeutral} 
            onCheckedChange={(checked) => setShowNeutral(!!checked)} 
          />
          <label htmlFor="showNeutral" className="text-slate-600 cursor-pointer">
            Show Neutral
          </label>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={paginatedData}
            margin={{ top: 0, right: 50, left: 20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0"/>
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis 
              type="category" 
              dataKey="aspect" 
              width={100}
              axisLine={false} 
              tickLine={false}
              tick={(props: any) => {
                const { x, y, payload } = props;
                const aspect = paginatedData.find(d => d.aspect === payload.value);
                const isSelected = selectedAspect === payload.value;
                return (
                  <g transform={`translate(${x},${y})`}>
                    <text x={0} y={0} dy={4} textAnchor="end" fill={isSelected ? '#0f172a' : '#64748b'} fontSize={12} fontWeight={isSelected ? 'bold' : 'normal'} className="cursor-pointer" onClick={() => handleBarClick(aspect)}>
                      {payload.value.length > 12 ? payload.value.substring(0, 10) + '...' : payload.value}
                    </text>
                    {aspect && (
                      <text x={-80} y={0} dy={4} textAnchor="start" fill="#94a3b8" fontSize={11}>
                        {aspect.total}
                      </text>
                    )}
                  </g>
                );
              }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
            <Bar dataKey="positivePct" stackId="a" fill="#10b981" onClick={handleBarClick} cursor="pointer">
              {paginatedData.map((entry, index) => (
                <Cell key={`cell-pos-${index}`} opacity={selectedAspect && selectedAspect !== entry.aspect ? 0.3 : 1} />
              ))}
            </Bar>
            {showNeutral && (
              <Bar dataKey="neutralPct" stackId="a" fill="#f59e0b" onClick={handleBarClick} cursor="pointer">
                {paginatedData.map((entry, index) => (
                  <Cell key={`cell-neu-${index}`} opacity={selectedAspect && selectedAspect !== entry.aspect ? 0.3 : 1} />
                ))}
              </Bar>
            )}
            <Bar dataKey="negativePct" stackId="a" fill="#ef4444" onClick={handleBarClick} cursor="pointer">
              {paginatedData.map((entry, index) => (
                <Cell key={`cell-neg-${index}`} opacity={selectedAspect && selectedAspect !== entry.aspect ? 0.3 : 1} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between mt-4 text-xs text-slate-500">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          className="h-8"
        >
          &larr; Previous
        </Button>
        <span>
          {processedData.length > 0 ? page * ITEMS_PER_PAGE + 1 : 0}–
          {Math.min((page + 1) * ITEMS_PER_PAGE, processedData.length)} of {processedData.length}
        </span>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setPage(p => p + 1)}
          disabled={(page + 1) * ITEMS_PER_PAGE >= processedData.length}
          className="h-8"
        >
          Next &rarr;
        </Button>
      </div>
    </div>
  );
}
