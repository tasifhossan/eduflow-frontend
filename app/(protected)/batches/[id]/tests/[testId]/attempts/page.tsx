import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string; testId: string }>;
}

export default async function TestAttemptsRedirectPage({ params }: PageProps) {
  const { id, testId } = await params;
  redirect(`/batches/${id}/tests/${testId}/results?tab=attempts`);
}

