import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Layers, ArrowLeft } from 'lucide-react';

export default function ProtectedNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md">
        <EmptyState
          icon={<Layers className="h-7 w-7 text-primary" aria-hidden="true" />}
          title="Resource Not Found"
          description="The requested dashboard record, batch, or session does not exist or has been removed."
          action={
            <Button asChild variant="primary" size="md">
              <Link href="/dashboard" className="inline-flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Dashboard</span>
              </Link>
            </Button>
          }
        />
      </div>
    </div>
  );
}
