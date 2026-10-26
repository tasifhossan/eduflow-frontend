'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Accordion, AccordionItem } from '@/components/ui/accordion';
import { Rating } from '@/components/ui/rating';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { BatchCard, BatchCardData } from '@/components/ui/batch-card';
import { TeacherCard } from '@/components/cards/TeacherCard';
import { toast } from 'sonner';
import { apiPost } from '@/lib/api';
import {
  BookOpen,
  Calendar,
  Clock,
  MapPin,
  Tag,
  CheckCircle2,
  Share2,
  Copy,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  Loader2,
  X,
} from 'lucide-react';

export interface BatchDetailData {
  id: string;
  name: string;
  slug: string;
  type: 'ACADEMIC' | 'ADMISSION';
  classLevel?: string | null;
  feeType?: 'MONTHLY' | 'ONE_TIME';
  feeAmount?: number;
  description?: string;
  imageUrl?: string | null;
  gallery?: string[];
  syllabus?: Array<string | { title: string; topics?: string[]; description?: string }>;
  highlights?: string[];
  routineSlots?: Array<{ dayOfWeek: string; startTime: string; endTime: string }>;
  subject?: { id: string; name: string };
  branch?: { id: string; name: string; address?: string; phone?: string };
  teacher?: { id: string; name: string; avatarUrl?: string; bio?: string; role?: string };
  stats?: {
    enrolledCount?: number;
    reviewCount?: number;
    averageRating?: number;
  };
}

export interface ReviewItem {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  studentName?: string;
}

export interface CourseDetailViewProps {
  batch: BatchDetailData;
  relatedBatches: BatchCardData[];
  reviews: ReviewItem[];
  currencySymbol: string;
  reviewsEnabled: boolean;
}

