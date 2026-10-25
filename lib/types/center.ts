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
  socials: CenterSocials;
  currency: string;
  currencySymbol: string;
  timezone: string;
  defaultLocale: string;
  features: CenterFeatures;
  homepage?: HomepageSettings;
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
  socials: {},
  currency: 'BDT',
  currencySymbol: '৳',
  timezone: 'Asia/Dhaka',
  defaultLocale: 'en',
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
};

