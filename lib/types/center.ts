export interface CenterFeatures {
  publicSite: boolean;
  aiAssistant: boolean;
  blog: boolean;
  reviews: boolean;
  testimonials: boolean;
  newsletter: boolean;
  showPoweredBy?: boolean;
  lectures?: boolean;
  assignments?: boolean;
  onlineClasses?: boolean;
}

export interface CenterSocials {
  facebook?: string;
  youtube?: string;
  instagram?: string;
  linkedin?: string;
  website?: string;
}

export interface AnnouncementSettings {
  enabled: boolean;
  text: string;
  linkLabel?: string | null;
  linkUrl?: string | null;
}

export interface HighlightItem {
  label: string;
  value: string;
}

export interface WhyChooseUsItem {
  title: string;
  description: string;
  icon: string;
}

export interface AdmissionStepItem {
  title: string;
  description: string;
}

export interface HomepageSettings {
  heroBadge?: string;
  heroPoints?: string[];
  heroTitle?: string;
  heroSubtitle?: string;
  heroImageUrl?: string | null;
  announcement?: AnnouncementSettings;
  highlights?: HighlightItem[];
  whyChooseUs?: WhyChooseUsItem[];
  admissionSteps?: AdmissionStepItem[];
  showFees?: boolean;
  showPhotoGallery?: boolean;
}

export interface AboutSettings {
  headline?: string | null;
  body?: string | null;
  mission?: string | null;
  vision?: string | null;
  facilities?: string[] | null;
}

export interface LegalSettings {
  privacyText?: string | null;
  termsText?: string | null;
  updatedOn?: string | null;
}

export interface CenterContentSummary {
  hasPublishedBatches: boolean;
  hasTeachers: boolean;
  hasBlog: boolean;
  hasFaq: boolean;
  hasTestimonials: boolean;
  hasAbout: boolean;
}

export interface CenterPublicData {
  name: string;
  shortName: string;
  tagline: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  contactEmail: string;
  contactPhone: string;
  whatsapp: string | null;
  address: string | null;
  officeHours?: string | null;
  socials: CenterSocials;
  currency: string;
  currencySymbol: string;
  timezone: string;
  defaultLocale: string;
  weekStartsOn?: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday (default 6)
  features: CenterFeatures;
  homepage?: HomepageSettings;
  about?: AboutSettings | null;
  legal?: LegalSettings | null;
  content?: CenterContentSummary;
}

export interface FullCenterSettings extends CenterPublicData {
  id?: string;
  key?: string;
  academicYearStartMonth?: number;
  receiptHeader?: string | null;
  receiptFooter?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export const defaultCenterData: CenterPublicData = {
  name: 'Coaching Center',
  shortName: 'Center',
  tagline: '',
  logoUrl: null,
  faviconUrl: null,
  primaryColor: '#0ea5e9',
  contactEmail: '',
  contactPhone: '',
  whatsapp: null,
  address: null,
  officeHours: null,
  socials: {},
  currency: 'BDT',
  currencySymbol: '৳',
  timezone: 'Asia/Dhaka',
  defaultLocale: 'en',
  weekStartsOn: 6,
  features: {
    publicSite: true,
    aiAssistant: true,
    blog: true,
    reviews: true,
    testimonials: true,
    newsletter: false,
    showPoweredBy: true,
    lectures: true,
    assignments: true,
    onlineClasses: true,
  },
  homepage: {
    heroBadge: '',
    heroPoints: [],
    heroTitle: '',
    heroSubtitle: '',
    heroImageUrl: null,
    announcement: { enabled: false, text: '', linkLabel: '', linkUrl: '' },
    highlights: [],
    whyChooseUs: [],
    admissionSteps: [],
    showFees: true,
    showPhotoGallery: true,
  },
  about: null,
  legal: null,
  content: {
    hasPublishedBatches: true,
    hasTeachers: true,
    hasBlog: true,
    hasFaq: true,
    hasTestimonials: true,
    hasAbout: true,
  },
};

