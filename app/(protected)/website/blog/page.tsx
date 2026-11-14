'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  FileText,
  Plus,
  Search,
  Edit,
} from 'lucide-react';
import { RequireRole } from '@/components/providers/require-role';
import { useCenter } from '@/components/providers/center-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { CmsStatusBadge, CmsContentStatus } from '@/components/content/status-badges';
import { formatDate } from '@/lib/format';
import { apiGet } from '@/lib/api';

interface BlogPostSummary {
  [key: string]: unknown;
  id: string;
  slug: string;
  title: string;
  category?: string | null;
  excerpt?: string | null;
  isPublished: boolean;
  publishedAt?: string | null;
  status: CmsContentStatus;
  createdAt: string;
  updatedAt: string;
  author?: { id: string; name: string } | null;
  updatedBy?: { id: string; name: string } | null;
}

interface BlogListResponse {
  posts: BlogPostSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function WebsiteBlogListPage() {
  const { center } = useCenter();

  const [posts, setPosts] = React.useState<BlogPostSummary[]>([]);
  const [pagination, setPagination] = React.useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all');
  const [categories, setCategories] = React.useState<string[]>([]);

  const fetchPosts = React.useCallback(
    async (pageToLoad = 1) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set('page', String(pageToLoad));
        params.set('limit', '10');
        if (search.trim()) params.set('q', search.trim());
        if (statusFilter !== 'all') params.set('status', statusFilter);
        if (categoryFilter !== 'all') params.set('category', categoryFilter);

        const res = await apiGet<{ success: boolean; data: BlogListResponse }>(
          `/api/cms/blog?${params.toString()}`
        );

        if (res.success && res.data) {
          setPosts(res.data.posts);
          setPagination(res.data.pagination);

          // Extract unique categories
          const cats = Array.from(
            new Set(
              res.data.posts
                .map((p) => p.category?.trim())
                .filter((c): c is string => Boolean(c))
            )
          );
          setCategories((prev) => Array.from(new Set([...prev, ...cats])));
        } else {
          setError('Failed to load blog posts.');
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to connect to server.');
      } finally {
        setLoading(false);
      }
    },
    [search, statusFilter, categoryFilter]
  );

  React.useEffect(() => {
    let mounted = true;
    const params = new URLSearchParams();
    params.set('page', '1');
    params.set('limit', '10');
    if (search.trim()) params.set('q', search.trim());
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (categoryFilter !== 'all') params.set('category', categoryFilter);

    apiGet<{ success: boolean; data: BlogListResponse }>(`/api/cms/blog?${params.toString()}`)
      .then((res) => {
        if (!mounted) return;
        if (res.success && res.data) {
          setPosts(res.data.posts);
          setPagination(res.data.pagination);
          const cats = Array.from(
            new Set(
              res.data.posts
                .map((p) => p.category?.trim())
                .filter((c): c is string => Boolean(c))
            )
          );
          setCategories((prev) => Array.from(new Set([...prev, ...cats])));
        } else {
          setError('Failed to load blog posts.');
        }
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to connect to server.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [search, statusFilter, categoryFilter]);

  const columns: Column<BlogPostSummary>[] = [
    {
      key: 'title',
      header: 'Article',
      render: (post) => (
        <div className="space-y-1 max-w-md">
          <Link
            href={`/website/blog/${post.id}`}
            className="font-semibold text-foreground hover:text-primary transition-colors line-clamp-1 block text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            {post.title}
          </Link>
          {post.excerpt && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {post.excerpt}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (post) =>
        post.category ? (
          <Badge variant="primary" size="sm">
            {post.category}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (post) => (
        <CmsStatusBadge
          status={post.status}
          scheduledAt={post.publishedAt}
        />
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (post) => {
        const displayDate = post.publishedAt || post.createdAt;
        return (
          <div className="text-xs text-muted-foreground">
            {formatDate(displayDate, center.timezone, center.defaultLocale)}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Action',
      render: (post) => (
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-8 px-2 text-xs"
        >
          <Link href={`/website/blog/${post.id}`}>
            <Edit className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Edit
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <RequireRole roles={['ADMIN', 'SUPER_ADMIN']}>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Blog Articles"
          description="Create, schedule, and publish educational articles and admissions updates."
          icon={<FileText className="h-6 w-6 text-primary" aria-hidden="true" />}
          actions={
            <Button
              asChild
              variant="primary"
              size="md"
              className="gap-1.5"
            >
              <Link href="/website/blog/new">
                <Plus className="h-4 w-4" aria-hidden="true" />
                New Article
              </Link>
            </Button>
          }
        />

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-surface p-4 rounded-[var(--radius-card)] border border-border">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              placeholder="Search by title or excerpt..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs sm:text-sm h-10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="h-10 px-3 rounded-[var(--radius-control)] border border-border bg-surface text-foreground text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Drafts</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
            </select>

            {/* Category Filter */}
            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="Filter by category"
                className="h-10 px-3 rounded-[var(--radius-control)] border border-border bg-surface text-foreground text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Table & Content */}
        {error ? (
          <ErrorState
            title="Failed to load blog posts"
            message={error}
            onRetry={() => fetchPosts(pagination.page)}
          />
        ) : !loading && posts.length === 0 ? (
          <EmptyState
            title="No blog articles found"
            description={
              search || statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'Try clearing your search query or filters to find posts.'
                : 'Get started by creating your first blog article.'
            }
            action={
              <Button asChild variant="primary" size="sm">
                <Link href="/website/blog/new">
                  <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
                  Create Article
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            <DataTable
              columns={columns}
              data={posts}
              isLoading={loading}
            />

            {pagination.totalPages > 1 && (
              <div className="pt-2">
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={(p) => fetchPosts(p)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </RequireRole>
  );
}
