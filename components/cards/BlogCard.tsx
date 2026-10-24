import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';
import { useCenter } from '@/components/providers/center-provider';
import { Calendar, FileText, ArrowRight } from 'lucide-react';

export interface BlogPostData {
  id: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  coverImage?: string | null;
  category?: string | null;
  publishedAt?: string | null;
  createdAt?: string;
}

export interface BlogCardProps {
  post: BlogPostData;
  className?: string;
}

export function BlogCard({ post, className }: BlogCardProps) {
  const { center } = useCenter();
  const [imgError, setImgError] = React.useState(false);

  const formattedDate = formatDate(
    post.publishedAt || post.createdAt,
    center.timezone,
    center.defaultLocale
  );

  return (
    <Card
      hoverEffect
      className={cn(
        'group flex flex-col h-full overflow-hidden border border-border bg-surface text-foreground shadow-card transition-all duration-200',
        className
      )}
    >
      {/* 16/9 Aspect Image Container */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
        {post.coverImage && !imgError ? (
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
            <FileText className="h-10 w-10 text-muted-foreground/60" aria-hidden="true" />
          </div>
        )}

        {post.category && (
          <div className="absolute left-3 top-3 z-10">
            <Badge variant="primary" size="sm" className="shadow-sm backdrop-blur-md">
              {post.category}
            </Badge>
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1 p-5 space-y-3">
        {formattedDate && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" aria-hidden="true" />
            <span>{formattedDate}</span>
          </div>
        )}

        <h3 className="text-base sm:text-lg font-bold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
          <Link href={`/blog/${post.slug}`}>
            {post.title}
          </Link>
        </h3>

        {post.excerpt && (
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed flex-1">
            {post.excerpt}
          </p>
        )}

        <div className="mt-auto pt-3 border-t border-border/60">
          <Link
            href={`/blog/${post.slug}`}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-primary hover:underline group-hover:translate-x-0.5 transition-transform"
          >
            <span>Read full article</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </Card>
  );
}
