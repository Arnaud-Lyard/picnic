import { Hero } from '@/components/hero';
import type { Metadata } from 'next';

export default function Home() {
  return (
    <div className="py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Hero />
      </div>
    </div>
  );
}
