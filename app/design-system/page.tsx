'use client';

import * as React from 'react';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { toast } from 'sonner';
import { formatMoney } from '@/lib/format';

// Design System Component Imports
import { Container } from '@/components/ui/container';
import { Section } from '@/components/ui/section';
import { PageHeader } from '@/components/ui/page-header';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { FormField } from '@/components/ui/form-field';
import { useZodForm, FormStatus } from '@/components/ui/form-helpers';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { BatchCard, BatchCardSkeleton, BatchCardGrid, BatchCardData } from '@/components/ui/batch-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Rating } from '@/components/ui/rating';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip } from '@/components/ui/tooltip';
import { Modal } from '@/components/ui/modal';
import { DropdownMenu } from '@/components/ui/dropdown-menu';
import { Tabs } from '@/components/ui/tabs';
import { Accordion } from '@/components/ui/accordion';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { DataTable, Column } from '@/components/ui/data-table';
import {
  HighlightStat,
  IconFeatureCard,
  BranchCard,
  TeacherCard,
  TestimonialCard,
  BlogCard,
} from '@/components/cards';
import {
  PageHeader as DashboardPageHeader,
  StatCard,
  SectionCard,
  StatusBadge,
} from '@/components/dashboard';

import {
  Search,
  BookOpen,
  Calendar,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Layers,
  GraduationCap,
} from 'lucide-react';

const demoBatch1: BatchCardData = {
  id: 'batch-demo-1',
  name: 'HSC 2026 Higher Mathematics Complete Mastery Batch',
  description:
    'Complete calculus, coordinate geometry, and trigonometry with weekly creative question mock exams and doubt-clearing sessions.',
  type: 'ACADEMIC',
  classLevel: 'HSC 2nd Year',
  feeType: 'MONTHLY',
  feeAmount: 3200,
  imageUrl: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&w=600&q=80',
  ratingAverage: 4.9,
  ratingCount: 38,
  branchName: 'Dhanmondi Branch',
  schedule: 'Sun, Tue, Thu · 4:30 PM',
  subjectName: 'Higher Mathematics',
};

const demoBatch2: BatchCardData = {
  id: 'batch-demo-2',
  name: 'Medical & Dental Admission Biology Intensive',
  description:
    'In-depth botany and zoology NCERT-aligned drills with past 15-year question paper analysis.',
  type: 'ADMISSION',
  classLevel: 'Admission',
  feeType: 'ONE_TIME',
  feeAmount: 18500,
  imageUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80',
  ratingAverage: 4.8,
  ratingCount: 52,
  branchName: 'Farmgate Branch',
  schedule: 'Sat, Mon, Wed · 10:00 AM',
  subjectName: 'Biology',
};

const demoBatch3: BatchCardData = {
  id: 'batch-demo-3',
  name: 'SSC Physics Foundation',
  description: 'Mechanics, wave dynamics, and electricity foundations for class 10 students.',
  type: 'ACADEMIC',
  classLevel: 'Class 10',
  feeType: 'MONTHLY',
  feeAmount: 2200,
  imageUrl: null, // Test graceful image fallback
  ratingAverage: 4.7,
  ratingCount: 19,
  branchName: 'Uttara Branch',
  schedule: 'Fri, Sat · 3:00 PM',
  subjectName: 'Physics',
};

const demoBatch4: BatchCardData = {
  id: 'batch-demo-4',
  name: 'BUET Engineering Admission Physics & Chemistry Advance Problem Solving',
  description:
    'Advanced mathematical derivations and problem sets targeting top engineering university admission exams.',
  type: 'ADMISSION',
  classLevel: 'Admission',
  feeType: 'ONE_TIME',
  feeAmount: 22000,
  imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80',
  ratingAverage: 5.0,
  ratingCount: 64,
  branchName: 'Panthapath Branch',
  schedule: 'Daily · 8:30 AM',
  subjectName: 'Physics & Chemistry',
};

// Form schema for validation demo
const demoFormSchema = z.object({
  fullName: z.string().min(3, 'Name must be at least 3 characters'),
  studentEmail: z.string().email('Please enter a valid email address'),
  branch: z.string().min(1, 'Please select a branch'),
  acceptedTerms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the enrollment terms',
  }),
});

type DemoFormData = z.infer<typeof demoFormSchema>;

