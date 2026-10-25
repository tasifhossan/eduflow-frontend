'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { apiPatch } from '@/lib/api';
import { toast } from 'sonner';

export interface OnlineClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: unknown) => void;
  lecture: {
    id: string;
    title: string;
    onlineProvider?: string;
    onlineMeetingUrl?: string | null;
    onlineMeetingId?: string | null;
    onlineMeetingPasscode?: string | null;
  };
}

export function OnlineClassModal({
  isOpen,
  onClose,
  onSuccess,
  lecture,
}: OnlineClassModalProps) {
  const [prevId, setPrevId] = React.useState(lecture.id);
  const [provider, setProvider] = React.useState(lecture.onlineProvider || 'NONE');
  const [url, setUrl] = React.useState(lecture.onlineMeetingUrl || '');
  const [meetingId, setMeetingId] = React.useState(lecture.onlineMeetingId || '');
  const [passcode, setPasscode] = React.useState(lecture.onlineMeetingPasscode || '');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [urlError, setUrlError] = React.useState<string | null>(null);

  if (lecture.id !== prevId) {
    setPrevId(lecture.id);
    setProvider(lecture.onlineProvider || 'NONE');
    setUrl(lecture.onlineMeetingUrl || '');
    setMeetingId(lecture.onlineMeetingId || '');
    setPasscode(lecture.onlineMeetingPasscode || '');
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError(null);

    if (provider !== 'NONE' && !url.trim()) {
      setUrlError('Meeting URL is required when online class is enabled');
      return;
    }

    if (provider !== 'NONE' && !url.startsWith('https://')) {
      setUrlError('Meeting URL must begin with https://');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiPatch<{ success: boolean; data: unknown }>(
        `/api/lectures/${lecture.id}`,
        {
          onlineProvider: provider,
          onlineMeetingUrl: provider !== 'NONE' ? url.trim() : null,
          onlineMeetingId: provider !== 'NONE' ? meetingId.trim() || null : null,
          onlineMeetingPasscode: provider !== 'NONE' ? passcode.trim() || null : null,
        }
      );

      if (res?.success) {
        toast.success('Online class configuration updated');
        onSuccess(res.data);
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update online class';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configure Online Live Class"
      description={`Set up Google Meet, Zoom, or live stream link for "${lecture.title}"`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">Online Meeting Provider</label>
          <Select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            <option value="NONE">None (In-person Physical Class)</option>
            <option value="GOOGLE_MEET">Google Meet</option>
            <option value="ZOOM">Zoom</option>
            <option value="OTHER">Other Live Link</option>
          </Select>
        </div>

        {provider !== 'NONE' && (
          <div className="space-y-3 pt-1">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Meeting URL (Must start with https://) *</label>
              <Input
                type="url"
                placeholder="https://meet.google.com/xyz-abcd-efg"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setUrlError(null);
                }}
                isError={!!urlError}
                required
              />
              {urlError && <p className="text-xs text-status-danger-text mt-1">{urlError}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Meeting ID (Optional)</label>
                <Input
                  placeholder="xyz-abcd-efg"
                  value={meetingId}
                  onChange={(e) => setMeetingId(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Passcode (Optional)</label>
                <Input
                  placeholder="123456"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                />
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Note: To prevent unauthorized access, the Join button and meeting passcode will only be revealed to enrolled students during the class join window (from 30 minutes before start until 60 minutes after end).
            </p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
