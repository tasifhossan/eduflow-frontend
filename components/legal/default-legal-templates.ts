import { CenterPublicData } from '@/lib/types/center';

export function getDefaultPrivacyPolicy(center: CenterPublicData): string {
  const centerName = center.name || 'Our Coaching Center';
  const email = center.contactEmail || 'contact@example.com';
  const phone = center.contactPhone || 'Contact Office';
  const address = center.address || 'Center Main Campus';

  return `## 1. Data Controller
This Privacy Policy explains how **${centerName}** ("we", "our", or "the Center") collects, uses, and safeguards personal information of enrolled students, applicants, and their guardians.

**Center Contact Information:**
- **Address:** ${address}
- **Email:** ${email}
- **Phone:** ${phone}

## 2. Information We Collect
We only collect personal information necessary for educational enrollment, academic progress monitoring, and center communications:
- **Student Profile:** Full legal name, date of birth, gender, educational institution, photograph, and academic grade.
- **Guardian Details:** Primary and secondary guardian names, mobile telephone numbers, email addresses, and relationship to student.
- **Academic Records:** Daily attendance logs, lecture progress, assignment submissions, class test scores, exam ranks, and mentor feedback.
- **Administrative Records:** Batch enrollment details, fee invoices, payment receipts, and enrollment status.

## 3. Purpose of Data Processing
We process personal data strictly to:
- Conduct classroom lectures, examinations, and batch scheduling.
- Notify guardians via SMS and email regarding daily attendance, exam performance, and emergency notices.
- Maintain accurate enrollment rosters and issue verified academic certificates.
- Comply with local regulatory and educational audit obligations.

## 4. Access and Confidentiality
Student and guardian data is strictly confidential. Only authorized center staff, administrative officers, and assigned batch instructors have access to academic records relevant to their instructional duties. We do not sell, rent, or trade student records to third-party commercial marketing entities.

## 5. Data Retention and Security
Academic records and attendance data are retained for the duration of the student's enrollment plus any audit retention periods required by institutional standards. Digital records are protected using encryption, role-based access controls, and audited authentication logs.

## 6. Guardian and Student Rights
Guardians and enrolled students have the right to:
- Request a copy of their academic attendance and exam score history.
- Request correction of inaccurate personal contact details.
- Inquire about data retention policies or raise concerns directly with center administration at ${email}.
`;
}

export function getDefaultTermsOfService(center: CenterPublicData): string {
  const centerName = center.name || 'Our Coaching Center';
  const email = center.contactEmail || 'contact@example.com';
  const phone = center.contactPhone || 'Contact Office';
  const address = center.address || 'Center Main Campus';

  return `## 1. Acceptance of Terms
By enrolling in academic programs or using the student and guardian portal at **${centerName}** ("the Center"), students and guardians agree to be bound by these Terms of Service.

**Center Details:**
- **Institution:** ${centerName}
- **Main Campus:** ${address}
- **Official Contact:** ${email} | ${phone}

## 2. Admission and Batch Allocation
- Admission to specific batches, class timings, and academic tracks is subject to seat availability, prerequisite verification, and center discretion.
- Seat reservations are finalized only upon completion of formal registration and administrative verification.
- The Center reserves the right to adjust batch capacities, assign instructors, and balance batch rosters to maintain optimal educational standards.

## 3. Fee Schedules and Payment Policies
- Tuition fees, course material dues, and examination fees must be settled according to the payment schedule agreed upon at enrollment.
- Fee structures and installment dates are communicated through official invoices issued by center administration.
- Refunds, fee transfers between batches, or fee adjustments are handled strictly in accordance with center administrative policies upon written request to center administration.

## 4. Attendance and Academic Conduct
- Students are required to attend scheduled classes promptly and maintain minimum attendance thresholds for course completion certificates.
- Unexcused absences, persistent tardiness, or academic misconduct (such as cheating during center tests) may result in disciplinary review.
- Daily attendance logs are recorded and accessible to guardians through the guardian portal.

## 5. Schedule Adjustments and Force Majeure
- The Center reserves the right to reschedule lectures, conduct online supplementary sessions, or adjust exam routines due to unforeseen circumstances, public holidays, or weather emergencies.
- Students and guardians will be notified in advance through portal notices, SMS, or email.

## 6. Code of Conduct and Property Care
- Students and visitors must treat teachers, staff members, and fellow students with mutual dignity and respect.
- Center property, laboratory materials, and classroom equipment must be used responsibly. Willful damage will result in financial liability and potential suspension.

## 7. Governing Policy and Inquiries
For questions regarding these terms, enrollment conditions, or academic guidelines, please contact center administration at ${email} or visit the center administrative office during working hours.
`;
}
