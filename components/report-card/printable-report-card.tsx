'use client';

import React from 'react';
import { StudentFullReportCard } from '@/lib/types/report-card';
import { Award, Calendar, BookOpen, CheckCircle2, Clock } from 'lucide-react';

interface PrintableReportCardProps {
  card: StudentFullReportCard;
  pageBreakAfter?: boolean;
}

export function PrintableReportCard({ card, pageBreakAfter = false }: PrintableReportCardProps) {
  const { period, student, center, attendance, exams, assignments, syllabus, remark } = card;

  return (
    <div
      className={`report-card-container bg-surface text-foreground border border-border rounded-card p-8 shadow-sm print:shadow-none print:border-none print:p-0 print:m-0 print:w-full print:bg-white print:text-black ${
        pageBreakAfter ? 'break-after-page' : ''
      }`}
      style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
    >
      {/* Center Header */}
      <div className="text-center pb-6 border-b border-border print:border-neutral-300">
        {center.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={center.logoUrl}
            alt={center.name}
            className="h-16 w-auto mx-auto mb-2 object-contain print:h-14"
          />
        )}
        <h1 className="text-2xl font-bold tracking-tight print:text-xl">{center.name}</h1>
        {center.branchName && (
          <p className="text-sm font-medium text-muted-foreground print:text-neutral-700">
            {center.branchName} Branch
          </p>
        )}
        {center.receiptHeader && (
          <p className="text-xs text-muted-foreground mt-1 max-w-lg mx-auto print:text-neutral-600">
            {center.receiptHeader}
          </p>
        )}
        <div className="mt-3 inline-block px-4 py-1 rounded-pill bg-primary-subtle text-primary text-xs font-bold uppercase tracking-wider print:border print:border-neutral-400 print:bg-transparent print:text-black">
          Official Student Report Card
        </div>
      </div>

      {/* Student & Batch Information */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-b border-border print:border-neutral-300 text-sm">
        <div>
          <span className="text-xs text-muted-foreground block print:text-neutral-600">Student Name</span>
          <span className="font-semibold">{student.name}</span>
        </div>
        <div>
          <span className="text-xs text-muted-foreground block print:text-neutral-600">Student ID / Code</span>
          <span className="font-mono font-medium">{student.studentCode || '—'}</span>
        </div>
        <div>
          <span className="text-xs text-muted-foreground block print:text-neutral-600">Batch</span>
          <span className="font-semibold">{period.batchName}</span>
        </div>
        <div>
          <span className="text-xs text-muted-foreground block print:text-neutral-600">Report Period</span>
          <span className="font-semibold">{period.label}</span>
          <span className="text-xs text-muted-foreground block print:text-neutral-600">
            {period.from} to {period.to}
          </span>
        </div>
      </div>

      {/* 4 Summary Performance Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-6">
        {/* Attendance */}
        <div className="p-4 rounded-control border border-border bg-background print:border-neutral-300 print:bg-transparent">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1 print:text-neutral-700">
            <Calendar className="h-3.5 w-3.5" />
            Attendance
          </div>
          <div className="text-xl font-bold">{attendance.percent}%</div>
          <div className="text-xs text-muted-foreground mt-1 print:text-neutral-600">
            {attendance.present}P · {attendance.late}L · {attendance.absent}A / {attendance.total} days
          </div>
        </div>

        {/* Overall Exam Score */}
        <div className="p-4 rounded-control border border-border bg-background print:border-neutral-300 print:bg-transparent">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1 print:text-neutral-700">
            <Award className="h-3.5 w-3.5" />
            Exams Score
          </div>
          <div className="text-xl font-bold">{exams.overallPercent}%</div>
          <div className="text-xs text-muted-foreground mt-1 print:text-neutral-600">
            {exams.totalMarksObtained} / {exams.totalMaxMarks} marks
          </div>
        </div>

        {/* Overall Grade */}
        <div className="p-4 rounded-control border border-border bg-background print:border-neutral-300 print:bg-transparent">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1 print:text-neutral-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Overall Grade
          </div>
          <div className="text-xl font-bold text-primary print:text-black">
            {exams.grade || '—'}
          </div>
          <div className="text-xs text-muted-foreground mt-1 print:text-neutral-600">
            {exams.hasPendingWritten ? 'Written test pending' : 'Final computed grade'}
          </div>
        </div>

        {/* Syllabus Progress */}
        <div className="p-4 rounded-control border border-border bg-background print:border-neutral-300 print:bg-transparent">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1 print:text-neutral-700">
            <BookOpen className="h-3.5 w-3.5" />
            Syllabus Covered
          </div>
          <div className="text-xl font-bold">{syllabus.percent}%</div>
          <div className="text-xs text-muted-foreground mt-1 print:text-neutral-600">
            {syllabus.coveredChapters} of {syllabus.totalChapters} chapters
          </div>
        </div>
      </div>

      {/* Examinations Breakdown Table */}
      <div className="mb-6">
        <h3 className="text-sm font-bold uppercase tracking-wider mb-2 text-muted-foreground print:text-neutral-800">
          Examinations Performance
        </h3>
        {exams.tests.length === 0 ? (
          <div className="text-sm text-muted-foreground italic py-3 border border-dashed border-border rounded-control text-center print:border-neutral-300">
            No closed tests during this report period.
          </div>
        ) : (
          <div className="overflow-x-auto border border-border rounded-control print:border-neutral-300">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted text-xs uppercase font-semibold border-b border-border print:bg-neutral-100 print:border-neutral-300">
                <tr>
                  <th className="px-4 py-2.5">Exam Title</th>
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5 text-right">Max Marks</th>
                  <th className="px-3 py-2.5 text-right">Obtained</th>
                  <th className="px-3 py-2.5 text-right">Percentage</th>
                  <th className="px-3 py-2.5 text-center">Batch Rank</th>
                  <th className="px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border print:divide-neutral-200">
                {exams.tests.map((test) => (
                  <tr key={test.testId} className="hover:bg-surface-hover print:hover:bg-transparent">
                    <td className="px-4 py-2 font-medium">{test.title}</td>
                    <td className="px-3 py-2 text-muted-foreground print:text-neutral-700 text-xs">
                      {test.date}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{test.maxMarks}</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold">
                      {test.pending ? '—' : test.marks ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {test.pending ? '—' : test.percent ? `${test.percent}%` : '—'}
                    </td>
                    <td className="px-3 py-2 text-center font-bold">
                      {test.pending ? '—' : test.rank !== null ? `#${test.rank}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {test.pending ? (
                        <span className="inline-flex items-center gap-1 text-warning font-medium print:text-black">
                          <Clock className="h-3 w-3" /> Pending Grading
                        </span>
                      ) : (
                        <span className="text-success font-medium print:text-black">Graded</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assignments Summary */}
      <div className="mb-6 p-4 rounded-control border border-border bg-background print:border-neutral-300 print:bg-transparent flex flex-wrap items-center justify-between gap-4 text-sm">
        <div>
          <span className="font-semibold block">Academic Assignments</span>
          <span className="text-xs text-muted-foreground print:text-neutral-600">
            {assignments.gradedCount} graded assignment{assignments.gradedCount === 1 ? '' : 's'} in this period
          </span>
        </div>
        <div className="text-right">
          <div className="text-base font-bold font-mono">
            {assignments.marks} / {assignments.maxMarks} ({assignments.percent}%)
          </div>
        </div>
      </div>

      {/* Teacher Remark Section */}
      <div className="mb-8 p-4 rounded-control border border-border bg-background print:border-neutral-300 print:bg-transparent">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 print:text-neutral-700">
          Teacher Remarks & Evaluation
        </h4>
        <p className="text-sm italic leading-relaxed">
          &ldquo;{remark?.text || 'Consistent effort and steady participation observed throughout this term.'}&rdquo;
        </p>
      </div>

      {/* Signatures & Footer Note */}
      <div className="pt-8 border-t border-border print:border-neutral-300 mt-auto">
        <div className="grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <div className="border-b border-border print:border-neutral-400 w-48 mx-auto mb-2"></div>
            <span className="font-semibold block">Class Teacher Signature</span>
            <span className="text-muted-foreground print:text-neutral-600">EduFlow Academic Staff</span>
          </div>
          <div>
            <div className="border-b border-border print:border-neutral-400 w-48 mx-auto mb-2"></div>
            <span className="font-semibold block">Principal / Center Head</span>
            <span className="text-muted-foreground print:text-neutral-600">{center.name}</span>
          </div>
        </div>

        {center.receiptFooter && (
          <p className="text-[11px] text-center text-muted-foreground mt-6 print:text-neutral-500">
            {center.receiptFooter}
          </p>
        )}
      </div>
    </div>
  );
}
