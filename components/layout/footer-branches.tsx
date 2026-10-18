'use client';

import * as React from 'react';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface BranchItem {
  id: string;
  name: string;
  address: string;
}

export function FooterBranches() {
  const [branches, setBranches] = React.useState<BranchItem[] | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;

    async function fetchBranches() {
      try {
        const res = await fetch('/api/public/branches', {
          headers: { credentials: 'omit' },
        });

        if (!res.ok) {
          if (isMounted) {
            setBranches(null);
            setIsLoading(false);
          }
          return;
        }

        const json = await res.json();
        if (isMounted) {
          if (json && json.success) {
            const items = Array.isArray(json.data)
              ? json.data
              : Array.isArray(json.data?.items)
              ? json.data.items
              : [];
            setBranches(items.slice(0, 4));
          } else {
            setBranches(null);
          }
          setIsLoading(false);
        }
      } catch {
        if (isMounted) {
          setBranches(null);
          setIsLoading(false);
        }
      }
    }

    fetchBranches();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-2.5 pt-1" aria-hidden="true">
        <Skeleton className="h-4 w-3/4 rounded-[var(--radius-control)]" />
        <Skeleton className="h-4 w-5/6 rounded-[var(--radius-control)]" />
        <Skeleton className="h-4 w-2/3 rounded-[var(--radius-control)]" />
      </div>
    );
  }

  if (!branches || branches.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 pt-1">
      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        Our Branches
      </div>
      <ul className="space-y-2 text-xs" aria-label="Branch Locations">
        {branches.map((branch) => (
          <li key={branch.id}>
            <Link
              href="/contact#branches"
              className="group flex items-start gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary group-hover:scale-110 transition-transform" />
              <div className="flex flex-col">
                <span className="font-medium text-foreground">{branch.name}</span>
                <span className="text-[11px] text-muted-foreground line-clamp-1">{branch.address}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
