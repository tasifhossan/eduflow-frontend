import { redirect } from 'next/navigation';
import { getCenterData } from '@/lib/center';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import WhoItsFor from '@/components/landing/WhoItsFor';

export default async function HomePage() {
  const center = await getCenterData();

  if (center.features?.publicSite === false) {
    redirect('/login');
  }

  return (
    <div className="flex flex-col">
      <Hero />
      <Features />
      <WhoItsFor />
    </div>
  );
}
