"use client";

import { 
  Users, 
  ClipboardCheck, 
  Award, 
  Calendar, 
  Receipt, 
  Megaphone, 
  Sparkles
} from "lucide-react";

interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  highlighted?: boolean;
  badge?: string;
}

export default function Features() {
  const featuresList: Feature[] = [
    {
      icon: Users,
      title: "Batch & Student Management",
      description: "Group students into batches (e.g. Class 10 Physics, Engineering Prep) and track their progress seamlessly.",
    },
    {
      icon: ClipboardCheck,
      title: "Attendance Tracking",
      description: "Quickly mark student attendance per class and automatically notify parents of absences.",
    },
    {
      icon: Award,
      title: "MCQ Test Engine & Auto Ranking",
      description: "Host daily/weekly MCQ exams and generate automated merit lists (Auto Ranking) instantly. Perfect for admission prep.",
      highlighted: true,
      badge: "Popular",
    },
    {
      icon: Calendar,
      title: "Class Routine Scheduling",
      description: "Avoid schedule conflicts with routine management for teachers, rooms, and student batches.",
    },
    {
      icon: Receipt,
      title: "Fee/Payment Tracking",
      description: "Monitor monthly tuition fees, admission costs, and pending payments with detailed payment history.",
    },
    {
      icon: Megaphone,
      title: "Notice Board & Communication",
      description: "Broadcast important exam dates, routine changes, and updates to students and parents instantly.",
    },
  ];

  return (
    <section id="features" className="py-20 lg:py-28 bg-slate-50 border-y border-slate-200/60 scroll-mt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent ring-1 ring-inset ring-accent/20">
            <Sparkles className="h-3.5 w-3.5" />
            Built-in Tools
          </div>
          <h2 className="font-poppins text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            Everything You Need to Run Your Center
          </h2>
          <p className="font-inter text-base text-text-body leading-relaxed">
            Eliminate spreadsheets and paper logs. EduFlow brings all administrative operations 
            into a single dashboard designed for the unique needs of coaching centers in Bangladesh.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {featuresList.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className={`relative flex flex-col justify-between rounded-2xl border bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-md hover:shadow-slate-200/80 ${
                  feature.highlighted 
                    ? "border-accent ring-1 ring-accent/30" 
                    : "border-slate-200/80"
                }`}
              >
                <div>
                  {/* Badge */}
                  {feature.badge && (
                    <span className="absolute top-4 right-4 inline-flex items-center rounded-md bg-highlight/10 px-2 py-0.5 text-xs font-semibold text-highlight ring-1 ring-inset ring-highlight/20">
                      {feature.badge}
                    </span>
                  )}

                  {/* Icon */}
                  <div
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-xl mb-5 ${
                      feature.highlighted
                        ? "bg-highlight/10 text-highlight"
                        : "bg-accent/10 text-accent"
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>

                  {/* Title */}
                  <h3 className="font-poppins text-lg font-semibold text-primary mb-2">
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p className="font-inter text-sm text-text-body leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
