"use client";

import Link from "next/link";
import { Layers } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-primary text-slate-400 border-t border-slate-800">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Tagline Column */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2 group w-fit">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-white shadow-md shadow-accent/20">
                <Layers className="h-5 w-5" />
              </div>
              <span className="font-poppins text-xl font-bold tracking-tight text-white">
                Edu<span className="text-accent">Flow</span>
              </span>
            </Link>
            <p className="font-inter text-sm text-slate-400 max-w-sm">
              The complete coaching center management platform for Bangladesh. 
              Built to streamline academic tutoring and high-performance admission preparation.
            </p>
          </div>

          {/* Quick Links Column */}
          <div>
            <h4 className="font-poppins text-xs font-semibold text-slate-200 uppercase tracking-wider mb-4">
              Navigation
            </h4>
            <ul className="space-y-2.5">
              <li>
                <a href="#features" className="font-inter text-sm hover:text-white transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#who-its-for" className="font-inter text-sm hover:text-white transition-colors">
                  Who It's For
                </a>
              </li>
              <li>
                <Link href="/login" className="font-inter text-sm hover:text-white transition-colors">
                  Login Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal / Info Column */}
          <div>
            <h4 className="font-poppins text-xs font-semibold text-slate-200 uppercase tracking-wider mb-4">
              Info
            </h4>
            <p className="font-inter text-sm leading-relaxed">
              Designed & developed for coaching centers in Bangladesh. 
              Simplifying education administration, grading, and routine scheduling.
            </p>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="mt-12 pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p className="font-inter text-slate-500">
            &copy; {currentYear} EduFlow. All rights reserved.
          </p>
          <p className="font-inter text-slate-500 flex items-center gap-1">
            Built for coaching centers in Bangladesh 🇧🇩
          </p>
        </div>
      </div>
    </footer>
  );
}
