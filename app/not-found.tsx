import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export default function RootNotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md">
        <EmptyState
          icon={<FileQuestion className="h-7 w-7 text-primary" aria-hidden="true" />}
          title="Page Not Found"
          description="The page you are looking for does not exist or has been moved to another section."
          action={
            <Button asChild variant="primary" size="md">
              <Link href="/" className="inline-flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Return to Home</span>
              </Link>
            </Button>
          }
        />
      </div>
    </div>
  );
}
