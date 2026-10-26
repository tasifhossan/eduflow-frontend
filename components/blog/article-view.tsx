'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SafeText } from '@/components/content/safe-text';
import { BlogCard, BlogPostData } from '@/components/cards/BlogCard';
import { formatDate } from '@/lib/format';
import { toast } from 'sonner';
import {
  Calendar,
  Clock,
  User,
  Share2,
  Copy,
  MessageCircle,
  ArrowLeft,
  FileText,
} from 'lucide-react';

export interface ArticleData {
  id: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  content: string;
  coverImage?: string | null;
  category?: string | null;
  authorName?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  relatedPosts?: BlogPostData[];
}

export interface ArticleViewProps {
  post: ArticleData;
  timezone?: string;
  locale?: string;
  centerName: string;
}

export function ArticleView({
  post,
  timezone,
  locale,
  centerName,
}: ArticleViewProps) {
  const publishedDate = formatDate(
    post.publishedAt || post.createdAt,
    timezone,
    locale
  );

  // Approximate reading time (average 200 words per minute)
  const wordCount = post.content.trim().split(/\s+/).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const handleCopyLink = async () => {
    if (typeof window !== 'undefined') {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Article link copied to clipboard!');
    }
  };

  const handleShareWhatsApp = () => {
    if (typeof window !== 'undefined') {
      const url = encodeURIComponent(window.location.href);
      const text = encodeURIComponent(`Read "${post.title}" on ${centerName}: `);
      window.open(`https://wa.me/?text=${text}${url}`, '_blank');
    }
  };

  const handleShareFacebook = () => {
    if (typeof window !== 'undefined') {
      const url = encodeURIComponent(window.location.href);
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
    }
  };

  return (
    <article className="py-8 sm:py-16">
      <Container>
        {/* Top Back Link */}
        <div className="max-w-3xl mx-auto mb-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to all articles</span>
          </Link>
        </div>

        {/* Article Header */}
        <header className="max-w-3xl mx-auto mb-8 space-y-4">
          {post.category && (
            <Badge variant="primary" size="md">
              {post.category}
            </Badge>
          )}

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              {post.excerpt}
            </p>
          )}

          {/* Meta row: Author, Date, Reading time */}
          <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-border text-xs text-muted-foreground">
            {post.authorName && (
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <User className="h-4 w-4 text-primary" />
                <span>{post.authorName}</span>
              </div>
            )}
            {publishedDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>{publishedDate}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>{readingTime} min read</span>
            </div>
          </div>
        </header>

        {/* Cover Image */}
        {post.coverImage && (
          <div className="max-w-4xl mx-auto mb-10 rounded-[var(--radius-card)] overflow-hidden border border-border bg-muted aspect-[16/9] relative">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              sizes="(max-width: 1024px) 100vw, 896px"
              priority
              className="object-cover"
            />
          </div>
        )}

        {/* Main Article Content rendered with SafeText */}
        <div className="max-w-3xl mx-auto pb-10 border-b border-border">
          <SafeText content={post.content} className="prose-content" />
        </div>

        {/* Social Share Strip */}
        <div className="max-w-3xl mx-auto py-6 flex flex-wrap items-center justify-between gap-4 border-b border-border">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Share2 className="h-4 w-4" />
            <span>Share this article</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyLink} className="h-8 gap-1.5 text-xs">
              <Copy className="h-3.5 w-3.5" />
              <span>Copy Link</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleShareWhatsApp} className="h-8 gap-1.5 text-xs">
              <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />
              <span>WhatsApp</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleShareFacebook} className="h-8 gap-1.5 text-xs">
              <span>Facebook</span>
            </Button>
          </div>
        </div>

        {/* Related Articles */}
        {post.relatedPosts && post.relatedPosts.length > 0 && (
          <div className="max-w-5xl mx-auto pt-12 space-y-6">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Related Articles
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {post.relatedPosts.slice(0, 3).map((rel) => (
                <BlogCard key={rel.id} post={rel} />
              ))}
            </div>
          </div>
        )}
      </Container>
    </article>
  );
}
