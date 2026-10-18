import { Skeleton } from '@/components/ui/skeleton';

export default function ProtectedLoading() {
  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto w-full animate-in fade-in duration-150">
      {/* Header Skeleton */}
      <div className="space-y-2 pb-6 border-b border-border/60">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      {/* Metrics / Cards Row Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="p-5 rounded-[var(--radius-card)] border border-border bg-surface space-y-3"
          >
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3.5 w-32" />
          </div>
        ))}
      </div>

      {/* Main Content Skeleton Area */}
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 space-y-4">
        <div className="flex justify-between items-center pb-4 border-b border-border/60">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-9 w-28 rounded-[var(--radius-control)]" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-10 w-full rounded-[var(--radius-control)]" />
          <Skeleton className="h-10 w-full rounded-[var(--radius-control)]" />
          <Skeleton className="h-10 w-full rounded-[var(--radius-control)]" />
          <Skeleton className="h-10 w-full rounded-[var(--radius-control)]" />
        </div>
      </div>
    </div>
  );
}
