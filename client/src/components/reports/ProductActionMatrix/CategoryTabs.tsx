import React from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, Sparkles, RefreshCw } from 'lucide-react';

export type MatrixCategory = 'needs_attention' | 'star' | 'mixed';

export interface CategoryTabsProps {
  activeTab: MatrixCategory;
  onTabChange: (tab: MatrixCategory) => void;
  counts: {
    star: number;
    needs_attention: number;
    mixed: number;
  };
  isLoading?: boolean;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  activeTab,
  onTabChange,
  counts,
  isLoading,
}) => {
  const tabs = [
    {
      id: 'needs_attention' as MatrixCategory,
      label: 'Needs Attention',
      count: counts.needs_attention ?? 0,
      icon: AlertTriangle,
      color: 'rose',
      activeBorder: 'border-rose-500',
      activeText: 'text-rose-700',
      badgeBgActive: 'bg-rose-100 text-rose-700',
      badgeBgInactive: 'bg-slate-100 text-slate-600',
    },
    {
      id: 'star' as MatrixCategory,
      label: 'Star Products',
      count: counts.star ?? 0,
      icon: Sparkles,
      color: 'emerald',
      activeBorder: 'border-emerald-500',
      activeText: 'text-emerald-700',
      badgeBgActive: 'bg-emerald-100 text-emerald-700',
      badgeBgInactive: 'bg-slate-100 text-slate-600',
    },
    {
      id: 'mixed' as MatrixCategory,
      label: 'Mixed Reviews',
      count: counts.mixed ?? 0,
      icon: RefreshCw,
      color: 'amber',
      activeBorder: 'border-amber-500',
      activeText: 'text-amber-700',
      badgeBgActive: 'bg-amber-100 text-amber-700',
      badgeBgInactive: 'bg-slate-100 text-slate-600',
    },
  ];

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = index;
    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    }
    if (nextIndex !== index) {
      e.preventDefault();
      onTabChange(tabs[nextIndex].id);
    }
  };

  return (
    <div className="border-b border-slate-200">
      <div
        role="tablist"
        aria-label="Product categories"
        className="flex items-center gap-2 sm:gap-6 -mb-px overflow-x-auto no-scrollbar"
      >
        {tabs.map((tab, idx) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onTabChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={cn(
                "group inline-flex items-center gap-2 py-3 px-2 sm:px-3 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2",
                isActive
                  ? cn(tab.activeBorder, tab.activeText, "font-semibold")
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 transition-colors",
                  isActive
                    ? tab.activeText
                    : "text-slate-400 group-hover:text-slate-600"
                )}
              />
              <span>{tab.label}</span>
              <span
                className={cn(
                  "ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-semibold rounded-full transition-colors",
                  isActive ? tab.badgeBgActive : tab.badgeBgInactive,
                  isLoading && "opacity-60"
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
