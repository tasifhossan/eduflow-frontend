'use client';

import * as React from 'react';
import {
  Heading2,
  Heading3,
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Eye,
  Edit3,
  AlertTriangle,
} from 'lucide-react';
import { SafeText } from '@/components/content/safe-text';
import { cn } from '@/lib/cn';

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  maxChars?: number;
  placeholder?: string;
  label?: string;
  error?: string;
  className?: string;
  disabled?: boolean;
}

export function MarkdownEditor({
  value,
  onChange,
  maxChars = 20000,
  placeholder = 'Write content here (Markdown subset supported: ##, ###, **bold**, *italic*, lists, links)...',
  label = 'Content',
  error,
  className,
  disabled = false,
}: MarkdownEditorProps) {
  const [tab, setTab] = React.useState<'write' | 'preview'>('write');
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  // Check for forbidden HTML constructs
  const hasHtml = React.useMemo(() => {
    return /<[^>]+>|javascript:|data:/i.test(value);
  }, [value]);

  const insertFormatting = (prefix: string, suffix: string = '') => {
    const el = textareaRef.current;
    if (!el || disabled) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selectedText = value.substring(start, end);
    const before = value.substring(0, start);
    const after = value.substring(end);

    const replacement = `${prefix}${selectedText || 'text'}${suffix}`;
    const nextValue = `${before}${replacement}${after}`;
    onChange(nextValue);

    // Reposition cursor
    setTimeout(() => {
      el.focus();
      const newCursorPos = start + prefix.length + (selectedText ? selectedText.length : 4);
      el.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleHeading2 = () => insertFormatting('\n## ');
  const handleHeading3 = () => insertFormatting('\n### ');
  const handleBold = () => insertFormatting('**', '**');
  const handleItalic = () => insertFormatting('*', '*');
  const handleBulletList = () => insertFormatting('\n- ');
  const handleNumberedList = () => insertFormatting('\n1. ');
  const handleLink = () => insertFormatting('[', '](https://)');

  const charCount = value.length;
  const isNearLimit = charCount > maxChars * 0.9;
  const isOverLimit = charCount > maxChars;

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between">
        {label && (
          <label className="block text-xs font-semibold text-foreground">
            {label}
          </label>
        )}

        {/* Write / Preview Tab Switcher */}
        <div className="flex items-center border border-border rounded-[var(--radius-control)] p-0.5 bg-surface text-xs">
          <button
            type="button"
            onClick={() => setTab('write')}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-[calc(var(--radius-control)-2px)] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              tab === 'write'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Edit3 className="h-3 w-3" aria-hidden="true" />
            Write
          </button>
          <button
            type="button"
            onClick={() => setTab('preview')}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-[calc(var(--radius-control)-2px)] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              tab === 'preview'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Eye className="h-3 w-3" aria-hidden="true" />
            Preview
          </button>
        </div>
      </div>

      <div
        className={cn(
          'border rounded-[var(--radius-control)] bg-surface overflow-hidden transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent',
          error ? 'border-danger' : 'border-border'
        )}
      >
        {/* Formatting Toolbar */}
        {tab === 'write' && (
          <div className="flex items-center flex-wrap gap-1 p-2 border-b border-border bg-surface-hover/30">
            <button
              type="button"
              disabled={disabled}
              onClick={handleHeading2}
              aria-label="Insert Heading 2"
              title="Heading 2 (##)"
              className="h-8 w-8 rounded-[var(--radius-control)] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface border border-transparent hover:border-border transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Heading2 className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={handleHeading3}
              aria-label="Insert Heading 3"
              title="Heading 3 (###)"
              className="h-8 w-8 rounded-[var(--radius-control)] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface border border-transparent hover:border-border transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Heading3 className="h-4 w-4" aria-hidden="true" />
            </button>
            <div className="h-4 w-px bg-border mx-1" aria-hidden="true" />
            <button
              type="button"
              disabled={disabled}
              onClick={handleBold}
              aria-label="Bold text"
              title="Bold (**text**)"
              className="h-8 w-8 rounded-[var(--radius-control)] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface border border-transparent hover:border-border transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Bold className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={handleItalic}
              aria-label="Italic text"
              title="Italic (*text*)"
              className="h-8 w-8 rounded-[var(--radius-control)] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface border border-transparent hover:border-border transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Italic className="h-4 w-4" aria-hidden="true" />
            </button>
            <div className="h-4 w-px bg-border mx-1" aria-hidden="true" />
            <button
              type="button"
              disabled={disabled}
              onClick={handleBulletList}
              aria-label="Bullet list"
              title="Bullet list (- item)"
              className="h-8 w-8 rounded-[var(--radius-control)] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface border border-transparent hover:border-border transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <List className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={handleNumberedList}
              aria-label="Numbered list"
              title="Numbered list (1. item)"
              className="h-8 w-8 rounded-[var(--radius-control)] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface border border-transparent hover:border-border transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ListOrdered className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={handleLink}
              aria-label="Insert Link"
              title="Markdown link ([text](https://...))"
              className="h-8 w-8 rounded-[var(--radius-control)] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface border border-transparent hover:border-border transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <LinkIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Text Area (Write) */}
        {tab === 'write' ? (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={placeholder}
            rows={12}
            className="w-full p-3 bg-surface text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-y leading-relaxed"
          />
        ) : (
          /* Live Preview Tab */
          <div className="p-4 min-h-[300px] bg-surface-hover/10 max-h-[500px] overflow-y-auto">
            {value.trim() ? (
              <SafeText content={value} />
            ) : (
              <p className="text-xs italic text-muted-foreground">
                Nothing to preview yet. Switch back to Write to add content.
              </p>
            )}
          </div>
        )}

        {/* Editor Footer: Warning & Counter */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-surface-hover/20 text-[11px]">
          <div>
            {hasHtml ? (
              <span className="inline-flex items-center gap-1 text-danger font-medium">
                <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
                Raw HTML / script tags / javascript: links are forbidden and will be rejected.
              </span>
            ) : (
              <span className="text-muted-foreground">
                Plain markdown only: headings, lists, bold, italic, https links.
              </span>
            )}
          </div>
          <div
            className={cn(
              'font-mono font-medium',
              isOverLimit ? 'text-danger' : isNearLimit ? 'text-warning' : 'text-muted-foreground'
            )}
          >
            {charCount.toLocaleString()} / {maxChars.toLocaleString()}
          </div>
        </div>
      </div>

      {error && (
        <p className="text-xs text-danger font-medium mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
