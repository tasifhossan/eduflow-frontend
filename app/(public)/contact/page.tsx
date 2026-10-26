import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCenterData } from '@/lib/center';
import { serverFetch } from '@/lib/server-api';
import { Container } from '@/components/ui/container';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { BranchCard, BranchData } from '@/components/cards/BranchCard';
import { ContactForm } from '@/components/contact/contact-form';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageCircle,
  Globe,
  HelpCircle,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const center = await getCenterData();
  return {
    title: `Contact Us | ${center.name}`,
    description: `Get in touch with ${center.name}. Branch locations, office hours, phone numbers, and admissions desk.`,
  };
}

export default async function ContactPage() {
  const center = await getCenterData();

  if (center.features?.publicSite === false) {
    notFound();
  }

  // Fetch branches and batches in parallel
  const [branchesRes, batchesRes] = await Promise.all([
    serverFetch<BranchData[]>('/api/public/branches'),
    serverFetch<{ items: Array<{ id: string; name: string }> }>('/api/public/batches?limit=50'),
  ]);

  const branches = branchesRes.ok && Array.isArray(branchesRes.data) ? branchesRes.data : [];
  const batches =
    batchesRes.ok && Array.isArray(batchesRes.data?.items)
      ? batchesRes.data.items.map((b) => ({ id: b.id, name: b.name }))
      : [];

  const waDigits = center.whatsapp?.replace(/\D/g, '') || center.contactPhone?.replace(/\D/g, '');

  return (
    <div className="py-8 sm:py-16">
      <Container>
        {/* Page Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16 space-y-3">
          <Badge variant="primary" size="sm">
            Admissions &amp; Support Desk
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Get in Touch with {center.name}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Have questions about course admissions, fee structures, or campus routines? Reach out to our administrative counseling team.
          </p>
        </div>

        {/* Contact Info Facts Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Main Campus / Address */}
          <Card className="p-5 bg-surface border-border shadow-xs space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary">
              <MapPin className="h-5 w-5" />
            </div>
            <h2 className="text-sm font-bold text-foreground">Central Campus</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {center.address || 'Dhaka, Bangladesh'}
            </p>
          </Card>

          {/* Contact Numbers & WhatsApp */}
          <Card className="p-5 bg-surface border-border shadow-xs space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Phone className="h-5 w-5" />
            </div>
            <h2 className="text-sm font-bold text-foreground">Phone &amp; WhatsApp</h2>
            <div className="space-y-1 text-xs text-muted-foreground">
              {center.contactPhone && (
                <div>
                  <a href={`tel:${center.contactPhone}`} className="hover:text-primary transition-colors font-medium">
                    {center.contactPhone}
                  </a>
                </div>
              )}
              {waDigits && (
                <div>
                  <a
                    href={`https://wa.me/${waDigits}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>WhatsApp Chat</span>
                  </a>
                </div>
              )}
            </div>
          </Card>

          {/* Email Support */}
          <Card className="p-5 bg-surface border-border shadow-xs space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Mail className="h-5 w-5" />
            </div>
            <h2 className="text-sm font-bold text-foreground">Email Inquiries</h2>
            <p className="text-xs text-muted-foreground">
              {center.contactEmail ? (
                <a href={`mailto:${center.contactEmail}`} className="hover:text-primary transition-colors font-medium">
                  {center.contactEmail}
                </a>
              ) : (
                'admissions@example.com'
              )}
            </p>
          </Card>

          {/* Office Hours */}
          <Card className="p-5 bg-surface border-border shadow-xs space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
            <h2 className="text-sm font-bold text-foreground">Visiting Hours</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {center.officeHours || 'Saturday – Thursday: 9:00 AM – 8:00 PM'}
            </p>
          </Card>
        </div>

        {/* Message Form & Branches Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-16">
          {/* Contact Form (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Direct Message
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Send an Admission Inquiry
              </h2>
            </div>
            <ContactForm batches={batches} />
          </div>

          {/* Socials & FAQ Link Callout (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Campus Branches List */}
            {branches.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-base font-bold text-foreground">
                  Our Campuses &amp; Branches ({branches.length})
                </h3>
                <div className="space-y-3">
                  {branches.map((b) => (
                    <BranchCard key={b.id} branch={b} />
                  ))}
                </div>
              </div>
            )}

            {/* Quick FAQ Callout */}
            <Card className="p-6 bg-surface-sunken/40 border-border space-y-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  Looking for quick answers?
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Check our Frequently Asked Questions page for details on registration prerequisites, exam schedules, and guardian portal access.
              </p>
              <a
                href="/faq"
                className="inline-flex text-xs font-semibold text-primary hover:underline"
              >
                Visit Help &amp; FAQ &rarr;
              </a>
            </Card>
          </div>
        </div>
      </Container>
    </div>
  );
}
