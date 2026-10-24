export interface CenterFeatures {
  publicSite: boolean;
  aiAssistant: boolean;
  blog: boolean;
  reviews: boolean;
  testimonials: boolean;
  newsletter: boolean;
  showPoweredBy?: boolean;
}

export interface CenterSocials {
  facebook?: string;
  youtube?: string;
  instagram?: string;
  linkedin?: string;
  website?: string;
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
  name: 'Coaching Portal',
  shortName: 'Portal',
  tagline: 'Coaching Management Platform',
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
    newsletter: true,
    showPoweredBy: true,
  },
};