interface StudentTableRow extends Record<string, unknown> {
  id: string;
  name: string;
  roll: string;
  batch: string;
  attendance: string;
  status: 'ACTIVE' | 'PENDING' | 'OVERDUE';
}

const demoTableData: StudentTableRow[] = [
  { id: '1', name: 'Tasif Hossain', roll: 'DH-1042', batch: 'HSC 2026 Math Intensive', attendance: '96%', status: 'ACTIVE' },
  { id: '2', name: 'Nusrat Jahan', roll: 'DH-1043', batch: 'Medical Biology Drills', attendance: '92%', status: 'ACTIVE' },
  { id: '3', name: 'Imran Khan', roll: 'DH-1044', batch: 'BUET Engineering Advance', attendance: '88%', status: 'PENDING' },
  { id: '4', name: 'Afsana Mimi', roll: 'DH-1045', batch: 'SSC Physics Foundation', attendance: '74%', status: 'OVERDUE' },
  { id: '5', name: 'Tanvir Ahmed', roll: 'DH-1046', batch: 'HSC 2026 Math Intensive', attendance: '95%', status: 'ACTIVE' },
];

export default function DesignSystemShowcasePage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  // Interactive component states
  const [ratingVal, setRatingVal] = React.useState(4);
  const [currentPage, setCurrentPage] = React.useState(2);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [tableLoading, setTableLoading] = React.useState(false);
  const [tableEmpty, setTableEmpty] = React.useState(false);
  const [tableSortKey, setTableSortKey] = React.useState<string>('name');
  const [tableSortDir, setTableSortDir] = React.useState<'asc' | 'desc'>('asc');
  const [formSubmitting, setFormSubmitting] = React.useState(false);
  const [formStatus, setFormStatus] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form hook
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useZodForm<DemoFormData>(demoFormSchema, {
    defaultValues: {
      fullName: '',
      studentEmail: '',
      branch: '',
      acceptedTerms: false,
    },
  });

  const onFormSubmit = async (data: DemoFormData) => {
    setFormSubmitting(true);
    setFormStatus(null);
    await new Promise((res) => setTimeout(res, 800));
    setFormSubmitting(false);

    if (data.studentEmail.includes('error')) {
      setFormStatus({
        type: 'error',
        message: 'This email is already registered in Dhanmondi Branch.',
      });
      toast.error('Enrollment registration failed.');
    } else {
      setFormStatus({
        type: 'success',
        message: `Student ${data.fullName} registered successfully in ${data.branch}!`,
      });
      toast.success('Student registered successfully!');
      reset();
    }
  };

  const handleTableSort = (key: string) => {
    if (tableSortKey === key) {
      setTableSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setTableSortKey(key);
      setTableSortDir('asc');
    }
  };

  const tableColumns: Column<StudentTableRow>[] = [
    { key: 'name', header: 'Student Name', sortable: true },
    { key: 'roll', header: 'Roll Number', sortable: true },
    { key: 'batch', header: 'Enrolled Batch', sortable: true },
    { key: 'attendance', header: 'Attendance', sortable: true },
    {
      key: 'status',
      header: 'Fee Status',
      sortable: true,
      render: (row) => {
        const variants: Record<StudentTableRow['status'], 'success' | 'warning' | 'danger'> = {
          ACTIVE: 'success',
          PENDING: 'warning',
          OVERDUE: 'danger',
        };
        return <Badge variant={variants[row.status]}>{row.status}</Badge>;
      },
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-foreground">
      {/* Top Bar with Brand & Live Theme Toggle */}
      <header className="sticky top-0 z-[var(--z-navbar)] border-b border-border bg-surface/90 backdrop-blur-md">
        <Container className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] bg-primary text-primary-foreground font-bold font-heading">
              EF
            </span>
            <div>
              <span className="text-base font-bold text-foreground font-heading">EduFlow</span>
              <span className="ml-2 rounded-full bg-accent-subtle px-2 py-0.5 text-[10px] font-bold text-accent-foreground border border-accent/30 uppercase tracking-wider">
                Design System
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:inline">Theme Preview:</span>
            <ThemeToggle />
          </div>
        </Container>
      </header>

      {/* Main Showcase Container */}
      <main className="py-8 space-y-16">
        <Container>
          <PageHeader
            breadcrumbs={
              <Breadcrumbs
                items={[
                  { label: 'Documentation', href: '#' },
                  { label: 'Design Tokens & UI Component Specs' },
                ]}
              />
            }
            title="Design System & Component Library"
            description="Complete interactive reference of all tokens, typography, validation patterns, and accessible UI components built for the EduFlow coaching platform."
            badge={<Badge variant="primary">STN-7 Compliant</Badge>}
            actions={
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.scrollTo({ top: 600, behavior: 'smooth' })}
              >
                Jump to Components
              </Button>
            }
          />
        </Container>

        {/* SECTION 1: Color Palette & WCAG AA Contrast Tokens */}
        <Section
          title="1. Brand Palette & Contrast Tokens"
          subtitle="Exactly 3 primary brand colors + 1 neutral slate scale, verified to exceed WCAG AA 4.5:1 text and 3:1 UI boundary contrast ratios."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Primary */}
            <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 space-y-3 shadow-sm">
              <div className="h-16 w-full rounded-[var(--radius-control)] bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shadow-inner">
                Primary (Indigo)
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">--primary</h4>
                <p className="text-xs text-muted-foreground">Light #4338CA · Dark #818CF8</p>
                <div className="mt-2 flex items-center justify-between text-xs font-semibold text-secondary">
                  <span>Contrast Ratio:</span>
                  <span>7.90:1 (Pass AA)</span>
                </div>
              </div>
            </div>

            {/* Secondary */}
            <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 space-y-3 shadow-sm">
              <div className="h-16 w-full rounded-[var(--radius-control)] bg-secondary flex items-center justify-center text-secondary-foreground font-bold text-sm shadow-inner">
                Secondary (Teal)
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">--secondary / Success</h4>
                <p className="text-xs text-muted-foreground">Light #0F766E · Dark #2DD4BF</p>
                <div className="mt-2 flex items-center justify-between text-xs font-semibold text-secondary">
                  <span>Contrast Ratio:</span>
                  <span>5.47:1 (Pass AA)</span>
                </div>
              </div>
            </div>

            {/* Accent */}
            <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 space-y-3 shadow-sm">
              <div className="h-16 w-full rounded-[var(--radius-control)] bg-accent flex items-center justify-center text-accent-foreground font-bold text-sm shadow-inner">
                Accent (Amber)
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">--accent / Warning</h4>
                <p className="text-xs text-muted-foreground">Light #F59E0B · Dark #FBBF24</p>
                <div className="mt-2 flex items-center justify-between text-xs font-semibold text-secondary">
                  <span>Dark Text on Amber:</span>
                  <span>8.31:1 (Pass AA)</span>
                </div>
              </div>
            </div>

            {/* Neutral Slate */}
            <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 space-y-3 shadow-sm">
              <div className="h-16 w-full rounded-[var(--radius-control)] bg-foreground flex items-center justify-center text-background font-bold text-sm shadow-inner">
                Neutral Text & Surface
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">--foreground on --background</h4>
                <p className="text-xs text-muted-foreground">Slate #0F172A on #F8FAFC</p>
                <div className="mt-2 flex items-center justify-between text-xs font-semibold text-secondary">
                  <span>Body Contrast:</span>
                  <span>17.06:1 (Pass AAA)</span>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* SECTION 2: Buttons & States */}
        <Section
          title="2. Buttons & States"
          subtitle="All variants, sizes, loading states with width lock, and Link integration."
        >
          <div className="space-y-6 rounded-[var(--radius-card)] border border-border bg-surface p-6">
            {/* Variants */}
            <div>
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                Variants (Hover, Focus & Active)
              </h4>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="accent">Accent</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
                <Button variant="link">Link Style</Button>
              </div>
            </div>

            {/* Sizes */}
            <div>
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                Sizes & Icon Buttons
              </h4>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small (32px)</Button>
                <Button size="md">Medium (40px)</Button>
                <Button size="lg">Large (48px)</Button>
                <Button size="icon" aria-label="Search">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Disabled & Loading States */}
            <div>
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                Interactive States
              </h4>
              <div className="flex flex-wrap items-center gap-3">
                <Button disabled variant="primary">Disabled Primary</Button>
                <Button disabled variant="outline">Disabled Outline</Button>
                <Button isLoading variant="primary">Loading...</Button>
                <Button isLoading variant="secondary">Saving...</Button>
              </div>
            </div>

            {/* Avatars, Spinners & Skeletons */}
            <div className="pt-4 border-t border-border">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                Avatars & Loading Indicators
              </h4>
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <Avatar name="Tasif Hossain" size="sm" />
                  <Avatar name="Nusrat Jahan" size="md" />
                  <Avatar name="Dr. Afsana Mimi" size="lg" />
                  <Avatar name="Coaching Admin" size="xl" />
                </div>
                <div className="flex items-center gap-3 pl-4 border-l border-border">
                  <Spinner size="sm" />
                  <Spinner size="md" />
                  <Spinner size="lg" />
                </div>
                <div className="flex items-center gap-2 pl-4 border-l border-border">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* SECTION 3: BatchCard (Identical Dimensions, Clamping, Grid Helper) */}
        <Section
          title="3. BatchCard & Grid Rhythm (STN-7 Rubric)"
          subtitle="Identical card size, 16/10 aspect ratio image, 2-line title and description clamping, fee/schedule meta, and pinned full-width buttons in a 4-per-row desktop grid."
        >
          <BatchCardGrid>
            {/* Card 1: Long title */}
            <BatchCard batch={demoBatch1} />

            {/* Card 2: Admission batch */}
            <BatchCard batch={demoBatch2} />

            {/* Card 3: No-image fallback test */}
            <BatchCard batch={demoBatch3} />

            {/* Card 4: Advance BUET batch */}
            <BatchCard batch={demoBatch4} />
          </BatchCardGrid>

          {/* Skeleton Match Test */}
          <div className="mt-8 pt-8 border-t border-border">
            <h4 className="text-sm font-bold text-foreground mb-4">
              BatchCardSkeleton (Pixel-perfect dimension match to prevent layout shift)
            </h4>
            <BatchCardGrid>
              <BatchCardSkeleton />
              <BatchCardSkeleton />
              <BatchCardSkeleton />
              <BatchCardSkeleton />
            </BatchCardGrid>
          </div>
        </Section>

        {/* SECTION 4: Form Fields & Zod Validation Pattern */}
        <Section
          title="4. Form Controls & Validation Helpers"
          subtitle="Form controls with label, required marker, error state, success state, hint, and useZodForm integration."
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Live Interactive Form */}
            <Card className="p-6">
              <CardHeader className="p-0 pb-4">
                <CardTitle>Enrollment Validation Demo</CardTitle>
                <CardDescription>
                  Try submitting with empty fields, or type &quot;error@gmail.com&quot; to test backend error mapping.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
                  <FormStatus status={formStatus} onDismiss={() => setFormStatus(null)} />

                  <FormField
                    label="Student Full Name"
                    required
                    hint="Official name as per SSC certificate"
                    error={errors.fullName?.message}
                  >
                    <Input placeholder="e.g. Tasif Hossain" {...register('fullName')} />
                  </FormField>

                  <FormField
                    label="Student Email Address"
                    required
                    hint="Type error@test.com to trigger form-level error mapping"
                    error={errors.studentEmail?.message}
                  >
                    <Input
                      type="email"
                      placeholder="student@eduflow.com"
                      {...register('studentEmail')}
                    />
                  </FormField>

                  <FormField
                    label="Preferred Branch"
                    required
                    error={errors.branch?.message}
                  >
                    <Select {...register('branch')}>
                      <option value="">Select a branch location</option>
                      <option value="Dhanmondi Branch">Dhanmondi Branch</option>
                      <option value="Farmgate Branch">Farmgate Branch</option>
                      <option value="Uttara Branch">Uttara Branch</option>
                    </Select>
                  </FormField>

                  <FormField error={errors.acceptedTerms?.message}>
                    <Checkbox
                      id="terms-check"
                      label="I accept coaching center rules & fee payment terms"
                      description="Coaching fees are non-refundable after the second active class session."
                      {...register('acceptedTerms')}
                    />
                  </FormField>

                  <CardFooter className="p-0 pt-2">
                    <Button type="submit" variant="primary" isLoading={formSubmitting} className="w-full">
                      Submit Student Enrollment
                    </Button>
                  </CardFooter>
                </form>
              </CardContent>
            </Card>

            {/* Input States Gallery */}
            <div className="space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-6">
              <h4 className="text-sm font-bold text-foreground border-b border-border pb-2">
                Input States & Password Toggle
              </h4>

              <FormField label="Standard Input with Focus Ring">
                <Input placeholder="Enter username..." />
              </FormField>

              <FormField
                label="Input with Error State"
                error="Email is already linked to another student."
              >
                <Input defaultValue="invalid.user@" isError />
              </FormField>

              <FormField
                label="Input with Success State"
                success="Roll number verified in Dhanmondi branch."
              >
                <Input defaultValue="DH-2026-904" isSuccess />
              </FormField>

              <FormField label="Password Input with Show/Hide Toggle">
                <Input type="password" placeholder="Enter secure password..." showPasswordToggle />
              </FormField>

              <FormField label="Textarea Component">
                <Textarea placeholder="Enter guardian remarks or medical notes..." />
              </FormField>

              <div className="pt-2">
                <Switch
                  label="SMS Notifications"
                  description="Receive instant SMS when exam marks or attendance are published"
                  defaultChecked
                />
              </div>
            </div>
          </div>
        </Section>

        {/* SECTION 5: Modals, Dropdowns & Interactive Elements */}
        <Section
          title="5. Overlays & Navigation Components"
          subtitle="Focus-trapped dialogs, keyboard-accessible dropdown menus, tabs, and collapsible accordions."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Modal & Dropdown Demo */}
            <Card className="p-6 space-y-4">
              <CardTitle>Dialogs & Dropdowns</CardTitle>
              <CardDescription>
                Press ESC or click backdrop to close modals. Arrow keys navigate dropdown menus.
              </CardDescription>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                  Open Sample Modal
                </Button>

                <DropdownMenu
                  trigger={
                    <Button variant="outline" className="gap-2">
                      <User className="h-4 w-4" />
                      <span>Account Menu</span>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  }
                  items={[
                    { label: 'View Profile', icon: <User className="h-4 w-4" />, onClick: () => toast.info('Profile clicked') },
                    { label: 'Branch Settings', icon: <Settings className="h-4 w-4" />, onClick: () => toast.info('Settings clicked') },
                    { divider: true, label: '' },
                    { label: 'Sign Out', danger: true, icon: <LogOut className="h-4 w-4" />, onClick: () => toast.error('Signed out') },
                  ]}
                />

                <Tooltip content="Tooltip helper text on hover or focus">
                  <Button variant="ghost" size="sm">
                    Hover for Tooltip
                  </Button>
                </Tooltip>
              </div>

              {/* Controlled Rating Demo */}
              <div className="pt-4 border-t border-border">
                <span className="text-xs font-semibold text-muted-foreground block mb-2">
                  Interactive Rating Component (Click to rate):
                </span>
                <Rating value={ratingVal} readOnly={false} onChange={setRatingVal} showCount count={120} />
              </div>
            </Card>

            {/* Accordion Demo */}
            <Card className="p-6 space-y-4">
              <CardTitle>FAQ Accordion</CardTitle>
              <CardDescription>Smooth collapsible sections with semantic heading structure.</CardDescription>

              <Accordion
                items={[
                  {
                    id: 'faq-1',
                    title: 'How are monthly batch fees collected?',
                    content: 'Fees are paid at the start of each calendar month via bKash, Nagad, or bank deposit through the branch payment counter.',
                  },
                  {
                    id: 'faq-2',
                    title: 'Can students take missed model tests?',
                    content: 'Yes, teachers can schedule make-up tests in the batch portal within 7 days of the scheduled exam date.',
                  },
                  {
                    id: 'faq-3',
                    title: 'How do guardians monitor attendance?',
                    content: 'Guardians receive instant SMS notifications upon arrival and can log in to their linked portal for attendance percentages.',
                  },
                ]}
              />
            </Card>
          </div>

          {/* Tabs Showcase */}
          <div className="mt-8">
            <Tabs
              tabs={[
                {
                  id: 'academic',
                  label: 'Academic Batches',
                  icon: <BookOpen className="h-4 w-4" />,
                  content: (
                    <Card className="p-5">
                      <h4 className="font-bold text-foreground">HSC & SSC Academic Curriculum</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Regular class routines, chapter exams, and board question reviews.
                      </p>
                    </Card>
                  ),
                },
                {
                  id: 'admission',
                  label: 'Admission Programs',
                  icon: <GraduationCap className="h-4 w-4" />,
                  content: (
                    <Card className="p-5">
                      <h4 className="font-bold text-foreground">University & Medical Entrance</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Intensive MCQ speed drills, written test evaluations, and merit list tracking.
                      </p>
                    </Card>
                  ),
                },
                {
                  id: 'analytics',
                  label: 'Routine & Schedule',
                  icon: <Calendar className="h-4 w-4" />,
                  content: (
                    <Card className="p-5">
                      <h4 className="font-bold text-foreground">Weekly Branch Timetable</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Shift schedules, laboratory sessions, and special mentor workshops.
                      </p>
                    </Card>
                  ),
                },
              ]}
            />
          </div>
        </Section>

        {/* SECTION 6: Data Table, Empty & Error States */}
        <Section
          title="6. Data Presentation, Empty & Error States"
          subtitle="Presentational table with sortable headers, horizontal mobile scrolling, skeleton loading, and fallback states."
        >
          <div className="space-y-6">
            {/* Table Control Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTableLoading(!tableLoading)}
                >
                  {tableLoading ? 'Show Real Rows' : 'Toggle Skeleton Loader'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTableEmpty(!tableEmpty)}
                >
                  {tableEmpty ? 'Restore Data' : 'Toggle Empty State'}
                </Button>
              </div>

              {/* Controlled Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={6}
                onPageChange={setCurrentPage}
              />
            </div>

            {/* DataTable Shell */}
            <DataTable<StudentTableRow>
              columns={tableColumns}
              data={tableEmpty ? [] : demoTableData}
              isLoading={tableLoading}
              sortKey={tableSortKey}
              sortDirection={tableSortDir}
              onSort={handleTableSort}
              emptyTitle="No Students Enrolled"
              emptyDescription="No student records were found matching this branch filter."
              emptyAction={<Button size="sm">Enroll First Student</Button>}
            />

            {/* ErrorState Demo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
              <ErrorState
                title="Failed to sync attendance records"
                message="Could not connect to the cloud attendance terminal. Please verify your connection."
                onRetry={() => toast.success('Retrying connection...')}
              />

              <EmptyState
                icon={<Layers className="h-6 w-6 text-primary" />}
                title="No active exam tests"
                description="Create a model test or quiz to evaluate batch performance."
                action={<Button size="sm" variant="primary">Create Test</Button>}
              />
            </div>
          </div>
        </Section>

        {/* SECTION 10: Homepage & Content Card Catalog */}
        <Section
          title="10. Homepage & Public Content Cards"
          subtitle="Specialized cards built on the unified Card foundation with matching radius, borders, and shadows."
        >
          <div className="space-y-8">
            <div>
              <h4 className="text-sm font-bold text-foreground mb-3">Highlights & Features</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <HighlightStat value="98.5%" label="Board Exam Pass Rate" />
                <IconFeatureCard
                  icon="GraduationCap"
                  title="Experienced Faculty"
                  description="Top university educators mentoring students with structured mock tests."
                />
                <IconFeatureCard
                  icon="Award"
                  title="Scholarship Programs"
                  description="Merit-based waivers and admission incentives for top-performing students."
                />
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-foreground mb-3">Public Content Cards</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <BranchCard
                  branch={{
                    id: 'b-1',
                    name: 'Dhanmondi Campus',
                    address: 'House 42, Road 7/A, Dhanmondi, Dhaka',
                    phone: '01700000000',
                  }}
                />
                <TeacherCard
                  teacher={{
                    id: 't-1',
                    name: 'Dr. Zahid Hasan',
                    headline: 'Senior Physics Faculty',
                    bio: '15+ years mentoring board toppers with personalized test analysis.',
                    subjectName: 'Physics',
                    batchCount: 3,
                  }}
                />
                <TestimonialCard
                  testimonial={{
                    id: 'rev-1',
                    name: 'Anika Rahman',
                    role: 'HSC Candidate',
                    batchName: 'HSC 2026 Batch',
                    content: 'The weekly creative question practice sessions and routine helped me secure GPA 5.',
                    rating: 5,
                  }}
                />
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-foreground mb-3">Blog & Articles</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <BlogCard
                  post={{
                    id: 'post-1',
                    slug: 'how-to-prepare-for-board-exams',
                    title: 'Top 5 Revision Strategies for Final Board Examinations',
                    excerpt: 'Proven time-management and paper-solving techniques recommended by senior educators.',
                    category: 'Study Tips',
                    createdAt: new Date().toISOString(),
                  }}
                />
              </div>
            </div>
          </div>
        </Section>

        {/* 11. Dashboard Primitives & Semantic Status Tokens */}
        <Section
          title="11. Dashboard Primitives & Semantic Status Tokens"
          subtitle="Calm, brand-aware primitives for protected layouts, administrative workflows, and metrics."
        >

          <div className="space-y-10">
            {/* Semantic Status Badges */}
            <div>
              <h4 className="text-sm font-bold text-foreground mb-3">Semantic Status Badges (WCAG AA Compliant)</h4>
              <p className="text-xs text-muted-foreground mb-4">
                Independent of the primary brand color to guarantee standardized semantic feedback across all color themes.
              </p>
              <div className="flex flex-wrap gap-3 items-center">
                <StatusBadge variant="paid" showDot />
                <StatusBadge variant="present" showDot />
                <StatusBadge variant="partial" showDot />
                <StatusBadge variant="late" showDot />
                <StatusBadge variant="due" showDot />
                <StatusBadge variant="absent" showDot />
                <StatusBadge variant="upcoming" showDot />
                <StatusBadge variant="closed" showDot />
              </div>
            </div>

            {/* Dashboard PageHeader Demo */}
            <div>
              <h4 className="text-sm font-bold text-foreground mb-3">Dashboard PageHeader</h4>
              <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-card">
                <DashboardPageHeader
                  title="Academic Operations Dashboard"
                  description="Monitor ongoing batch lectures, fee completions, and instructor routines."
                  breadcrumbs={[
                    { label: 'Portal', href: '/dashboard' },
                    { label: 'Academics', href: '/batches' },
                    { label: 'Operations' },
                  ]}
                  actions={
                    <Button variant="primary" size="sm">
                      Export Report
                    </Button>
                  }
                />
              </div>
            </div>

            {/* StatCard Demos */}
            <div>
              <h4 className="text-sm font-bold text-foreground mb-3">StatCards (With Trend, Unit & Skeleton)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <StatCard
                  label="Enrolled Students"
                  value={1420}
                  unit="active"
                  trend={{ value: '12%', direction: 'up', label: 'vs last month' }}
                />
                <StatCard
                  label="Outstanding Balance"
                  value={formatMoney(84500)}
                  trend={{ value: '4%', direction: 'down', label: 'overdue rate' }}
                />
                <StatCard
                  label="Batch Attendance"
                  value="94.2%"
                  isLoading={false}
                  description="Average across 18 batches"
                />
              </div>
            </div>

            {/* SectionCard Demo */}
            <div>
              <h4 className="text-sm font-bold text-foreground mb-3">SectionCard</h4>
              <SectionCard
                title="Weekly Routine Allocation"
                description="Upcoming scheduled lecture halls and faculty assignments"
                actions={
                  <Button variant="outline" size="sm">
                    View Timetable
                  </Button>
                }
                footer="Showing 3 of 18 scheduled slots for today."
              >
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="font-medium text-foreground">HSC 2026 Higher Mathematics</span>
                    <StatusBadge variant="upcoming">04:30 PM</StatusBadge>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="font-medium text-foreground">Medical Intensive Biology Drill</span>
                    <StatusBadge variant="present">In Session</StatusBadge>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="font-medium text-foreground">SSC Physics Foundation</span>
                    <StatusBadge variant="closed">Completed</StatusBadge>
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>
        </Section>
      </main>

      {/* Interactive Modal Instance */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Sample Student Enrollment Modal"
        description="This modal demonstrates focus-trapping, ESC key escape, and background body scroll locking."
        footer={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                toast.success('Confirmed action successfully!');
                setIsModalOpen(false);
              }}
            >
              Confirm Action
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-sm text-foreground">
          <p>
            When this modal is open, keyboard focus is constrained within the dialog. Pressing the{' '}
            <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-xs">Tab</kbd>{' '}
            key cycles between interactive buttons.
          </p>
          <p className="text-xs text-muted-foreground">
            Pressing{' '}
            <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-xs">Escape</kbd>{' '}
            or clicking outside immediately dismisses the modal and restores background scroll.
          </p>
        </div>
      </Modal>
    </div>
  );
}
