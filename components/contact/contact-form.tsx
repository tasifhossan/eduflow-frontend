'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { apiPost } from '@/lib/api';
import { Send, Loader2, CheckCircle2 } from 'lucide-react';

export interface ContactFormProps {
  batches?: Array<{ id: string; name: string }>;
  branches?: Array<{ id: string; name: string }>;
}

export function ContactForm({ batches = [], branches = [] }: ContactFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [batchId, setBatchId] = useState('');
  const [preferredBranchId, setPreferredBranchId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !message.trim()) {
      toast.error('Please enter your name, phone number, and message');
      return;
    }

    setLoading(true);
    try {
      const res = await apiPost<{ success: boolean; message?: string }>('/api/contact', {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        interestedBatchId: batchId || undefined,
        preferredBranchId: preferredBranchId || undefined,
        message: message.trim(),
      });

      if (res.success) {
        toast.success('Your message has been sent successfully!');
        setSubmitted(true);
      } else {
        toast.error(res.message || 'Failed to submit message. Please try again.');
      }
    } catch {
      toast.error('Network error. Please call our administrative office.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Card className="p-8 text-center bg-surface border-border space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mx-auto">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h3 className="text-xl font-bold text-foreground">Message Received!</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          Thank you for reaching out. Our admissions counselor will review your inquiry and get in touch with you shortly.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSubmitted(false);
            setName('');
            setPhone('');
            setEmail('');
            setBatchId('');
            setMessage('');
          }}
        >
          Send Another Message
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6 sm:p-8 bg-surface border-border shadow-xs">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Full Name <span className="text-danger">*</span>
            </label>
            <Input
              required
              placeholder="e.g. Tanvir Hasan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Contact Phone <span className="text-danger">*</span>
            </label>
            <Input
              required
              type="tel"
              placeholder="e.g. 01700000000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-10 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Email Address (Optional)
            </label>
            <Input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 text-sm"
            />
          </div>

          {batches.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Interested Course (Optional)
              </label>
              <select
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className="w-full h-10 px-3 rounded-[var(--radius-control)] border border-border bg-surface text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select a course / program...</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {branches.length > 1 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Preferred Branch (Optional)
              </label>
              <select
                value={preferredBranchId}
                onChange={(e) => setPreferredBranchId(e.target.value)}
                className="w-full h-10 px-3 rounded-[var(--radius-control)] border border-border bg-surface text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select preferred branch...</option>
                {branches.map((br) => (
                  <option key={br.id} value={br.id}>
                    {br.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Your Inquiry or Message <span className="text-danger">*</span>
          </label>
          <Textarea
            required
            rows={4}
            placeholder="Tell us about the student's grade, target exam, or questions regarding batch schedules..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="text-sm"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          disabled={loading}
          className="w-full sm:w-auto px-8 h-11 font-bold text-sm gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Sending Inquiry...</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>Send Message</span>
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}
