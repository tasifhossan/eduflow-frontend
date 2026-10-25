import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen } from 'lucide-react';

export interface TeacherData {
  id: string;
  name: string;
  headline?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  subjectName?: string | null;
  batchCount?: number;
}

export interface TeacherCardProps {
  teacher: TeacherData;
  className?: string;
}

export function TeacherCard({ teacher, className }: TeacherCardProps) {
  const [imgError, setImgError] = React.useState(false);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'T';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <Card
      hoverEffect
      className={cn(
        'group flex flex-col items-center p-6 h-full text-center border border-border bg-surface text-foreground shadow-card transition-all duration-200',
        className
      )}
    >
      {/* Avatar Container */}
      <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-[var(--radius-pill)] overflow-hidden border-2 border-border bg-muted shadow-sm">
        {teacher.avatarUrl && !imgError ? (
          <Image
            src={teacher.avatarUrl}
            alt={teacher.name}
            fill
            sizes="96px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary font-bold text-lg sm:text-xl select-none">
            <span>{getInitials(teacher.name)}</span>
          </div>
        )}
      </div>

      <h3 className="mt-4 text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors">
        {teacher.name}
      </h3>

      {teacher.headline && (
        <p className="mt-1 text-xs font-semibold text-primary line-clamp-1">
          {teacher.headline}
        </p>
      )}

      {teacher.bio ? (
        <p className="mt-2 text-xs text-muted-foreground line-clamp-3 leading-relaxed flex-1">
          {teacher.bio}
        </p>
      ) : (
        <div className="flex-1" />
      )}

      <div className="mt-4 pt-3 border-t border-border/60 w-full flex items-center justify-center gap-2">
        {teacher.subjectName && (
          <Badge variant="primary" size="sm">
            {teacher.subjectName}
          </Badge>
        )}
        {typeof teacher.batchCount === 'number' && teacher.batchCount > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <BookOpen className="h-3 w-3" />
            {teacher.batchCount} {teacher.batchCount === 1 ? 'batch' : 'batches'}
          </span>
        )}
      </div>
    </Card>
  );
}
