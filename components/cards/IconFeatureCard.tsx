import * as React from 'react';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/card';
import {
  BookOpen,
  GraduationCap,
  Award,
  Users,
  Clock,
  CheckCircle,
  CheckCircle2,
  Star,
  Shield,
  ShieldCheck,
  Sparkles,
  Target,
  Compass,
  Lightbulb,
  Smile,
  Heart,
  TrendingUp,
  Zap,
  HelpCircle,
  FileText,
  Calendar,
  MapPin,
  Brain,
  Layers,
  Flame,
  Trophy,
  BadgeCheck,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  BookOpen,
  GraduationCap,
  Award,
  Users,
  Clock,
  CheckCircle,
  CheckCircle2,
  Star,
  Shield,
  ShieldCheck,
  Sparkles,
  Target,
  Compass,
  Lightbulb,
  Smile,
  Heart,
  TrendingUp,
  Zap,
  HelpCircle,
  FileText,
  Calendar,
  MapPin,
  Brain,
  Layers,
  Flame,
  Trophy,
  BadgeCheck,
};

export interface IconFeatureCardProps {
  title: string;
  description: string;
  icon?: string;
  className?: string;
}

export function IconFeatureCard({ title, description, icon = 'Sparkles', className }: IconFeatureCardProps) {
  const IconComponent = ICON_MAP[icon] || Sparkles;

  return (
    <Card
      hoverEffect
      className={cn(
        'group flex flex-col p-6 h-full border border-border bg-surface text-foreground shadow-card transition-all duration-200',
        className
      )}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200">
        <IconComponent className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors">
        {title}
      </h3>
      <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed flex-1">
        {description}
      </p>
    </Card>
  );
}
