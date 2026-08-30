import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import LogoutButton from '@/components/logout-button';

interface SidebarLink {
  name: string;
  href: string;
  roles: string[];
  icon: React.ReactNode;
}

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // If user is not authenticated, redirect to login page
  if (!user) {
    redirect('/login');
  }

  const links: SidebarLink[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      roles: ['ADMIN', 'TEACHER', 'STUDENT', 'GUARDIAN'],
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
        </svg>
      ),
    },
    {
      name: 'Notices',
      href: '/notices',
      roles: ['ADMIN', 'TEACHER', 'STUDENT', 'GUARDIAN'],
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
    },
    {
      name: 'Batches',
      href: '/batches',
      roles: ['ADMIN', 'TEACHER'],
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      name: 'Tests',
      href: '/tests',
      roles: ['ADMIN', 'TEACHER', 'STUDENT'],
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      name: 'Students',
      href: '/students',
      roles: ['ADMIN', 'TEACHER'],
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      name: 'Subjects',
      href: '/subjects',
      roles: ['ADMIN'],
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },

    {
      name: 'Attendance',
      href: '/attendance',
      roles: ['ADMIN', 'TEACHER', 'STUDENT'],
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      name: 'My Batches',
      href: '/my-batches',
      roles: ['STUDENT'],
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      name: 'Guardians',
      href: '/guardians',
      roles: ['ADMIN'],
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      name: 'My Children',
      href: '/my-children',
      roles: ['GUARDIAN'],
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      name: 'My Payments',
      href: '/payments',
      roles: ['STUDENT'],
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];


  const visibleLinks = links.filter((link) => link.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-primary text-white flex flex-col flex-shrink-0">
        {/* Brand */}
        <div className="h-16 flex items-center px-6 border-b border-slate-700/50">
          <Link href="/dashboard" className="flex items-center gap-x-2">
            <span className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center font-bold text-white text-lg">
              E
            </span>
            <span className="font-poppins text-xl font-bold tracking-wide">
              EduFlow
            </span>
          </Link>
        </div>

        {/* User profile brief */}
        <div className="p-4 mx-4 my-4 bg-slate-800/70 rounded-xl border border-slate-700/60 flex items-center gap-x-3">
          <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center text-white font-bold text-base flex-shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold truncate text-white leading-tight">
              {user.name}
            </p>
            <div className="flex items-center gap-x-1.5 mt-1">
              <span className="inline-flex items-center rounded-md bg-accent/30 px-2 py-0.5 text-[11px] font-bold text-white ring-1 ring-inset ring-accent/60 uppercase tracking-wider">
                {user.role}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {visibleLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="flex items-center gap-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors"
            >
              {link.icon}
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700/50 text-xs text-slate-400 text-center">
          EduFlow Management v1.0
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 z-10">
          <div>
            <span className="text-xs font-semibold text-accent uppercase tracking-wider">
              Coaching Center Platform
            </span>
            <h2 className="text-sm font-medium text-gray-500">
              Branch ID: <span className="font-mono text-gray-700">{user.branchId}</span>
            </h2>
          </div>

          <div className="flex items-center gap-x-4">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500 truncate max-w-[150px]">{user.email}</p>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <LogoutButton />
          </div>
        </header>

        {/* Main Content Pane */}
        <main className="flex-1 overflow-y-auto bg-gray-50 focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
