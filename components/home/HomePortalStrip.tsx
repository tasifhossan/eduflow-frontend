import * as React from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Lock, ArrowRight } from 'lucide-react';

export function HomePortalStrip() {
  return (
    <section className="py-12 md:py-16 bg-background border-b border-border/60">
      <Container>
        <div className="rounded-[var(--radius-card)] border border-primary/20 bg-primary/5 p-8 sm:p-10 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl text-left">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Student & Guardian Portal</span>
            </div>

            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
              Direct access to live academic performance & schedules
            </h2>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Enrolled students and linked guardians can sign in to view daily attendance records, model test marks, class routines, fee statements, and branch notices in real time.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-4 pt-1 text-xs font-semibold text-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span>Attendance Tracking</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span>Exam Marksheets</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span>Fee and payment history</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span>Daily Class Routine</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span>Official Notices</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span>Resource Library</span>
              </div>
            </div>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <Button asChild variant="primary" size="lg" className="font-bold shadow-md">
              <Link href="/login" className="inline-flex items-center justify-center gap-2">
                <span>Sign in to Portal</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
