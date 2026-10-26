export interface NavItem {
  label: string;
  href: string;
  description?: string;
  iconName?: string;
}

export interface NavDropdownGroup {
  label: string;
  items: NavItem[];
}

export interface SiteNavConfig {
  loggedOut: NavItem[];
  resourcesMenu: NavItem[];
  loggedIn: NavItem[];
}

export interface SiteFooterConfig {
  quickLinks: NavItem[];
  resourceLinks: NavItem[];
  legalLinks: NavItem[];
}

export interface SiteConfig {
  nav: SiteNavConfig;
  footer: SiteFooterConfig;
}

export const siteConfig: SiteConfig = {
  nav: {
    loggedOut: [
      { label: 'Home', href: '/' },
      { label: 'Explore', href: '/explore' },
      { label: 'Blog', href: '/blog' },
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
    ],
    resourcesMenu: [
      {
        label: 'Help & FAQ',
        href: '/faq',
        description: 'Answers to batch admissions, routines, and exams',
        iconName: 'HelpCircle',
      },
      {
        label: 'Blog & Articles',
        href: '/blog',
        description: 'Academic guides, exam tips, and syllabus analysis',
        iconName: 'BookOpen',
      },
      {
        label: 'Privacy Policy',
        href: '/privacy',
        description: 'How we safeguard student and guardian personal data',
        iconName: 'ShieldCheck',
      },
      {
        label: 'Terms of Service',
        href: '/terms',
        description: 'Rules, fee schedules, and academic enrollment guidelines',
        iconName: 'FileText',
      },
    ],
    loggedIn: [
      { label: 'Home', href: '/' },
      { label: 'Explore', href: '/explore' },
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Blog', href: '/blog' },
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'Help', href: '/faq' },
    ],
  },
  footer: {
    quickLinks: [
      { label: 'Home', href: '/' },
      { label: 'Explore Batches', href: '/explore' },
      { label: 'Blog & Insights', href: '/blog' },
      { label: 'About Us', href: '/about' },
      { label: 'Contact Us', href: '/contact' },
    ],
    resourceLinks: [
      { label: 'Help & FAQ', href: '/faq' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
    ],
    legalLinks: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
    ],
  },
};

export function isRouteVisible(
  href: string,
  features: { publicSite?: boolean; blog?: boolean },
  content?: {
    hasPublishedBatches?: boolean;
    hasTeachers?: boolean;
    hasBlog?: boolean;
    hasFaq?: boolean;
    hasTestimonials?: boolean;
    hasAbout?: boolean;
  }
): boolean {
  if (href === '/' || href === '/login' || href === '/dashboard') return true;
  if (href === '/privacy' || href === '/terms') return true;

  // Gated behind publicSite
  if (features.publicSite === false) return false;

  if (href === '/explore') {
    return content ? (content.hasPublishedBatches ?? true) : true;
  }
  if (href === '/blog') {
    return (features.blog !== false) && (content ? (content.hasBlog ?? true) : true);
  }
  if (href === '/about') {
    return content ? (content.hasAbout ?? true) : true;
  }
  if (href === '/faq') {
    return content ? (content.hasFaq ?? true) : true;
  }
  if (href === '/contact') {
    return true;
  }

  return true;
}
