import React from 'react';

interface SafeTextProps {
  content?: string | null;
  className?: string;
  maxChars?: number;
}

// Inline token types
type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'italic'; value: string }
  | { type: 'link'; text: string; href: string };

/**
 * Safely parses inline markdown (bold, italic, markdown links, bare https:// URLs).
 * React JSX intrinsically escapes HTML tags like <script> when rendered as text children.
 * Dangerous protocols like javascript: or data: are rejected and rendered as text.
 */
function parseInline(text: string): React.ReactNode[] {
  // Regex to match:
  // 1. Markdown link: [text](url)
  // 2. Bold: **text**
  // 3. Italic: *text*
  // 4. Bare URL: https?://[^\s<]+
  const inlineRegex =
    /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|(https?:\/\/[^\s<]+))/g;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineRegex.exec(text)) !== null) {
    // Plain text before match
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[2] !== undefined && match[3] !== undefined) {
      // Markdown link [text](url)
      const linkText = match[2];
      const linkHref = match[3].trim();
      if (/^https?:\/\//i.test(linkHref)) {
        nodes.push(
          <a
            key={`link-${match.index}`}
            href={linkHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline underline-offset-4 font-medium"
          >
            {linkText}
          </a>
        );
      } else {
        // Disallow dangerous protocols like javascript: or data:
        nodes.push(`[${linkText}](${linkHref})`);
      }
    } else if (match[4] !== undefined) {
      // Bold **text**
      nodes.push(
        <strong key={`b-${match.index}`} className="font-semibold text-foreground">
          {match[4]}
        </strong>
      );
    } else if (match[5] !== undefined) {
      // Italic *text*
      nodes.push(
        <em key={`i-${match.index}`} className="italic">
          {match[5]}
        </em>
      );
    } else if (match[6] !== undefined) {
      // Bare URL
      const url = match[6];
      nodes.push(
        <a
          key={`url-${match.index}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline underline-offset-4 break-all"
        >
          {url}
        </a>
      );
    }

    lastIndex = inlineRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

export function SafeText({
  content,
  className = '',
  maxChars = 20000,
}: SafeTextProps) {
  if (!content) return null;

  const truncated = content.length > maxChars ? content.slice(0, maxChars) : content;
  const lines = truncated.split(/\r?\n/);

  const blocks: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;
  let paragraphBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length > 0) {
      const text = paragraphBuffer.join(' ').trim();
      if (text) {
        blocks.push(
          <p
            key={`p-${blocks.length}`}
            className="text-sm sm:text-base leading-relaxed text-muted-foreground my-3"
          >
            {parseInline(text)}
          </p>
        );
      }
      paragraphBuffer = [];
    }
  };

  const flushList = () => {
    if (currentList) {
      const ListTag = currentList.type;
      const listClass =
        currentList.type === 'ul'
          ? 'list-disc pl-5 my-3 space-y-1 text-sm sm:text-base leading-relaxed text-muted-foreground'
          : 'list-decimal pl-5 my-3 space-y-1 text-sm sm:text-base leading-relaxed text-muted-foreground';

      blocks.push(
        <ListTag key={`list-${blocks.length}`} className={listClass}>
          {currentList.items.map((item, idx) => (
            <li key={idx}>{parseInline(item)}</li>
          ))}
        </ListTag>
      );
      currentList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      // Empty line closes active paragraph or list
      flushParagraph();
      flushList();
      continue;
    }

    // Heading 3 (###)
    if (line.startsWith('### ')) {
      flushParagraph();
      flushList();
      blocks.push(
        <h3
          key={`h3-${blocks.length}`}
          className="text-lg font-bold tracking-tight text-foreground mt-5 mb-2"
        >
          {parseInline(line.slice(4))}
        </h3>
      );
      continue;
    }

    // Heading 2 (##)
    if (line.startsWith('## ')) {
      flushParagraph();
      flushList();
      blocks.push(
        <h2
          key={`h2-${blocks.length}`}
          className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-7 mb-3"
        >
          {parseInline(line.slice(3))}
        </h2>
      );
      continue;
    }

    // Unordered bullet list: - or *
    const bulletMatch = line.match(/^[-*]\s+(.+)/);
    if (bulletMatch) {
      flushParagraph();
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      continue;
    }

    // Numbered list: 1. or 2. etc.
    const numMatch = line.match(/^\d+\.\s+(.+)/);
    if (numMatch) {
      flushParagraph();
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(numMatch[1]);
      continue;
    }

    // Otherwise standard paragraph line
    flushList();
    paragraphBuffer.push(line);
  }

  flushParagraph();
  flushList();

  return <div className={`safe-text-content space-y-1 ${className}`}>{blocks}</div>;
}
