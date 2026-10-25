'use client';

import * as React from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DevShortcutsProps {
  loading: boolean;
  countdown: number;
  onDemoLogin: (role: 'STUDENT' | 'TEACHER' | 'ADMIN' | 'GUARDIAN') => void;
}

export default function DevShortcuts({ loading, countdown, onDemoLogin }: DevShortcutsProps) {
  return (
    <details className="mt-6 rounded-[var(--radius-control)] border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground group">
      <summary className="cursor-pointer font-medium text-foreground/80 hover:text-foreground flex items-center justify-between select-none py-0.5">
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
          <span>Developer shortcuts</span>
        </span>
        <span className="text-[10px] text-muted-foreground transition-transform group-open:rotate-180">
          ▼
        </span>
      </summary>
      <div className="mt-3 grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
        <Button
          type="button"
          id="demo-student-login-btn"
          variant="outline"
          size="sm"
          disabled={loading || countdown > 0}
          onClick={() => onDemoLogin('STUDENT')}
          className="text-xs justify-start h-9"
        >
          Student
        </Button>
        <Button
          type="button"
          id="demo-teacher-login-btn"
          variant="outline"
          size="sm"
          disabled={loading || countdown > 0}
          onClick={() => onDemoLogin('TEACHER')}
          className="text-xs justify-start h-9"
        >
          Teacher
        </Button>
        <Button
          type="button"
          id="demo-admin-login-btn"
          variant="outline"
          size="sm"
          disabled={loading || countdown > 0}
          onClick={() => onDemoLogin('ADMIN')}
          className="text-xs justify-start h-9"
        >
          Branch Admin
        </Button>
        <Button
          type="button"
          id="demo-guardian-login-btn"
          variant="outline"
          size="sm"
          disabled={loading || countdown > 0}
          onClick={() => onDemoLogin('GUARDIAN')}
          className="text-xs justify-start h-9"
        >
          Guardian
        </Button>
      </div>
    </details>
  );
}
