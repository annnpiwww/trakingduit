import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { themeScript } from "@/lib/theme";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://trakingduit.my.id"),
  title: {
    default: "TrakingDuit — AI-Powered Financial Intelligence Platform",
    template: "%s | TrakingDuit",
  },
  description:
    "Autonomous personal finance platform for Southeast Asia powered by Claude 3.5 Sonnet. Instant receipt OCR, local-first privacy vault, and real-time cashflow intelligence.",
  applicationName: "TrakingDuit",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "TrakingDuit" },
  keywords: [
    "Personal Finance",
    "Expense Tracker",
    "Receipt OCR",
    "Claude 3.5 Sonnet",
    "Local-First Fintech",
    "AI Financial Assistant",
    "Southeast Asia Fintech",
    "TrakingDuit",
  ],
  authors: [{ name: "Farhan Lakoro", url: "https://trakingduit.my.id" }],
  creator: "Farhan Lakoro",
  publisher: "TrakingDuit",
  openGraph: {
    type: "website",
    locale: "id_ID",
    alternateLocale: "en_US",
    url: "https://trakingduit.my.id",
    siteName: "TrakingDuit",
    title: "TrakingDuit — AI-Powered Financial Intelligence Platform",
    description:
      "Autonomous personal finance platform for Southeast Asia powered by Claude 3.5 Sonnet. Instant receipt OCR, local-first privacy vault, and real-time cashflow intelligence.",
    images: [
      {
        url: "/icons/logo.png",
        width: 512,
        height: 512,
        alt: "TrakingDuit Logo and Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TrakingDuit — AI-Powered Financial Intelligence Platform",
    description:
      "Autonomous personal finance platform for Southeast Asia powered by Claude 3.5 Sonnet. Instant receipt OCR, local-first privacy vault, and real-time cashflow intelligence.",
    images: ["/icons/logo.png"],
  },
  alternates: {
    canonical: "https://trakingduit.my.id",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0f16" },
    { media: "(prefers-color-scheme: light)", color: "#f4f5f7" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning className={`${jakarta.variable} h-full antialiased`}>
      <head>
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
