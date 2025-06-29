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
import { IncompleteProfileDialog } from '@/components/profile/incomplete-profile-dialog';

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
  'Plataforma completa para cuidado da saúde mental, oferecendo questionários validados cientificamente, recursos educativos e acompanhamento personalizado.';

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
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: APP_DEFAULT_TITLE,
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: APP_NAME,
    title: APP_DEFAULT_TITLE,
    description: APP_DESCRIPTION,
    locale: 'pt_BR',
  },
  twitter: {
    card: 'summary',
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
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
      <meta name="apple-mobile-web-app-title" content="Okay" />
      <link rel="manifest" href="/manifest.json" />
      <head />
      <body className="gradient-background min-h-screen antialiased">
        <AuthProvider initialData={authData}>
          <div className="relative flex min-h-screen flex-col bg-gradient-to-b from-transparent to-white/95">
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
          </div>
        </AuthProvider>
        <Toaster
          position="top-right"
          richColors
          expand={false}
          closeButton
          toastOptions={{
            duration: 5000,
          }}
        />
      </body>
    </html>
  );
}
