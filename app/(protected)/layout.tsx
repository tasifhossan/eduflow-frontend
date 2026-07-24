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
      name: 'Attendance',
      href: '/attendance',
      roles: ['ADMIN', 'TEACHER', 'STUDENT'],
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
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
        <div className="p-4 mx-4 my-4 bg-slate-800/40 rounded-xl border border-slate-700/30 flex items-center gap-x-3">
          <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-semibold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold truncate text-slate-100">{user.name}</h4>
            <div className="flex items-center gap-x-1.5 mt-0.5">
              <span className="inline-flex items-center rounded-md bg-accent/15 px-1.5 py-0.5 text-xs font-medium text-indigo-400 ring-1 ring-inset ring-accent/30 uppercase tracking-wider">
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
