"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle, GraduationCap, Users, Calendar, Award } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-background py-20 lg:py-28">
      {/* Subtle background glow effect */}
      <div className="absolute top-0 left-1/2 -z-10 h-[600px] w-[1000px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_top,var(--color-accent),transparent_50%)] opacity-[0.08]" />
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          {/* Left Column: Heading and CTAs */}
          <div className="flex flex-col space-y-6 lg:col-span-7">
            {/* Tagline */}
            <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent ring-1 ring-inset ring-accent/20">
              <span className="flex h-1.5 w-1.5 rounded-full bg-accent" />
              Coaching Management Reimagined
            </div>

            <h1 className="font-poppins text-4xl font-bold tracking-tight text-primary sm:text-5xl lg:text-6xl leading-[1.1]">
              Run Your Coaching Center{" "}
              <span className="relative inline-block text-accent">
                Without the Chaos
                <span className="absolute -bottom-2 left-0 h-1 w-full bg-highlight rounded-full" />
              </span>
            </h1>

            <p className="font-inter text-lg text-text-body leading-relaxed max-w-2xl">
              Manage batches, track attendance, host MCQ tests with automatic merit lists, 
              schedule routines, and monitor fee collections. Designed specifically for Bangladeshi 
              academic tutoring and admission prep coaching centers (Medical, Engineering, Varsity).
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                href="/login"
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-accent px-6 text-base font-semibold text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent/90 hover:shadow-accent/35 hover:-translate-y-[2px] active:translate-y-0"
              >
                Get Started
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="#features"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-slate-200 bg-white px-6 text-base font-semibold text-primary shadow-sm hover:bg-slate-50 hover:text-accent transition-all hover:-translate-y-[2px] active:translate-y-0"
              >
                Explore Features
              </a>
            </div>

            {/* Quick Badges */}
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-200/80 sm:grid-cols-3">
              <div className="flex items-center gap-2 text-sm text-text-body">
                <CheckCircle className="h-5 w-5 text-success shrink-0" />
                <span>Academic Coaching</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-text-body">
                <CheckCircle className="h-5 w-5 text-success shrink-0" />
                <span>Admission Prep</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-text-body col-span-2 sm:col-span-1">
                <CheckCircle className="h-5 w-5 text-success shrink-0" />
                <span>Auto Merit List</span>
              </div>
            </div>
          </div>

          {/* Right Column: Abstract Interactive UI Demo */}
          <div className="relative lg:col-span-5 flex justify-center">
            {/* Soft decorative background box */}
            <div className="absolute -inset-4 rounded-2xl bg-slate-100/50 p-4 ring-1 ring-inset ring-slate-900/10 [mask-image:radial-gradient(closest-side,white,transparent)] lg:-inset-8" />
            
            <div className="relative w-full max-w-[420px] space-y-4">
              {/* Card 1: Batch Status (Interactive look) */}
              <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xl shadow-slate-100 transition-all hover:shadow-2xl hover:shadow-slate-200">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-lg bg-accent/10 p-2 text-accent">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-poppins text-sm font-semibold text-primary">HSC 2026 Batch A</h4>
                      <p className="text-[11px] text-text-body">Physics • Sunday & Tuesday</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                    Active
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-text-body">Attendance (Today):</span>
                  <span className="font-semibold text-primary">48 / 52 Present</span>
                </div>
                <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-success h-1.5 rounded-full w-[92%]" />
                </div>
              </div>

              {/* Card 2: MCQ Exam Auto Ranking */}
              <div className="relative left-4 sm:left-8 rounded-xl border border-slate-200/80 bg-white p-4 shadow-xl shadow-slate-100 transition-all hover:shadow-2xl hover:shadow-slate-200">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-highlight/10 p-2 text-highlight">
                      <Award className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-poppins text-sm font-semibold text-primary">Medical Daily Test</h4>
                      <p className="text-[11px] text-text-body">Biology MCQ • 100 Marks</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-highlight/15 px-2 py-0.5 text-[10px] font-semibold text-highlight">
                    Ranked
                  </span>
                </div>
                
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs px-2 py-1 rounded bg-slate-50 border border-slate-100">
                    <span className="font-semibold text-primary">1. Taskin Ahmed</span>
                    <span className="text-highlight font-bold">98/100</span>
                  </div>
                  <div className="flex items-center justify-between text-xs px-2 py-1 rounded bg-slate-50 border border-slate-100">
                    <span className="font-semibold text-primary">2. Rafia Islam</span>
                    <span className="text-highlight font-bold">95/100</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Routine Tracker */}
              <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xl shadow-slate-100 transition-all hover:shadow-2xl hover:shadow-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-poppins text-sm font-semibold text-primary">Upcoming Routine</h4>
                    <p className="text-xs text-text-body">Next Class: 04:30 PM</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
