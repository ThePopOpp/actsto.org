import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display, Roboto } from "next/font/google";

import { ConditionalSiteChrome } from "@/components/conditional-site-chrome";
import { ThemeProvider } from "@/components/theme-provider";
import { getActSession } from "@/lib/auth/session-server";
import { ACT_FAVICON } from "@/lib/constants";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

/** Dashboard nav / links (Roboto per design system). */
const roboto = Roboto({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-roboto",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Arizona Christian Tuition",
    template: "%s · Arizona Christian Tuition",
  },
  description:
    "Turn your Arizona taxes into private Christian education and tuition through the state tax credit program.",
  icons: {
    icon: [{ url: ACT_FAVICON, type: "image/png" }],
    apple: ACT_FAVICON,
    shortcut: ACT_FAVICON,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getActSession();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${roboto.variable} flex min-h-full flex-col bg-background text-foreground antialiased`}
      >
        <ThemeProvider>
          <ConditionalSiteChrome user={user}>{children}</ConditionalSiteChrome>
        </ThemeProvider>
      </body>
    </html>
  );
}
