import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";

import { ConditionalSiteChrome } from "@/components/conditional-site-chrome";
import { NotificationBanner } from "@/components/pwa/notification-banner";
import { PwaProvider } from "@/components/pwa/pwa-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { getActSession } from "@/lib/auth/session-server";
import { ACT_APP_ICON, ACT_FAVICON } from "@/lib/constants";
import { getCtaBlockByPlacement } from "@/lib/site-cta-blocks";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Serif display accent for headings (matches the MJG type system). */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Arizona Christian Tuition",
    template: "%s · Arizona Christian Tuition",
  },
  description:
    "Turn your Arizona taxes into private Christian education and tuition through the state tax credit program.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ACTSTO",
  },
  icons: {
    icon: [{ url: ACT_FAVICON, type: "image/svg+xml" }],
    apple: ACT_APP_ICON,
    shortcut: ACT_FAVICON,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f8fc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [user, headerPrimaryCta, headerSecondaryCta, headerMobileExtraCta] = await Promise.all([
    getActSession(),
    getCtaBlockByPlacement("site_header_primary"),
    getCtaBlockByPlacement("site_header_secondary"),
    getCtaBlockByPlacement("site_header_mobile_extra"),
  ]);

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} flex min-h-full flex-col bg-background text-foreground antialiased`}
      >
        <ThemeProvider>
          <PwaProvider>
            <ConditionalSiteChrome
              user={user}
              headerCtas={{
                primary: headerPrimaryCta,
                secondary: headerSecondaryCta,
                mobileExtra: headerMobileExtraCta,
              }}
            >
              {children}
            </ConditionalSiteChrome>
            <NotificationBanner />
          </PwaProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
