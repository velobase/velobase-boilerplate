import "@/styles/globals.css";

import { type Metadata, type Viewport } from "next";
import { Inter, JetBrains_Mono, Poppins } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";

import { TRPCReactProvider } from "@/trpc/react";
import { SessionProvider } from "next-auth/react";
import { LoginModal } from "@/components/auth/login-modal";
import { PaymentSelectionDialog } from "@/components/billing/payment-selection-dialog";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TimezoneUpdater } from "@/components/timezone-updater";
import { GeoUpdater } from "@/components/geo-updater";
import { PostHogProvider } from "@/analytics";
import { UtmTracker } from "@/components/analytics/utm-tracker";
import { headers, cookies } from "next/headers";
import { getGoogleAdsConfig } from "@/config/analytics";
import { auth } from "@/server/auth";
import { getClientCountryFromHeaders } from "@/server/lib/get-client-country";
import { isEeaLikeCountry } from "@/server/lib/is-eea-country";
import { CookieBar } from "@/components/cookie-consent/cookie-bar";
import { DeviceKeyEnsurer } from "@/components/device-key-ensurer";
import { ServiceNoticeBanner } from "@/components/layout/service-notice-banner";

const CONSENT_COOKIE = "app_cookie_consent";

export const metadata: Metadata = {
  title: "AI SaaS Framework",
  description: "Production-ready AI SaaS framework with auth, billing, payments, and AI chat built in.",
  icons: [
    { rel: "icon", url: "/favicon.svg", type: "image/svg+xml" },
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// Inter 字体用于正文 - ChatGPT 风格
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// JetBrains Mono 用于代码块 - 优秀的等宽字体
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

// Poppins 用于标题 - 圆润现代的字体
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const gAdsConfig = getGoogleAdsConfig(host);
  const GA_MEASUREMENT_ID = gAdsConfig.measurementId;
  const session = await auth();

  const countryCode = getClientCountryFromHeaders(headersList as unknown as Headers);
  const isEea = isEeaLikeCountry(countryCode);
  const cookieStore = await cookies();
  const consent = cookieStore.get(CONSENT_COOKIE)?.value ?? "";
  const analyticsEnabled = !isEea || consent === "all";

  return (
    <html
      lang="en"
      data-eea={isEea ? "1" : "0"}
      className={`${inter.variable} ${jetbrainsMono.variable} ${poppins.variable}`}
      suppressHydrationWarning
    >
      <head>
        {analyticsEnabled ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}', { allow_enhanced_conversions: true });
              `}
            </Script>
          </>
        ) : null}
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          disableTransitionOnChange
        >
          <SessionProvider
            // Preload session on the server to avoid an extra client fetch on first paint.
            // This also prevents noisy ClientFetchError logs in strict privacy/Incognito environments
            // when /api/auth/session is blocked or fails transiently.
            session={session}
            refetchOnWindowFocus={false}
            refetchInterval={0}
          >
            <PostHogProvider analyticsEnabled={analyticsEnabled}>
              <TRPCReactProvider>
                <Suspense fallback={null}>
                  {analyticsEnabled ? <UtmTracker /> : null}
                </Suspense>
                <DeviceKeyEnsurer />
                <TimezoneUpdater />
                <GeoUpdater />
                <ServiceNoticeBanner />
                {children}
                <LoginModal />
                <PaymentSelectionDialog />
                <Toaster />
              </TRPCReactProvider>
            </PostHogProvider>
          </SessionProvider>
        </ThemeProvider>
        {isEea && !consent ? <CookieBar /> : null}
      </body>
    </html>
  );
}