export function CourseDetailView({
  batch,
  relatedBatches,
  reviews,
  currencySymbol,
  reviewsEnabled,
}: CourseDetailViewProps) {
  // Gallery images array
  const allImages = [batch.imageUrl, ...(batch.gallery || [])].filter(Boolean) as string[];
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);

  // Enquiry Modal state
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false);
  const [enquiryName, setEnquiryName] = useState('');
  const [enquiryPhone, setEnquiryPhone] = useState('');
  const [enquiryEmail, setEnquiryEmail] = useState('');
  const [enquiryMessage, setEnquiryMessage] = useState('');
  const [isSubmittingEnquiry, setIsSubmittingEnquiry] = useState(false);

  // Keyboard navigation for gallery modal
  useEffect(() => {
    if (!isGalleryModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setModalImageIndex((prev) => (prev + 1) % allImages.length);
      } else if (e.key === 'ArrowLeft') {
        setModalImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
      } else if (e.key === 'Escape') {
        setIsGalleryModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGalleryModalOpen, allImages.length]);

  const openGalleryModal = (index: number) => {
    setModalImageIndex(index);
    setIsGalleryModalOpen(true);
  };

  const handleCopyLink = async () => {
    if (typeof window !== 'undefined') {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Course link copied to clipboard!');
    }
  };

  const handleShareWhatsApp = () => {
    if (typeof window !== 'undefined') {
      const url = encodeURIComponent(window.location.href);
      const text = encodeURIComponent(`Check out ${batch.name} on EduFlow: `);
      window.open(`https://wa.me/?text=${text}${url}`, '_blank');
    }
  };

  const handleShareFacebook = () => {
    if (typeof window !== 'undefined') {
      const url = encodeURIComponent(window.location.href);
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
    }
  };

  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enquiryName.trim() || !enquiryPhone.trim()) {
      toast.error('Please provide your name and phone number');
      return;
    }

    setIsSubmittingEnquiry(true);
    try {
      const res = await apiPost('/api/contact', {
        name: enquiryName.trim(),
        phone: enquiryPhone.trim(),
        email: enquiryEmail.trim() || undefined,
        message: enquiryMessage.trim() || `Inquiry regarding batch: ${batch.name}`,
        interestedBatchId: batch.id,
      });

      if (res.success) {
        toast.success('Your enquiry has been received! Our center office will contact you shortly.');
        setIsEnquiryModalOpen(false);
        setEnquiryName('');
        setEnquiryPhone('');
        setEnquiryEmail('');
        setEnquiryMessage('');
      } else {
        toast.error(res.message || 'Failed to submit enquiry. Please try again.');
      }
    } catch {
      toast.error('Network error. Please call the center directly.');
    } finally {
      setIsSubmittingEnquiry(false);
    }
  };

  // Prepare defensive syllabus accordion items
  const syllabusItems: AccordionItem[] = (batch.syllabus || []).map((item, index) => {
    if (typeof item === 'string') {
      return {
        id: `module-${index}`,
        title: `Module ${index + 1}: ${item}`,
        content: <p className="text-sm text-muted-foreground">{item}</p>,
      };
    }
    return {
      id: `module-${index}`,
      title: item.title || `Module ${index + 1}`,
      content: (
        <div className="space-y-2">
          {item.description && (
            <p className="text-sm text-muted-foreground">{item.description}</p>
          )}
          {item.topics && item.topics.length > 0 && (
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-muted-foreground">
              {item.topics.map((t, tidx) => (
                <li key={tidx}>{t}</li>
              ))}
            </ul>
          )}
        </div>
      ),
    };
  });

  const formattedFee =
    batch.feeAmount !== undefined && batch.feeAmount !== null
      ? `${currencySymbol}${batch.feeAmount.toLocaleString()}${
          batch.feeType === 'MONTHLY' ? '/month' : ' (One-time)'
        }`
      : 'Contact for Fee Structure';

  return (
    <div className="py-8 sm:py-12">
      <Container>
        {/* Breadcrumb row */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <span>/</span>
          <Link href="/explore" className="hover:text-foreground transition-colors">Courses</Link>
          <span>/</span>
          <span className="text-foreground font-semibold truncate max-w-[200px] sm:max-w-none">
            {batch.name}
          </span>
        </nav>

        {/* Main Hero Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-12">
          {/* Left Column: Gallery & Details (8 cols) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-8">
            {/* Gallery Section */}
            <div className="space-y-3">
              <div
                className="relative aspect-[16/10] w-full rounded-[var(--radius-card)] overflow-hidden border border-border bg-muted cursor-pointer group"
                onClick={() => allImages.length > 0 && openGalleryModal(activeImageIndex)}
              >
                {allImages.length > 0 ? (
                  <Image
                    src={allImages[activeImageIndex]}
                    alt={`${batch.name} cover`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    priority
                    className="object-cover transition-transform duration-300 group-hover:scale-102"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                    <BookOpen className="h-16 w-16 text-muted-foreground/50" />
                  </div>
                )}
                <div className="absolute top-4 left-4 flex gap-2">
                  <Badge variant={batch.type === 'ADMISSION' ? 'accent' : 'primary'} size="md">
                    {batch.type}
                  </Badge>
                  {batch.classLevel && (
                    <Badge variant="neutral" size="md" className="bg-surface/90 backdrop-blur-md">
                      {batch.classLevel}
                    </Badge>
                  )}
                </div>
                {allImages.length > 1 && (
                  <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2.5 py-1 rounded-[var(--radius-control)]">
                    {activeImageIndex + 1} / {allImages.length} Photos
                  </div>
                )}
              </div>

              {/* Thumbnail Strip */}
              {allImages.length > 1 && (
                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                  {allImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative h-16 w-24 shrink-0 rounded-[var(--radius-control)] overflow-hidden border-2 transition-all ${
                        activeImageIndex === idx
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'border-border/80 opacity-70 hover:opacity-100'
                      }`}
                      aria-label={`View photo ${idx + 1}`}
                    >
                      <Image
                        src={img}
                        alt={`Thumbnail ${idx + 1}`}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Title & Subject Info */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {batch.subject && (
                  <span className="inline-flex items-center gap-1 font-semibold text-primary">
                    <Tag className="h-3.5 w-3.5" />
                    {batch.subject.name}
                  </span>
                )}
                {batch.branch && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {batch.branch.name}
                  </span>
                )}
                {reviewsEnabled && batch.stats?.averageRating && (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <Rating
                      value={batch.stats.averageRating}
                      size="sm"
                      showCount
                      count={batch.stats.reviewCount || 0}
                    />
                  </div>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground leading-tight">
                {batch.name}
              </h1>

              {batch.description && (
                <p className="text-sm sm:text-base leading-relaxed text-muted-foreground">
                  {batch.description}
                </p>
              )}
            </div>

            {/* Course Highlights */}
            {batch.highlights && batch.highlights.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-border">
                <h2 className="text-lg font-bold text-foreground">Course Highlights</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {batch.highlights.map((h, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground/90">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Routine & Schedule */}
            {batch.routineSlots && batch.routineSlots.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-border">
                <h2 className="text-lg font-bold text-foreground">Weekly Class Routine</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {batch.routineSlots.map((slot, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-[var(--radius-control)] border border-border bg-surface-sunken/40 flex items-center gap-3 text-xs"
                    >
                      <Clock className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <div className="font-bold text-foreground capitalize">{slot.dayOfWeek.toLowerCase()}</div>
                        <div className="text-muted-foreground">{slot.startTime} – {slot.endTime}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Syllabus Accordion */}
            {syllabusItems.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-border">
                <h2 className="text-lg font-bold text-foreground">Curriculum &amp; Syllabus</h2>
                <Accordion items={syllabusItems} allowMultiple />
              </div>
            )}

            {/* Instructor / Teacher Card */}
            {batch.teacher && (
              <div className="space-y-3 pt-4 border-t border-border">
                <h2 className="text-lg font-bold text-foreground">Course Instructor</h2>
                <TeacherCard
                  teacher={{
                    id: batch.teacher.id,
                    name: batch.teacher.name,
                    avatarUrl: batch.teacher.avatarUrl,
                    bio: batch.teacher.bio,
                    headline: batch.teacher.role || 'Senior Instructor',
                    subjectName: batch.subject?.name,
                  }}
                />
              </div>
            )}

            {/* Reviews Section (When enabled) */}
            {reviewsEnabled && (
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-foreground">Student Reviews</h2>
                  {batch.stats?.averageRating ? (
                    <Rating value={batch.stats.averageRating} size="sm" showCount count={reviews.length} />
                  ) : null}
                </div>

                {reviews.length === 0 ? (
                  <p className="text-xs sm:text-sm text-muted-foreground italic">
                    No verified student reviews published yet for this batch.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {reviews.map((r) => (
                      <Card key={r.id} className="p-4 bg-surface border-border space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">
                            {r.studentName || 'Enrolled Student'}
                          </span>
                          <Rating value={r.rating} size="sm" />
                        </div>
                        {r.comment && (
                          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                            {r.comment}
                          </p>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Share Buttons */}
            <div className="pt-4 border-t border-border flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Share2 className="h-3.5 w-3.5" />
                Share Course:
              </span>
              <Button variant="outline" size="sm" onClick={handleCopyLink} className="h-8 gap-1.5 text-xs">
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Link</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleShareWhatsApp} className="h-8 gap-1.5 text-xs">
                <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />
                <span>WhatsApp</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleShareFacebook} className="h-8 gap-1.5 text-xs">
                <span>Facebook</span>
              </Button>
            </div>
          </div>

          {/* Right Column: Sticky Enquiry Card (Desktop, 4 cols) */}
          <div className="hidden lg:block lg:col-span-5 xl:col-span-4 sticky top-24">
            <Card className="p-6 border-border shadow-md bg-surface space-y-6">
              <div className="space-y-2 pb-4 border-b border-border">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Course Fee
                </span>
                <div className="text-2xl font-black text-foreground">
                  {formattedFee}
                </div>
                <div className="text-xs text-muted-foreground">
                  {batch.feeType === 'MONTHLY' ? 'Billed monthly per enrollment' : 'Comprehensive course tuition'}
                </div>
              </div>

              {/* Direct Enquiry Form */}
              <form onSubmit={handleEnquirySubmit} className="space-y-4">
                <h3 className="text-sm font-bold text-foreground">Apply / Enquire for Admission</h3>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Full Name *</label>
                  <Input
                    required
                    placeholder="Student or guardian name"
                    value={enquiryName}
                    onChange={(e) => setEnquiryName(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Mobile Phone *</label>
                  <Input
                    required
                    type="tel"
                    placeholder="017xxxxxxxx"
                    value={enquiryPhone}
                    onChange={(e) => setEnquiryPhone(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Email (Optional)</label>
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    value={enquiryEmail}
                    onChange={(e) => setEnquiryEmail(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Note / Questions</label>
                  <Textarea
                    placeholder="Any questions regarding batch timings or admission..."
                    rows={2}
                    value={enquiryMessage}
                    onChange={(e) => setEnquiryMessage(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmittingEnquiry}
                  className="w-full h-10 font-bold text-xs gap-1.5"
                >
                  {isSubmittingEnquiry ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Request Seat Confirmation</span>
                    </>
                  )}
                </Button>
              </form>

              {/* Branch & Contact Info */}
              {batch.branch && (
                <div className="pt-4 border-t border-border space-y-2 text-xs text-muted-foreground">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span>Campus: {batch.branch.name}</span>
                  </div>
                  {batch.branch.address && <p>{batch.branch.address}</p>}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Related Courses Section */}
        {relatedBatches.length > 0 && (
          <div className="pt-12 border-t border-border space-y-6">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Explore More
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Related Courses
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {relatedBatches.slice(0, 4).map((rel) => (
                <BatchCard key={rel.id} batch={rel} />
              ))}
            </div>
          </div>
        )}

        {/* Mobile Sticky Bottom Call-back Bar */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border p-3.5 shadow-lg flex items-center justify-between gap-4">
          <div>
            <div className="text-xs text-muted-foreground">Tuition Fee</div>
            <div className="text-sm font-bold text-foreground">{formattedFee}</div>
          </div>
          <Button
            variant="primary"
            onClick={() => setIsEnquiryModalOpen(true)}
            className="h-10 px-5 font-bold text-xs"
          >
            Request Admission
          </Button>
        </div>

        {/* Mobile Enquiry Modal */}
        <Modal
          isOpen={isEnquiryModalOpen}
          onClose={() => setIsEnquiryModalOpen(false)}
          title={`Enquire for ${batch.name}`}
        >
          <form onSubmit={handleEnquirySubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Full Name *</label>
              <Input
                required
                placeholder="Student or guardian name"
                value={enquiryName}
                onChange={(e) => setEnquiryName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Phone Number *</label>
              <Input
                required
                type="tel"
                placeholder="017xxxxxxxx"
                value={enquiryPhone}
                onChange={(e) => setEnquiryPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Email (Optional)</label>
              <Input
                type="email"
                placeholder="name@example.com"
                value={enquiryEmail}
                onChange={(e) => setEnquiryEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Note / Questions</label>
              <Textarea
                placeholder="Questions about schedule, seat availability..."
                rows={3}
                value={enquiryMessage}
                onChange={(e) => setEnquiryMessage(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmittingEnquiry}
              className="w-full h-11 font-bold"
            >
              {isSubmittingEnquiry ? 'Sending...' : 'Submit Enquiry'}
            </Button>
          </form>
        </Modal>

        {/* Fullscreen Photo Viewer Modal */}
        {isGalleryModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Photo Gallery Viewer"
            className="fixed inset-0 z-[var(--z-modal)] bg-black/90 flex flex-col items-center justify-center p-4"
          >
            <button
              type="button"
              onClick={() => setIsGalleryModalOpen(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 z-50"
              aria-label="Close photo viewer"
            >
              <X className="h-6 w-6" />
            </button>

            {allImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setModalImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length)
                  }
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/80 p-3 rounded-full z-50 transition-colors"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setModalImageIndex((prev) => (prev + 1) % allImages.length)
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/80 p-3 rounded-full z-50 transition-colors"
                  aria-label="Next photo"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            <div className="relative max-w-4xl max-h-[80vh] w-full h-[70vh]">
              <Image
                src={allImages[modalImageIndex]}
                alt={`Photo ${modalImageIndex + 1}`}
                fill
                sizes="100vw"
                className="object-contain"
              />
            </div>

            <div className="text-white text-xs mt-3">
              Photo {modalImageIndex + 1} of {allImages.length}
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}
