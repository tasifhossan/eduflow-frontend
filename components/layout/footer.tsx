'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Phone, MapPin, Globe } from 'lucide-react';
import { siteConfig } from '@/lib/site-config';
import { Container } from '@/components/ui/container';
import { NewsletterForm } from '@/components/forms/newsletter-form';
import { FooterBranches } from './footer-branches';
import { FooterAuthLinks } from './footer-auth-links';
import { useCenter } from '@/components/providers/center-provider';

// Custom inline SVG icons for social platforms
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { center, features } = useCenter();

  // Filter links by feature flags
  const filteredQuickLinks = siteConfig.footer.quickLinks.filter((link) => {
    if (link.href === '/blog' && !features.blog) return false;
    if (link.href === '/explore' && !features.publicSite) return false;
    return true;
  });

  return (
    <footer
      aria-label="Site Footer"
      className="bg-surface-sunken border-t border-border mt-auto transition-colors duration-200"
    >
      {/* Newsletter Section (Top of Footer, conditionally rendered) */}
      {features.newsletter && (
        <div className="border-b border-border bg-surface/50 py-10 sm:py-12">
          <Container>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8 items-center">
              <div className="lg:col-span-5 space-y-1">
                <span className="text-xs font-bold text-primary tracking-wider uppercase">
                  Stay In The Loop
                </span>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1">
                  Get updates from {center.name}
                </h3>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  Stay informed about admissions, academic notices, and center announcements.
                </p>
              </div>
              <div className="lg:col-span-7">
                <NewsletterForm />
              </div>
            </div>
          </Container>
        </div>
      )}

      {/* Main 4-Column Footer */}
      <div className="py-12 sm:py-16">
        <Container>
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-12 lg:gap-8">
            {/* Column 1: Brand & Socials (4 cols on lg) */}
            <div className="space-y-4 lg:col-span-4">
              <Link
                href="/"
                className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-[var(--radius-control)] w-fit"
                aria-label={`${center.name} Home`}
              >
                {center.logoUrl ? (
                  <Image
                    src={center.logoUrl}
                    alt={center.name}
                    width={36}
                    height={36}
                    className="h-9 w-9 object-contain rounded-[var(--radius-control)]"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] bg-primary text-primary-foreground font-bold text-lg shadow-xs select-none">
                    {center.shortName?.[0] || center.name?.[0] || 'C'}
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="font-bold text-base tracking-tight text-foreground leading-tight">
                    {center.name}
                  </span>
                  {center.tagline ? (
                    <span className="text-[10px] text-muted-foreground leading-tight font-medium">
                      {center.tagline}
                    </span>
                  ) : null}
                </div>
              </Link>

              {center.tagline ? (
                <p className="text-xs leading-relaxed text-muted-foreground max-w-sm">
                  {center.tagline}
                </p>
              ) : null}

              {/* Social Icons */}
              {center.socials && Object.values(center.socials).some(Boolean) && (
                <div className="pt-2">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                    Follow Us
                  </div>
                  <div className="flex items-center gap-2.5">
                    {center.socials.facebook && (
                      <a
                        href={center.socials.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Follow ${center.name} on Facebook`}
                        className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] border border-border bg-surface text-muted-foreground hover:bg-surface-hover hover:text-foreground hover:border-primary/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <FacebookIcon className="h-4 w-4" />
                      </a>
                    )}

                    {center.socials.youtube && (
                      <a
                        href={center.socials.youtube}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Follow ${center.name} on YouTube`}
                        className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] border border-border bg-surface text-muted-foreground hover:bg-surface-hover hover:text-foreground hover:border-primary/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <YouTubeIcon className="h-4 w-4" />
                      </a>
                    )}

                    {center.socials.linkedin && (
                      <a
                        href={center.socials.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Connect with ${center.name} on LinkedIn`}
                        className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] border border-border bg-surface text-muted-foreground hover:bg-surface-hover hover:text-foreground hover:border-primary/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <LinkedInIcon className="h-4 w-4" />
                      </a>
                    )}

                    {center.socials.instagram && (
                      <a
                        href={center.socials.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Follow ${center.name} on Instagram`}
                        className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] border border-border bg-surface text-muted-foreground hover:bg-surface-hover hover:text-foreground hover:border-primary/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <InstagramIcon className="h-4 w-4" />
                      </a>
                    )}

                    {center.socials.website && (
                      <a
                        href={center.socials.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Visit ${center.name} website`}
                        className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] border border-border bg-surface text-muted-foreground hover:bg-surface-hover hover:text-foreground hover:border-primary/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Globe className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Column 2: Navigation Links (2 cols on lg) */}
            <div className="space-y-4 lg:col-span-2">
              <div className="text-xs font-bold text-foreground uppercase tracking-wider">
                Explore
              </div>
              <ul className="space-y-2.5 text-xs">
                {filteredQuickLinks.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Resources & Auth (2 cols on lg) */}
            <div className="space-y-4 lg:col-span-2">
              <div className="text-xs font-bold text-foreground uppercase tracking-wider">
                Resources
              </div>
              <ul className="space-y-2.5 text-xs">
                <li>
                  <Link
                    href="/faq"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Help & FAQ
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
                {/* Dynamic Auth Links: Login/Register or Dashboard */}
                <FooterAuthLinks />
              </ul>
            </div>

            {/* Column 4: Contact & Dynamic Branch List (4 cols on lg) */}
            <div className="space-y-4 lg:col-span-4">
              <div className="text-xs font-bold text-foreground uppercase tracking-wider">
                Contact & Branches
              </div>

              <div className="space-y-2 text-xs">
                {center.contactEmail && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4 shrink-0 text-primary" />
                    <a
                      href={`mailto:${center.contactEmail}`}
                      className="hover:text-foreground transition-colors font-medium"
                    >
                      {center.contactEmail}
                    </a>
                  </div>
                )}

                {center.contactPhone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0 text-primary" />
                    <a
                      href={`tel:${center.contactPhone}`}
                      className="hover:text-foreground transition-colors font-medium"
                    >
                      {center.contactPhone}
                    </a>
                  </div>
                )}

                {center.address && (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                    <span>{center.address}</span>
                  </div>
                )}
              </div>

              {/* Dynamic Branches from GET /api/public/branches */}
              {features.publicSite && <FooterBranches />}
            </div>
          </div>
        </Container>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border py-6 bg-surface/30">
        <Container>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <div>
              &copy; {currentYear} {center.name}. All rights reserved.
            </div>

            {/* Powered By EduFlow Credit */}
            {features.showPoweredBy !== false && (
              <div className="text-[11px] text-muted-foreground/70">
                Powered by <span className="font-semibold text-foreground/80">EduFlow</span>
              </div>
            )}

            <div className="flex items-center gap-6">
              <Link
                href="/privacy"
                className="hover:text-foreground transition-colors font-medium"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="hover:text-foreground transition-colors font-medium"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </Container>
      </div>
    </footer>
  );
}
