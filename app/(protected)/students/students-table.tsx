'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export interface StudentSummary {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  createdAt: string;
  enrolledBatchesCount: number;
  recentAttendance: {
    status: 'PRESENT' | 'ABSENT' | 'LATE';
    date: string;
    batchName: string;
  } | null;
}

interface StudentsTableProps {
  initialStudents: StudentSummary[];
  errorMsg: string | null;
  isAdmin: boolean;
}

export default function StudentsTable({
  initialStudents,
  errorMsg,
  isAdmin,
}: StudentsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStudents = initialStudents.filter((student) =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-y-4 md:flex-row md:items-center md:justify-between border-b border-gray-200 pb-5">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Students</h1>
            <p className="mt-2 text-sm text-gray-500">View and manage coaching center students and attendance status</p>
          </div>
          {isAdmin && (
            <Link
              href="/students/new"
              className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition self-start md:self-auto"
            >
              Add Student
            </Link>
          )}
        </div>

        {errorMsg && (
          <div className="rounded-lg bg-red-50 p-4 border border-red-200">
            <p className="text-sm text-red-600">
              <span className="font-semibold text-red-800">Error:</span> {errorMsg}
            </p>
          </div>
        )}

        {/* Search Input */}
        <div className="flex items-center max-w-md bg-white rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus-within:ring-1 focus-within:ring-accent focus-within:border-accent">
          <svg
            className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search students by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-sm text-gray-900 placeholder-gray-400 outline-none border-none p-0 bg-transparent focus:ring-0 focus:border-transparent"
          />
        </div>

        {/* Students Table Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {filteredStudents.length === 0 ? (
            <div className="p-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <h3 className="mt-4 text-sm font-semibold text-gray-900">No students found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery ? 'Try adjusting your search criteria.' : 'Create a student record to get started.'}
              </p>
              {isAdmin && !searchQuery && (
                <div className="mt-6">
                  <Link
                    href="/students/new"
                    className="inline-flex items-center rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                  >
                    Add Student
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                    >
                      Name
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                    >
                      Email
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                    >
                      Phone
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                    >
                      Enrolled Batches
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                    >
                      Recent Attendance
                    </th>
                    <th scope="col" className="relative px-6 py-3.5">
                      <span className="sr-only">Details</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/students/${student.id}`}
                          className="text-sm font-semibold text-accent hover:underline"
                        >
                          {student.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.phone || <span className="text-gray-400 italic">N/A</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-semibold">{student.enrolledBatchesCount}</span> batches
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {student.recentAttendance ? (
                          <div className="flex flex-col gap-y-0.5">
                            <span
                              className={`inline-flex items-center gap-x-1.5 rounded-full px-2 py-1 text-xs font-semibold ring-1 ring-inset ${
                                student.recentAttendance.status === 'PRESENT'
                                  ? 'bg-green-50 text-green-700 ring-green-600/20'
                                  : student.recentAttendance.status === 'ABSENT'
                                  ? 'bg-red-50 text-red-700 ring-red-600/20'
                                  : 'bg-amber-50 text-amber-700 ring-amber-600/20'
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  student.recentAttendance.status === 'PRESENT'
                                    ? 'bg-green-600'
                                    : student.recentAttendance.status === 'ABSENT'
                                    ? 'bg-red-600'
                                    : 'bg-amber-600'
                                }`}
                              />
                              {student.recentAttendance.status.charAt(0) +
                                student.recentAttendance.status.slice(1).toLowerCase()}
                            </span>
                            <span className="text-[10px] text-gray-400 font-medium ml-1.5">
                              {student.recentAttendance.batchName} ({new Date(student.recentAttendance.date).toLocaleDateString()})
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-x-1.5 rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                            <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                            No record
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link href={`/students/${student.id}`} className="text-accent hover:text-indigo-900">
                          View profile
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
