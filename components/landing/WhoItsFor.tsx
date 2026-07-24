"use client";

import { Check, BookOpen, GraduationCap } from "lucide-react";

export default function WhoItsFor() {
  return (
    <section id="who-its-for" className="py-20 lg:py-28 bg-background scroll-mt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <h2 className="font-poppins text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            Tailored for Every Coaching Style
          </h2>
          <p className="font-inter text-base text-text-body leading-relaxed">
            Whether you run a local subject-wise tutoring hub or a massive nationwide admission coaching branch, 
            EduFlow adapts perfectly to your operational structure.
          </p>
        </div>

        {/* Two Columns */}
        <div className="grid gap-8 lg:grid-cols-2 max-w-5xl mx-auto">
          {/* Card 1: Academic Coaching */}
          <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm transition-all hover:shadow-md">
            <div>
              {/* Highlight Tag */}
              <div className="flex items-center justify-between mb-6">
                <span className="inline-flex items-center rounded-full bg-highlight/15 px-3 py-1 text-xs font-semibold text-highlight ring-1 ring-inset ring-highlight/20">
                  Academic Prep (Class 6 - 12)
                </span>
                <BookOpen className="h-6 w-6 text-accent" />
              </div>

              <h3 className="font-poppins text-2xl font-bold text-primary mb-3">
                Academic Coaching
              </h3>
              <p className="font-inter text-sm text-text-body leading-relaxed mb-6">
                Designed for tutoring centers focusing on school and college curricula (SSC & HSC). 
                Track long-term academic progress, syllabus completion, and keep parents updated.
              </p>

              {/* Features List */}
              <ul className="space-y-3.5">
                {[
                  "Subject-wise student batches (Physics, Math, Chemistry, English)",
                  "Monthly and bi-monthly fee tracking and invoice printing",
                  "Academic chapter-wise test results and report cards",
                  "Automatic SMS alerts to guardians for daily attendance and performance"
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <span className="font-inter text-sm text-text-body">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <p className="text-xs text-text-body/70 italic">
                Best for: local tutoring hubs, school subject prep teachers, and batch tutors.
              </p>
            </div>
          </div>

          {/* Card 2: Admission Coaching */}
          <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm transition-all hover:shadow-md">
            <div>
              {/* Highlight Tag */}
              <div className="flex items-center justify-between mb-6">
                <span className="inline-flex items-center rounded-full bg-highlight/15 px-3 py-1 text-xs font-semibold text-highlight ring-1 ring-inset ring-highlight/20">
                  Admission Prep
                </span>
                <GraduationCap className="h-6 w-6 text-accent" />
              </div>

              <h3 className="font-poppins text-2xl font-bold text-primary mb-3">
                Admission Coaching
              </h3>
              <p className="font-inter text-sm text-text-body leading-relaxed mb-6">
                Engineered for high-intensity coaching preparing students for Medical, Engineering (BUET/CKRUET), 
                and University Admission tests (DU, JU, RU, GST).
              </p>

              {/* Features List */}
              <ul className="space-y-3.5">
                {[
                  "High-capacity student batches and central batch synchronization",
                  "MCQ exam engine with negative marking (0.25 penalty per wrong answer)",
                  "Instant auto-generated merit list rankings across the entire batch",
                  "Combined scorecards (Physics, Chemistry, Math, Biology, English)"
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <span className="font-inter text-sm text-text-body">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <p className="text-xs text-text-body/70 italic">
                Best for: Medical, Engineering, and Varsity admission centers looking to track rankings.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
