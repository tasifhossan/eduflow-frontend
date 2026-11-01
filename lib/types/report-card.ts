export interface ReportPeriod {
  id: string;
  batchId: string;
  batchName?: string;
  label: string;
  from: string;
  to: string;
  publishedAt: string | null;
  createdAt?: string;
}

export interface AttendanceReportSummary {
  present: number;
  absent: number;
  late: number;
  total: number;
  percent: string;
}

export interface ExamReportItem {
  testId: string;
  title: string;
  date: string;
  marks: string | null;
  maxMarks: string;
  percent: string | null;
  rank: number | null;
  pending: boolean;
}

export interface ExamReportSummary {
  tests: ExamReportItem[];
  totalMarksObtained: string;
  totalMaxMarks: string;
  overallPercent: string;
  grade: string | null;
  hasPendingWritten: boolean;
}

export interface AssignmentReportSummary {
  marks: string;
  maxMarks: string;
  percent: string;
  gradedCount: number;
}

export interface SyllabusReportSummary {
  coveredChapters: number;
  totalChapters: number;
  percent: string;
}

export interface StudentFullReportCard {
  period: {
    id: string;
    batchId: string;
    batchName: string;
    label: string;
    from: string;
    to: string;
    publishedAt: string | null;
  };
  student: {
    id: string;
    name: string;
    studentCode: string | null;
    avatarUrl: string | null;
    phone: string | null;
  };
  center: {
    name: string;
    logoUrl: string | null;
    receiptHeader: string | null;
    receiptFooter: string | null;
    branchName?: string;
  };
  attendance: AttendanceReportSummary;
  exams: ExamReportSummary;
  assignments: AssignmentReportSummary;
  syllabus: SyllabusReportSummary;
  remark: {
    text: string;
    updatedAt: string;
  } | null;
}

export interface StudentRosterCardSummary {
  student: {
    id: string;
    name: string;
    studentCode: string | null;
    avatarUrl: string | null;
  };
  attendance: AttendanceReportSummary;
  exam: {
    overallPercent: string;
    grade: string | null;
    hasPendingWritten: boolean;
  };
  remark: {
    text: string;
    updatedAt: string;
  } | null;
}

export interface PendingWrittenTest {
  id: string;
  title: string;
  pendingCount: number;
}

export interface ReportCardsRosterResponse {
  period: ReportPeriod;
  cards: StudentRosterCardSummary[];
  pendingTests: PendingWrittenTest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
