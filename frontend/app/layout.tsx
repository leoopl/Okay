import { Inter, Varela_Round } from 'next/font/google';
import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { cn } from '@/lib/utils';
import { Toaster } from 'sonner';
import Script from 'next/script';
import { getUserWithRolesAndPermissions } from '@/lib/supabase/server';
import { AuthProvider } from '@/providers/auth-provider';
import { NetworkStatusProvider } from '@/providers/network-status-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { OfflineBanner } from '@/components/offline-banner';
import { IncompleteProfileDialog } from '@/components/profile/incomplete-profile-dialog';
import { PWAInstaller } from '@/components/pwa-installer';

const varelaRound = Varela_Round({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-varela-round',
  weight: '400',
  preload: true,
  fallback: ['system-ui', 'arial'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const APP_NAME = 'Okay';
const APP_DEFAULT_TITLE = 'Okay - Sua Jornada de Bem-Estar Mental';
const APP_TITLE_TEMPLATE = '%s | Okay';
const APP_DESCRIPTION =
  'Suporte para sua jornada de saúde mental com recursos, ferramentas e orientação.';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbe5a8' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a1a' },
  ],
};

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    template: APP_TITLE_TEMPLATE,
    default: APP_DEFAULT_TITLE,
  },
  description: APP_DESCRIPTION,
  keywords: [
    'saúde mental',
    'bem-estar',
    'questionários psicológicos',
    'autoavaliação',
    'depressão',
    'ansiedade',
    'estresse',
    'psicologia',
    'terapia',
    'diário',
    'meditação',
    'respiração',
  ],
  authors: [{ name: 'Okay Team' }],
  creator: 'Okay',
  publisher: 'Okay',
  manifest: '/manifest.json',
  metadataBase: new URL(process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://okay.app'),
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: APP_DEFAULT_TITLE,
    startupImage: [
      {
        url: '/splash/apple-splash-2048-2732.jpg',
        media:
          '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        url: '/splash/apple-splash-1668-2388.jpg',
        media:
          '(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        url: '/splash/apple-splash-1536-2048.jpg',
        media:
          '(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        url: '/splash/apple-splash-1125-2436.jpg',
        media:
          '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/splash/apple-splash-1242-2688.jpg',
        media:
          '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/splash/apple-splash-828-1792.jpg',
        media:
          '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        url: '/splash/apple-splash-1242-2208.jpg',
        media:
          '(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/splash/apple-splash-750-1334.jpg',
        media:
          '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        url: '/splash/apple-splash-640-1136.jpg',
        media:
          '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
    ],
  },
  formatDetection: {
    telephone: false,
  },

  category: 'health',
  classification: 'Mental Health Support',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
    locale: 'pt_BR',
    url: '/',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Okay - Apoio à Saúde Mental',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
    creator: 'Leonardo Pedrosa Leite',
    images: ['/twitter-image.png'],
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: {
      me: ['leo.leitep@gmail.com'],
    },
  },
  alternates: {
    canonical: '/',
    languages: {
      'pt-BR': '/',
      'en-US': '/en',
    },
  },
  other: {
    'msapplication-TileColor': '#fbe5a8',
    'msapplication-TileImage': '/favicon/mstile-144x144.png',
    'msapplication-config': '/browserconfig.xml',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch user data if authenticated
  const userData = await getUserWithRolesAndPermissions();

  const authData = userData
    ? {
        user: userData.user,
        profile: userData.profile,
        roles: userData.roles,
        permissions: userData.permissions,
      }
    : null;

  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={cn(varelaRound.variable, inter.variable, 'scroll-smooth')}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />

        {/* PWA Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Okay" />
        <meta name="apple-mobile-web-app-title" content="Okay" />
        <meta name="msapplication-starturl" content="/" />

        {/* iOS Home Screen Icon — using PWA manifest icons as fallback */}
        <link rel="apple-touch-icon" href="/favicon/web-app-manifest-192x192.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/favicon/web-app-manifest-192x192.png" />

        {/* Favicon */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16x16.png" />
        <link rel="shortcut icon" href="/favicon/favicon.ico" />
      </head>
      <body className="gradient-background min-h-screen antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NetworkStatusProvider>
            <AuthProvider initialData={authData}>
              <OfflineBanner />
              <div className="dark:to-card/95 relative flex min-h-screen flex-col bg-linear-to-b from-transparent to-white/95">
                <Script
                  src="https://cdn.jsdelivr.net/npm/prismjs@1/components/prism-core.min.js"
                  strategy="afterInteractive"
                />
                <Script
                  src="https://cdn.jsdelivr.net/npm/prismjs@1/plugins/autoloader/prism-autoloader.min.js"
                  strategy="afterInteractive"
                />
                <Header />
                <main className="flex-1">{children}</main>
                <Footer />
                {/* Only show incomplete profile dialog if user is authenticated */}
                {userData && <IncompleteProfileDialog />}
                {/* PWA Install Prompt */}
                <PWAInstaller />
              </div>
            </AuthProvider>
          </NetworkStatusProvider>
          {/* Toaster must be inside ThemeProvider — sonner calls useTheme() */}
          <Toaster
            position="top-right"
            richColors
            expand={false}
            closeButton
            toastOptions={{
              duration: 5000,
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
