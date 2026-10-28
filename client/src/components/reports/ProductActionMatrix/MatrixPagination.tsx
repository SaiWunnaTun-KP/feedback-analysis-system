import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MatrixPaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  isLoading?: boolean;
}

export const MatrixPagination: React.FC<MatrixPaginationProps> = ({
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  isLoading,
}) => {
  if (totalItems === 0) return null;

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  // Generate page numbers with ellipses
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (page > 3) {
        pages.push('...');
      }

      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (page < totalPages - 2) {
        pages.push('...');
      }
      pages.push(totalPages);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 text-xs sm:text-sm text-slate-600">
      {/* Range text */}
      <div className="font-medium text-slate-500">
        Showing{' '}
        <span className="font-semibold text-slate-900">{startItem}</span>
        {' '}–{' '}
        <span className="font-semibold text-slate-900">{endItem}</span>
        {' '}of{' '}
        <span className="font-semibold text-slate-900">{totalItems}</span>
        {' '}products
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-1">
        {/* Previous */}
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1 || isLoading}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
          className="h-8 w-8 p-0 cursor-pointer disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page Buttons */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((p, index) => {
            if (p === '...') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="px-2 py-1 text-slate-400 select-none text-xs"
                >
                  …
                </span>
              );
            }

            const pageNum = Number(p);
            const isCurrent = pageNum === page;

            return (
              <Button
                key={pageNum}
                variant={isCurrent ? 'default' : 'outline'}
                size="sm"
                disabled={isLoading}
                onClick={() => onPageChange(pageNum)}
                aria-current={isCurrent ? 'page' : undefined}
                className={cn(
                  "h-8 min-w-8 px-2 text-xs font-semibold cursor-pointer",
                  isCurrent
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                    : "text-slate-700 hover:bg-slate-100"
                )}
              >
                {pageNum}
              </Button>
            );
          })}
        </div>

        {/* Next */}
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages || isLoading}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
          className="h-8 w-8 p-0 cursor-pointer disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
