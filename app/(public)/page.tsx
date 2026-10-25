import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCenterData } from '@/lib/center';

// Homepage Sections
import { AnnouncementBar } from '@/components/home/AnnouncementBar';
import { HomeHero } from '@/components/home/HomeHero';
import { HomeHighlights } from '@/components/home/HomeHighlights';
import { HomeCourses } from '@/components/home/HomeCourses';
import { HomeWhyChooseUs } from '@/components/home/HomeWhyChooseUs';
import { HomeSubjects } from '@/components/home/HomeSubjects';
import { HomeAdmissionSteps } from '@/components/home/HomeAdmissionSteps';
import { HomeTeachers } from '@/components/home/HomeTeachers';
import { HomePortalStrip } from '@/components/home/HomePortalStrip';
import { HomeTestimonials } from '@/components/home/HomeTestimonials';
import { HomeBranchesContact } from '@/components/home/HomeBranchesContact';
import { HomeEnquiryForm } from '@/components/home/HomeEnquiryForm';
import { HomeFaq } from '@/components/home/HomeFaq';
import { HomeLatestPosts } from '@/components/home/HomeLatestPosts';
import { FloatingWhatsApp } from '@/components/ui/floating-whatsapp';

export async function generateMetadata(): Promise<Metadata> {
  const center = await getCenterData();
  const title = center.tagline ? `${center.name} | ${center.tagline}` : center.name;
  const description =
    center.homepage?.heroSubtitle ||
    center.tagline ||
    'Coaching management and admission admissions portal';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: center.logoUrl ? [{ url: center.logoUrl }] : [],
    },
  };
}

export default async function HomePage() {
  const center = await getCenterData();

  // If public site feature flag is disabled, redirect to login
  if (center.features?.publicSite === false) {
    redirect('/login');
  }

  const { homepage, features } = center;

  return (
    <div className="flex flex-col min-h-screen">
      {/* a. Announcement bar */}
      <AnnouncementBar announcement={homepage?.announcement} />

      {/* b. Hero section (always present) */}
      <HomeHero center={center} />

      {/* c. Highlights strip */}
      <HomeHighlights highlights={homepage?.highlights} />

      {/* d. Courses section */}
      <HomeCourses />

      {/* e. Why choose us */}
      <HomeWhyChooseUs items={homepage?.whyChooseUs} />

      {/* f. Subjects chips */}
      <HomeSubjects />

      {/* g. How to enrol */}
      <HomeAdmissionSteps steps={homepage?.admissionSteps} />

      {/* h. Teachers */}
      <HomeTeachers />

      {/* i. Student and guardian portal strip */}
      <HomePortalStrip />

      {/* j. Testimonials */}
      <HomeTestimonials enabled={features?.testimonials !== false} />

      {/* k. Branches and contact */}
      <HomeBranchesContact center={center} />

      {/* l. Enquiry form (always present) */}
      <HomeEnquiryForm />

      {/* m. FAQ */}
      <HomeFaq />

      {/* n. Latest posts */}
      <HomeLatestPosts enabled={features?.blog !== false} />

      {/* Floating WhatsApp button */}
      <FloatingWhatsApp whatsapp={center.whatsapp} />
    </div>
  );
}
