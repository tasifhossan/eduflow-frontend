"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Layers } from "lucide-react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo/Wordmark */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-white shadow-md shadow-accent/20 transition-transform group-hover:scale-105">
            <Layers className="h-5 w-5" />
          </div>
          <span className="font-poppins text-xl font-bold tracking-tight text-primary">
            Edu<span className="text-accent">Flow</span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          <a
            href="#features"
            className="text-sm font-medium text-text-body hover:text-primary transition-colors"
          >
            Features
          </a>
          <a
            href="#who-its-for"
            className="text-sm font-medium text-text-body hover:text-primary transition-colors"
          >
            Who It's For
          </a>
        </nav>

        {/* Login Button (Desktop) */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-accent px-5 text-sm font-medium text-white shadow-md shadow-accent/15 transition-all hover:bg-accent/90 hover:shadow-accent/25 hover:-translate-y-[1px] active:translate-y-0"
          >
            Login
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-primary hover:bg-slate-50 md:hidden transition-colors"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Navigation Dropdown */}
      {isOpen && (
        <div className="md:hidden border-b border-slate-200 bg-background px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-150">
          <a
            href="#features"
            onClick={() => setIsOpen(false)}
            className="block rounded-lg px-3 py-2 text-base font-medium text-text-body hover:bg-slate-50 hover:text-primary transition-colors"
          >
            Features
          </a>
          <a
            href="#who-its-for"
            onClick={() => setIsOpen(false)}
            className="block rounded-lg px-3 py-2 text-base font-medium text-text-body hover:bg-slate-50 hover:text-primary transition-colors"
          >
            Who It's For
          </a>
          <div className="pt-2">
            <Link
              href="/login"
              onClick={() => setIsOpen(false)}
              className="flex h-11 items-center justify-center rounded-lg bg-accent text-base font-medium text-white shadow-md shadow-accent/15 hover:bg-accent/90 transition-colors"
            >
              Login
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
