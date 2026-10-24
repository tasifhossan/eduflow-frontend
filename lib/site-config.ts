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
