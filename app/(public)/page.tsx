import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import WhoItsFor from '@/components/landing/WhoItsFor';

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <Hero />
      <Features />
      <WhoItsFor />
    </div>
  );
}
