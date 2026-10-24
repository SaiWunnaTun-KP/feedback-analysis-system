import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, ChevronRight, Check } from 'lucide-react';

export const PRODUCT_MATRIX_CONFIG = {
  star: {
    minPositivePct: 75,
    maxNegativePct: 15,
  },
  needsAttention: {
    minNegativePct: 30,
  },
  minVolumeForClassification: 5,
};

export interface RawProductData {
  name: string;
  totalReviews: number;
  positivePct: number;
  negativePct: number;
}

export interface ProcessedProduct extends RawProductData {
  netScore: number;
  category: "star" | "needs_attention" | "mixed";
}

interface ProductActionMatrixProps {
  data: RawProductData[];
  onProductSelect?: (product: string | null) => void;
  selectedProduct?: string | null;
}

function getNetScoreVariant(score: number): { bg: string, text: string, border: string } {
  if (score >= 40) return { bg: 'bg-emerald-500', text: 'text-white', border: 'border-emerald-600' };
  if (score >= 10) return { bg: 'bg-amber-400', text: 'text-slate-900', border: 'border-amber-500' };
  return { bg: 'bg-rose-500', text: 'text-white', border: 'border-rose-600' };
}

function classifyProduct(p: { positivePct: number; negativePct: number; total: number }): "star" | "needs_attention" | "mixed" {
  const { positivePct, negativePct, total } = p;

  if (total < PRODUCT_MATRIX_CONFIG.minVolumeForClassification) return "mixed";

  if (positivePct >= PRODUCT_MATRIX_CONFIG.star.minPositivePct && negativePct <= PRODUCT_MATRIX_CONFIG.star.maxNegativePct) {
    return "star";
  }

  if (negativePct >= PRODUCT_MATRIX_CONFIG.needsAttention.minNegativePct || negativePct > positivePct) {
    return "needs_attention";
  }

  return "mixed";
}

