'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { apiPost } from '@/lib/api';

export default function NewStudentPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMsg(null);
    setValidationErrors({});
    setIsSubmitting(true);

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long');
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || null,
        guardianName: guardianName.trim() || null,
        guardianPhone: guardianPhone.trim() || null,
      };

      const response = await apiPost('/api/students', payload);

      if (response && response.success) {
        // Redirection with hard reload to refresh Vercel server components cache
        window.location.href = '/students';
      } else {
        setErrorMsg(response.message || 'Failed to create student account');
      }
    } catch (err: any) {
      // Handle Zod validation errors returned by backend (if any)
      if (err.message && err.message.includes('Validation failed')) {
        setErrorMsg('Validation failed. Please verify your inputs.');
      } else {
        setErrorMsg(err.message || 'An error occurred during submission');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Breadcrumbs */}
        <nav className="flex text-sm text-gray-500 gap-x-2">
          <Link href="/students" className="hover:text-accent font-medium">Students</Link>
          <span>/</span>
          <span className="text-gray-900 font-semibold">New Student</span>
        </nav>

        {/* Header */}
        <div className="border-b border-gray-200 pb-5">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Add New Student</h1>
          <p className="mt-2 text-sm text-gray-500">Create a student user account under your branch</p>
        </div>

        {errorMsg && (
          <div className="rounded-lg bg-red-50 p-4 border border-red-200">
            <p className="text-sm text-red-600">
              <span className="font-semibold text-red-800">Error:</span> {errorMsg}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Student Name */}
            <div className="sm:col-span-2">
              <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Tanvir Rahman"
                className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm focus:border-accent focus:ring-1 focus:ring-accent sm:text-sm"
                required
              />
            </div>

            {/* Email Address */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. tanvir@example.com"
                className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm focus:border-accent focus:ring-1 focus:ring-accent sm:text-sm"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm focus:border-accent focus:ring-1 focus:ring-accent sm:text-sm"
                required
              />
            </div>

            {/* Phone Number */}
            <div className="sm:col-span-2">
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-900 mb-2">
                Phone Number (Optional)
              </label>
              <input
                type="text"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 01712345678"
                className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm focus:border-accent focus:ring-1 focus:ring-accent sm:text-sm"
              />
            </div>

            {/* Guardian Name */}
            <div>
              <label htmlFor="guardianName" className="block text-sm font-semibold text-gray-900 mb-2">
                Guardian Name (Optional)
              </label>
              <input
                type="text"
                id="guardianName"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                placeholder="e.g. Rafiqul Islam"
                className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm focus:border-accent focus:ring-1 focus:ring-accent sm:text-sm"
              />
            </div>

            {/* Guardian Phone */}
            <div>
              <label htmlFor="guardianPhone" className="block text-sm font-semibold text-gray-900 mb-2">
                Guardian Phone (Optional)
              </label>
              <input
                type="text"
                id="guardianPhone"
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                placeholder="e.g. 01812345678"
                className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm focus:border-accent focus:ring-1 focus:ring-accent sm:text-sm"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-x-4 border-t border-gray-100 pt-6">
            <Link
              href="/students"
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition"
            >
              {isSubmitting ? 'Creating...' : 'Create Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
