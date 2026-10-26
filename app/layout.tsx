import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { CenterProvider } from "@/components/providers/center-provider";
import { Toaster } from "sonner";
import { getCenterData } from "@/lib/center";
import { generateThemeCss } from "@/lib/theme";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const center = await getCenterData();
  const title = center.tagline ? `${center.name} - ${center.tagline}` : center.name;
  const description = `${center.name} coaching management portal. Manage batches, attendance, exams, and routines.`;

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
    title: {
      default: title,
      template: `%s | ${center.name}`,
    },
    description,
    icons: {
      icon: center.faviconUrl || '/favicon.ico',
      shortcut: center.faviconUrl || '/favicon.ico',
      apple: center.faviconUrl || '/apple-touch-icon.png',
    },
    openGraph: {
      title,
      description,
      siteName: center.name,
      images: center.logoUrl ? [{ url: center.logoUrl }] : [],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const center = await getCenterData();
  const themeCss = generateThemeCss(center.primaryColor);

  return (
    <html
      lang={center.defaultLocale || "en"}
      className={`${inter.variable} ${poppins.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <style
          id="center-theme"
          dangerouslySetInnerHTML={{ __html: themeCss }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground selection:bg-primary/20 selection:text-foreground">
        <CenterProvider initialData={center}>
          <ThemeProvider>
            {children}
            <Toaster
              position="top-right"
              richColors
              closeButton
              toastOptions={{
                className: "!rounded-[var(--radius-control)] !font-sans",
              }}
            />
          </ThemeProvider>
        </CenterProvider>
      </body>
    </html>
  );
}
