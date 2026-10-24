'use client';

import * as React from 'react';
import { FLOATING_POSITIONS } from '@/lib/position-tokens';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface FloatingWhatsAppProps {
  whatsapp?: string | null;
  className?: string;
}

export function FloatingWhatsApp({ whatsapp, className }: FloatingWhatsAppProps) {
  if (!whatsapp) return null;

  // Clean to digits only for wa.me format
  const digits = whatsapp.replace(/\D/g, '');
  if (!digits || digits.length < 8) return null;

  // Format with country code if not present (Bangladeshi default 880)
  const fullDigits = digits.startsWith('880')
    ? digits
    : digits.startsWith('0')
    ? `88${digits}`
    : `880${digits}`;

  const waUrl = `https://wa.me/${fullDigits}`;

  return (
    <div
      className={cn(
        'fixed',
        FLOATING_POSITIONS.whatsapp.bottom,
        FLOATING_POSITIONS.whatsapp.right,
        FLOATING_POSITIONS.whatsapp.zIndex,
        className
      )}
    >
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with center on WhatsApp"
        className={cn(
          'flex items-center justify-center rounded-[var(--radius-pill)] shadow-popover',
          'bg-[#25D366] text-white hover:bg-[#1EBE5D] active:scale-95 transition-all duration-200',
          'focus:outline-none focus:ring-4 focus:ring-[#25D366]/40',
          FLOATING_POSITIONS.whatsapp.size
        )}
      >
        <MessageCircle className="h-6 w-6 fill-current stroke-none" aria-hidden="true" />
      </a>
    </div>
  );
}
