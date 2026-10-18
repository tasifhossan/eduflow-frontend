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

export interface SiteConfig {
  brand: {
    name: string;
    tagline: string;
    shortTagline: string;
  };
  contact: {
    email: string;
    phone: string;
    formattedPhone: string;
    officeHours: string;
  };
  socials: {
    facebook?: string;
    youtube?: string;
    linkedin?: string;
    instagram?: string;
    twitter?: string;
  };
  nav: {
    loggedOut: NavItem[];
    resourcesMenu: NavItem[];
    loggedIn: NavItem[];
  };
  footer: {
    quickLinks: NavItem[];
    resourceLinks: NavItem[];
    legalLinks: NavItem[];
  };
}

export const siteConfig: SiteConfig = {
  brand: {
    name: 'EduFlow',
    tagline: 'Modern Multi-Branch Coaching Center Management Platform',
    shortTagline: 'Empowering students and teachers across Bangladesh',
  },
  contact: {
    email: 'contact@eduflow.com',
    phone: '+8801700000000',
    formattedPhone: '+880 1700-000000',
    officeHours: 'Saturday – Thursday: 9:00 AM – 8:00 PM',
  },
  socials: {
    facebook: '#',
    youtube: '#',
    linkedin: '#',
    instagram: '#',
  },
  nav: {
    // 5 Logged-out routes (exceeds min 4)
    loggedOut: [
      { label: 'Home', href: '/' },
      { label: 'Explore', href: '/explore' },
      { label: 'Blog', href: '/blog' },
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
    ],
    // Advanced Resources dropdown menu
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
    // 7 Logged-in routes (exceeds min 6)
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
      { label: 'About EduFlow', href: '/about' },
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
