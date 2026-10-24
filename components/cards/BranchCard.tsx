import * as React from 'react';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/card';
import { MapPin, Phone, ExternalLink } from 'lucide-react';

export interface BranchData {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
}

export interface BranchCardProps {
  branch: BranchData;
  className?: string;
}

export function BranchCard({ branch, className }: BranchCardProps) {
  const encodedAddress = encodeURIComponent(branch.address || branch.name);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;

  return (
    <Card
      hoverEffect
      className={cn(
        'group flex flex-col justify-between p-6 h-full border border-border bg-surface text-foreground shadow-card transition-all duration-200',
        className
      )}
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary">
            <MapPin className="h-5 w-5" aria-hidden="true" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors">
            {branch.name}
          </h3>
        </div>

        {branch.address ? (
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {branch.address}
          </p>
        ) : (
          <p className="text-xs sm:text-sm text-muted-foreground italic">
            Address details available on contact
          </p>
        )}

        {branch.phone && (
          <div className="flex items-center gap-2 text-xs sm:text-sm text-foreground/80 font-medium">
            <Phone className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
            <a
              href={`tel:${branch.phone}`}
              className="hover:underline hover:text-primary transition-colors"
            >
              {branch.phone}
            </a>
          </div>
        )}
      </div>

      <div className="mt-5 pt-4 border-t border-border/60">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-primary hover:underline group-hover:translate-x-0.5 transition-transform"
        >
          <span>Get directions</span>
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
    </Card>
  );
}
