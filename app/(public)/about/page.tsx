import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCenterData } from '@/lib/center';
import { serverFetch } from '@/lib/server-api';
import { Container } from '@/components/ui/container';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { SafeText } from '@/components/content/safe-text';
import { TeacherCard, TeacherData } from '@/components/cards/TeacherCard';
import { BranchCard, BranchData } from '@/components/cards/BranchCard';
import {
  Compass,
  Eye,
  CheckCircle2,
  Users,
  Building,
  GraduationCap,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const center = await getCenterData();
  return {
    title: `About Us | ${center.name}`,
    description: `Learn about ${center.name}, our academic mission, leadership team, and student-first learning environments.`,
  };
}

interface AboutPageData {
  headline?: string;
  body?: string;
  mission?: string;
  vision?: string;
  facilities?: string[];
}

export default async function AboutPage() {
  const center = await getCenterData();

  if (center.features?.publicSite === false) {
    notFound();
  }

  // Fetch about data, teachers, and branches in parallel
  const [aboutRes, teachersRes, branchesRes] = await Promise.all([
    serverFetch<AboutPageData>('/api/public/pages/about'),
    serverFetch<TeacherData[]>('/api/public/teachers'),
    serverFetch<BranchData[]>('/api/public/branches'),
  ]);

  const about = aboutRes.ok && aboutRes.data ? aboutRes.data : center.about;
  const teachers = teachersRes.ok && Array.isArray(teachersRes.data) ? teachersRes.data : [];
  const branches = branchesRes.ok && Array.isArray(branchesRes.data) ? branchesRes.data : [];

  const headline =
    about?.headline || `Empowering Students for Academic and Admission Success at ${center.name}`;
  const storyBody =
    about?.body ||
    `Established to provide structured, high-impact academic preparation, **${center.name}** combines experienced subject faculties with disciplined routine management.\n\nOur curriculum integrates comprehensive board syllabus coverage, regular chapter-wise model examinations, and individualized guardian progress updates. Whether preparing for secondary board credentials or competitive university entrance examinations, our academic framework ensures students gain deep conceptual mastery.`;

  return (
    <div className="py-8 sm:py-16 space-y-16">
      <Container>
        {/* Hero Section */}
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-12 sm:mb-16">
          <Badge variant="primary" size="sm">
            About Our Institution
          </Badge>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-[1.2]">
            {headline}
          </h1>
          {center.tagline && (
            <p className="text-base sm:text-lg text-primary font-medium">
              {center.tagline}
            </p>
          )}
        </div>

        {/* Story Section */}
        <div className="max-w-3xl mx-auto rounded-[var(--radius-card)] border border-border bg-surface p-6 sm:p-10 shadow-xs space-y-6">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Our Journey &amp; Educational Commitment
          </h2>
          <SafeText content={storyBody} className="prose-content" />
        </div>

        {/* Mission & Vision Grid */}
        {(about?.mission || about?.vision) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-12">
            {about.mission && (
              <Card className="p-6 sm:p-8 bg-surface border-border shadow-xs space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary">
                  <Compass className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Our Mission</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {about.mission}
                </p>
              </Card>
            )}

            {about.vision && (
              <Card className="p-6 sm:p-8 bg-surface border-border shadow-xs space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] bg-secondary/10 text-secondary">
                  <Eye className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Our Vision</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {about.vision}
                </p>
              </Card>
            )}
          </div>
        )}

        {/* Facilities Section */}
        {about?.facilities && about.facilities.length > 0 && (
          <div className="max-w-4xl mx-auto pt-10 border-t border-border space-y-6">
            <div className="text-center space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Learning Environment
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Campus Facilities &amp; Infrastructure
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {about.facilities.map((fac, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-[var(--radius-control)] border border-border bg-surface flex items-center gap-3 text-xs sm:text-sm font-semibold text-foreground shadow-2xs"
                >
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>{fac}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructors Strip */}
        {teachers.length > 0 && (
          <div className="pt-12 border-t border-border space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4" />
                  Faculty Members
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  Meet Our Dedicated Teachers
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {teachers.slice(0, 6).map((teacher) => (
                <TeacherCard key={teacher.id} teacher={teacher} />
              ))}
            </div>
          </div>
        )}

        {/* Branches Strip */}
        {branches.length > 0 && (
          <div className="pt-12 border-t border-border space-y-8">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Building className="h-4 w-4" />
                Physical Campuses
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Our Campus Locations
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {branches.map((b) => (
                <BranchCard key={b.id} branch={b} />
              ))}
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}
