'use client';

import * as React from 'react';
import { cn } from '@/lib/cn';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Skeleton } from './skeleton';
import { EmptyState } from './empty-state';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  className?: string;
  render?: (row: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  skeletonRows?: number;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  rowKey?: (row: T, index: number) => string | number;
  onRowClick?: (row: T) => void;
  className?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  isLoading = false,
  skeletonRows = 5,
  sortKey,
  sortDirection,
  onSort,
  emptyTitle = 'No data available',
  emptyDescription = 'There are no records matching your current filter criteria.',
  emptyAction,
  rowKey,
  onRowClick,
  className,
}: DataTableProps<T>) {
  const getSortIcon = (colKey: string) => {
    if (sortKey !== colKey) {
      return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/60" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-3.5 w-3.5 text-primary" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5 text-primary" />
    );
  };

  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-card',
        className
      )}
    >
      {/* Mobile-responsive horizontal scroll container */}
      <div className="w-full overflow-x-auto custom-scrollbar">
        <table className="w-full min-w-[600px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 transition-colors">
              {columns.map((col) => {
                const isSortable = col.sortable && onSort;
                const alignment =
                  col.align === 'right'
                    ? 'text-right justify-end'
                    : col.align === 'center'
                    ? 'text-center justify-center'
                    : 'text-left justify-start';

                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={cn(
                      'px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground select-none',
                      col.className
                    )}
                  >
                    {isSortable ? (
                      <button
                        type="button"
                        onClick={() => onSort(col.key)}
                        className={cn(
                          'inline-flex items-center gap-1.5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1 -ml-1',
                          alignment
                        )}
                      >
                        <span>{col.header}</span>
                        {getSortIcon(col.key)}
                      </button>
                    ) : (
                      <span className={cn('block', col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left')}>
                        {col.header}
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-border/60">
            {isLoading ? (
              // Loading Skeleton Rows
              Array.from({ length: skeletonRows }).map((_, rIdx) => (
                <tr key={`skeleton-${rIdx}`} className="bg-surface">
                  {columns.map((col) => (
                    <td key={`col-${col.key}`} className="px-5 py-4">
                      <Skeleton className="h-4 w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              // Empty State Row
              <tr>
                <td colSpan={columns.length} className="p-8 text-center">
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    action={emptyAction}
                  />
                </td>
              </tr>
            ) : (
              // Render Data Rows
              data.map((row, rIdx) => {
                const key = rowKey ? rowKey(row, rIdx) : rIdx;
                const isClickable = Boolean(onRowClick);

                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      'transition-colors bg-surface hover:bg-surface-hover/60',
                      isClickable && 'cursor-pointer'
                    )}
                  >
                    {columns.map((col) => {
                      const cellValue = row[col.key];
                      const rendered = col.render ? col.render(row, rIdx) : String(cellValue ?? '');

                      return (
                        <td
                          key={col.key}
                          className={cn(
                            'px-5 py-4 text-sm text-foreground',
                            col.align === 'right'
                              ? 'text-right'
                              : col.align === 'center'
                              ? 'text-center'
                              : 'text-left',
                            col.className
                          )}
                        >
                          {rendered}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
