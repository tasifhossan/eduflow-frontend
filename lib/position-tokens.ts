/**
 * Global position tokens for floating action widgets (WhatsApp, AI assistant, etc.)
 * Ensures clean stacking order, non-overlapping touch targets, and accessible offsets across responsive viewports.
 */
export const FLOATING_POSITIONS = {
  // Floating WhatsApp button
  whatsapp: {
    bottom: 'bottom-6 md:bottom-8',
    right: 'right-6 md:right-8',
    size: 'h-12 w-12 min-h-[48px] min-w-[48px]',
    zIndex: 'z-30',
  },
  // Reserved coordinate slot for future AI assistant widget (sits above WhatsApp)
  aiAssistant: {
    bottom: 'bottom-22 md:bottom-24',
    right: 'right-6 md:right-8',
    size: 'h-14 w-14 min-h-[56px] min-w-[56px]',
    zIndex: 'z-30',
  },
} as const;
