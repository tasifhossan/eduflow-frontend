'use client';

import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/cn';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Avatar({
  src,
  alt = '',
  name = '',
  size = 'md',
  className,
  ...props
}: AvatarProps) {
  const [imageError, setImageError] = React.useState(false);

  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg',
  };

  const getInitials = (text: string) => {
    if (!text) return 'U';
    const parts = text.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const hasValidImage = Boolean(src) && !imageError;

  return (
    <div
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted font-semibold text-foreground select-none',
        sizes[size],
        className
      )}
      {...props}
    >
      {hasValidImage ? (
        <Image
          src={src as string}
          alt={alt || name || 'Avatar'}
          fill
          sizes="64px"
          className="object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <span>{getInitials(name || alt)}</span>
      )}
    </div>
  );
}