export default function ProductActionMatrix({ data, onProductSelect, selectedProduct }: ProductActionMatrixProps) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"volume" | "netScore" | "positivePct" | "negativePct">("volume");
  const [minVolume, setMinVolume] = useState("1");
  const [collapsed, setCollapsed] = useState({
    star: false,
    needsAttention: false,
    mixed: false,
  });

  const toggleCollapse = (section: keyof typeof collapsed) => {
    setCollapsed(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const processedData = useMemo(() => {
    let items: ProcessedProduct[] = data.map((item) => {
      const netScore = item.positivePct - item.negativePct;
      return {
        ...item,
        netScore,
        category: classifyProduct({
          positivePct: item.positivePct,
          negativePct: item.negativePct,
          total: item.totalReviews
        }),
      };
    });

    const minVol = parseInt(minVolume, 10);
    items = items.filter((i) => i.totalReviews >= minVol);

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((i) => i.name.toLowerCase().includes(q));
    }

    items.sort((a, b) => {
      switch (sortBy) {
        case "volume":
          return b.totalReviews - a.totalReviews;
        case "netScore":
          return b.netScore - a.netScore;
        case "positivePct":
          return b.positivePct - a.positivePct;
        case "negativePct":
          return b.negativePct - a.negativePct;
        default:
          return 0;
      }
    });

    const needsAttn = items.filter((i) => i.category === "needs_attention");
    if (sortBy === 'volume') {
      needsAttn.sort((a, b) => {
        if (b.negativePct !== a.negativePct) return b.negativePct - a.negativePct;
        return b.totalReviews - a.totalReviews;
      });
    }

    return {
      star: items.filter((i) => i.category === "star"),
      needsAttention: needsAttn,
      mixed: items.filter((i) => i.category === "mixed"),
    };
  }, [data, search, sortBy, minVolume]);

  const renderRow = (p: ProcessedProduct) => {
    const isSelected = selectedProduct === p.name;
    const isStar = p.category === 'star';
    const isNeedsAttention = p.category === 'needs_attention';

    const netVariant = getNetScoreVariant(p.netScore);

    return (
      <div
        key={p.name}
        onClick={() => onProductSelect && onProductSelect(isSelected ? null : p.name)}
        className={`flex items-center justify-between p-3 mb-2 rounded-md cursor-pointer transition-all border-l-4 group
          ${isSelected
            ? `ring-1 shadow-sm ${isStar ? 'bg-emerald-50 ring-emerald-300 border-emerald-600' :
              isNeedsAttention ? 'bg-rose-50 ring-rose-300 border-rose-600' :
                'bg-amber-50 ring-amber-300 border-amber-500'
            }`
            : `bg-white hover:bg-slate-50 ${isStar ? 'border-emerald-400' :
              isNeedsAttention ? 'border-rose-400' :
                'border-amber-400'
            }`
          }
        `}
      >
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${isSelected ? 'text-slate-900' : 'text-slate-800'}`}>{p.name}</span>
          </div>
          <span className="text-sm flex items-center gap-4 mt-1">
            <span className="text-emerald-600 font-medium whitespace-nowrap">🟢 {p.positivePct}% Pos</span>
            <span className="text-rose-600 font-medium whitespace-nowrap">🔴 {p.negativePct}% Neg</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500 whitespace-nowrap">{p.totalReviews} reviews</span>
          </span>
        </div>
        <div className="text-right flex items-center gap-3">
          {isSelected && (
            <span className="text-xs font-medium text-slate-500 hidden sm:flex items-center gap-1 opacity-80">
              <Check size={14} /> Filtered
            </span>
          )}
          <Badge className={`font-mono border ${netVariant.bg} ${netVariant.text} ${netVariant.border}`}>
            {p.netScore > 0 ? '+' : ''}{p.netScore}
          </Badge>
        </div>
      </div>
    );
  };

  return (
    <Card className="shadow-sm border-slate-200/50">
      <CardHeader>
        <CardTitle>Product Action Matrix</CardTitle>
        <CardDescription>Products categorized based on their performance.</CardDescription>
        <div className="flex flex-wrap gap-4 pt-4">
          <div className="relative w-full sm:w-auto flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search products..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="volume">Sort: Volume</SelectItem>
              <SelectItem value="netScore">Sort: Net Score</SelectItem>
              <SelectItem value="positivePct">Sort: Positive %</SelectItem>
              <SelectItem value="negativePct">Sort: Negative %</SelectItem>
            </SelectContent>
          </Select>
          <Select value={minVolume} onValueChange={setMinVolume}>
            <SelectTrigger className="w-[160px]">
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
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Star Product Section */}
        <div>
          <div
            className="flex items-center gap-2 mb-3 cursor-pointer hover:opacity-80 transition-opacity w-max"
            onClick={() => toggleCollapse('star')}
          >
            {collapsed.star ? <ChevronRight size={18} className="text-emerald-700" /> : <ChevronDown size={18} className="text-emerald-700" />}
            <h3 className="font-semibold text-emerald-700 select-none">Star Product</h3>
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none">{processedData.star.length}</Badge>
          </div>
          {!collapsed.star && (
            <div className="border border-emerald-100 rounded-lg p-2 bg-emerald-50/30">
              {processedData.star.length > 0 ? (
                processedData.star.map(renderRow)
              ) : (
                <p className="text-sm text-slate-500 p-4 text-center">No star products match the current filters.</p>
              )}
            </div>
          )}
        </div>

        {/* Needs Attention Section */}
        <div>
          <div
            className="flex items-center gap-2 mb-3 cursor-pointer hover:opacity-80 transition-opacity w-max"
            onClick={() => toggleCollapse('needsAttention')}
          >
            {collapsed.needsAttention ? <ChevronRight size={18} className="text-rose-700" /> : <ChevronDown size={18} className="text-rose-700" />}
            <h3 className="font-semibold text-rose-700 select-none">Needs Attention</h3>
            <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-200 border-none">{processedData.needsAttention.length}</Badge>
          </div>
          {!collapsed.needsAttention && (
            <div className="border border-rose-100 rounded-lg p-2 bg-rose-50/30">
              {processedData.needsAttention.length > 0 ? (
                processedData.needsAttention.map(renderRow)
              ) : (
                <p className="text-sm text-slate-500 p-4 text-center">No products need attention with the current filters.</p>
              )}
            </div>
          )}
        </div>

        {/* Mixed Reviews Section */}
        <div>
          <div
            className="flex items-center gap-2 mb-3 cursor-pointer hover:opacity-80 transition-opacity w-max"
            onClick={() => toggleCollapse('mixed')}
          >
            {collapsed.mixed ? <ChevronRight size={18} className="text-amber-700" /> : <ChevronDown size={18} className="text-amber-700" />}
            <h3 className="font-semibold text-amber-700 select-none">Mixed Reviews</h3>
            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-none">{processedData.mixed.length}</Badge>
          </div>
          {!collapsed.mixed && (
            <div className="border border-amber-100 rounded-lg p-2 bg-amber-50/30">
              {processedData.mixed.length > 0 ? (
                processedData.mixed.map(renderRow)
              ) : (
                <p className="text-sm text-slate-500 p-4 text-center">No mixed-review products match the current filters.</p>
              )}
            </div>
          )}
        </div>

      </CardContent>
    </Card>
  );
}
