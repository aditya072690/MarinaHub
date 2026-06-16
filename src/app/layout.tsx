import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Sora } from "next/font/google";

import { QueryProvider } from "@/providers/query-provider";
import { GsapProvider } from "@/components/providers/gsap-provider";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  display: "swap",
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "MarinaHub",
    template: "%s | MarinaHub",
  },
  description:
    "Manage marinas, fleets, bookings, revenue analytics, and customer experiences through MarinaHub.",
  keywords: [
    "Marina Management",
    "Boat Booking",
    "Fleet Management",
    "Marina Analytics",
    "Boat Rental Software",
    "MarinaHub",
  ],
  metadataBase: new URL("https://marinahub.com"),
  openGraph: {
    title: "MarinaHub",
    description:
      "Manage marinas, fleets, bookings, and analytics from one platform.",
    siteName: "MarinaHub",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MarinaHub",
    description:
      "Modern marina management and boat booking platform.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`
        ${geistSans.variable}
        ${geistMono.variable}
        ${inter.variable}
        ${sora.variable}
      `}
    >
      <body
        className="
          min-h-screen
          scroll-smooth
          bg-background
          text-foreground
          antialiased
          font-[var(--font-inter)]
          overflow-x-hidden
        "
      >
        <QueryProvider>
          <GsapProvider>
            <main id="app-root" className="relative min-h-screen">
              {children}
            </main>
          </GsapProvider>

          <Toaster
            position="top-right"
            richColors
            expand
            closeButton
            duration={4000}
          />
        </QueryProvider>
      </body>
    </html>
  );
}