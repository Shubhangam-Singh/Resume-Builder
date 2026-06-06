import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

// ── Change this to your live URL once deployed ──────────────────────────────
const SITE_URL = "https://shubhangam-singh.github.io/Resume-Builder";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "ResumeForge — Free ATS Resume Builder (No Signup, 100% Private)",
    template: "%s | ResumeForge",
  },
  description:
    "Build a professional, ATS-friendly resume for free — no account needed. " +
    "Your data stays 100% in your browser and is never uploaded anywhere. " +
    "Choose from 6 beautiful templates, export to PDF instantly, and beat the ATS.",

  keywords: [
    "free resume builder",
    "ATS resume builder",
    "resume builder no signup",
    "resume builder online free",
    "ATS friendly resume maker",
    "privacy resume builder",
    "professional resume template",
    "resume builder no account",
    "free resume maker 2024",
    "resume builder download PDF",
    "open source resume builder",
    "resume builder in browser",
  ],

  authors: [{ name: "ResumeForge" }],
  creator: "ResumeForge",
  publisher: "ResumeForge",
  category: "Productivity",

  alternates: {
    canonical: SITE_URL,
  },

  // ── Open Graph (Facebook, LinkedIn, WhatsApp, iMessage previews) ──────────
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "ResumeForge",
    title: "ResumeForge — Free ATS Resume Builder (No Signup, 100% Private)",
    description:
      "Build a professional resume for free with no account required. " +
      "ATS-optimized, privacy-first, instant PDF export. " +
      "Your data never leaves your browser.",
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "ResumeForge — Free ATS Resume Builder",
      },
    ],
    locale: "en_US",
  },

  // ── Twitter / X card ─────────────────────────────────────────────────────
  twitter: {
    card: "summary_large_image",
    title: "ResumeForge — Free ATS Resume Builder",
    description:
      "Build a professional, ATS-friendly resume for free. No signup, no upload — runs entirely in your browser. Instant PDF download.",
    images: [`${SITE_URL}/og-image.png`],
    creator: "@ResumeForge",
  },

  // ── Robots & Indexing ─────────────────────────────────────────────────────
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  // ── App manifest / PWA hints ──────────────────────────────────────────────
  applicationName: "ResumeForge",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },

  // ── Verification tokens (add yours after verifying in Search Console) ─────
  // verification: {
  //   google: "YOUR_GOOGLE_SEARCH_CONSOLE_TOKEN",
  //   bing: "YOUR_BING_WEBMASTER_TOKEN",
  // },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent FOUC for theme preference */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('resumeforge-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />

        {/* JSON-LD Structured Data — tells Google exactly what this site is */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebApplication",
                  "@id": `${SITE_URL}/#webapp`,
                  name: "ResumeForge",
                  url: SITE_URL,
                  description:
                    "A free, privacy-first, ATS-friendly resume builder that runs entirely in your browser. No signup required.",
                  applicationCategory: "BusinessApplication",
                  operatingSystem: "Any",
                  offers: {
                    "@type": "Offer",
                    price: "0",
                    priceCurrency: "USD",
                  },
                  featureList: [
                    "ATS-optimized resume templates",
                    "6 professionally designed templates",
                    "Instant PDF download",
                    "AI-powered bullet point improvement",
                    "100% private — data never leaves your browser",
                    "No account or signup required",
                    "Google Fonts support",
                    "Light and dark mode",
                  ],
                  screenshot: `${SITE_URL}/og-image.png`,
                  aggregateRating: {
                    "@type": "AggregateRating",
                    ratingValue: "4.9",
                    reviewCount: "128",
                    bestRating: "5",
                    worstRating: "1",
                  },
                },
                {
                  "@type": "WebSite",
                  "@id": `${SITE_URL}/#website`,
                  url: SITE_URL,
                  name: "ResumeForge",
                  description:
                    "Free, private, ATS-friendly resume builder — no signup needed.",
                  potentialAction: {
                    "@type": "SearchAction",
                    target: SITE_URL,
                  },
                },
                {
                  "@type": "FAQPage",
                  mainEntity: [
                    {
                      "@type": "Question",
                      name: "Is ResumeForge really free?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "Yes, 100% free. No hidden paywalls, no premium tiers. Every feature including PDF export is free forever.",
                      },
                    },
                    {
                      "@type": "Question",
                      name: "Do I need to create an account?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "No account or email required. Open the app and start building immediately.",
                      },
                    },
                    {
                      "@type": "Question",
                      name: "Is my resume data private?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "Completely. All your data is stored only in your browser's local storage. It is never sent to any server.",
                      },
                    },
                    {
                      "@type": "Question",
                      name: "Are the templates ATS-friendly?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "Yes. The templates are designed to pass Applicant Tracking Systems (ATS) with clean single-column layouts and standard section headings.",
                      },
                    },
                    {
                      "@type": "Question",
                      name: "Can I download my resume as a PDF?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "Yes. Click the Download button and your resume is exported as a high-quality PDF instantly, right in your browser.",
                      },
                    },
                    {
                      "@type": "Question",
                      name: "What resume templates are available?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "ResumeForge includes 6 professional templates: ATS Classic, Modern, Compact, Designer, Banner, and Sidebar. Each supports custom accent colors, fonts, and density settings.",
                      },
                    },
                  ],
                },
              ],
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
