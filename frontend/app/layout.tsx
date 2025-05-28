// frontend/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Varela_Round } from 'next/font/google';
import Headers from '../components/header';
import Footer from '@/components/footer';
import AuthProvider from '@/providers/auth-provider';
import { getServerSession, logout } from '../lib/actions/server-auth';
import SessionProvider from '@/providers/session-provider';
import { ProfileCompletionProvider } from '@/providers/profile-completion-provider';
import { cn } from '@/lib/utils';

const varelaRound = Varela_Round({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-varela-round',
  weight: '400',
  preload: true,
  fallback: ['system-ui', 'arial'],
});

const APP_NAME = 'Okay';
const APP_DEFAULT_TITLE = 'Okay - Sua Jornada de Bem-Estar Mental';
const APP_TITLE_TEMPLATE = '%s | Okay';
const APP_DESCRIPTION =
  'Plataforma completa para cuidado da saúde mental, oferecendo questionários validados cientificamente, recursos educativos e acompanhamento personalizado.';

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
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
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
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

export const viewport: Viewport = {
  themeColor: '#fbe5a8',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getServerSession();
  let isAuth = false;
  if (user) {
    isAuth = true;
  }

  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={cn(varelaRound.variable, 'scroll-smooth', 'focus-within:scroll-auto')}
    >
      <link rel="manifest" href="/manifest.json" />
      <head />
      <body className={`gradient-background min-h-screen antialiased`}>
        <AuthProvider initialUser={user} isAuthenticated={isAuth} logoutFunction={logout}>
          {isAuth ? (
            <SessionProvider>
              <ProfileCompletionProvider>
                <Headers />
                {children}
                <Footer />
              </ProfileCompletionProvider>
            </SessionProvider>
          ) : (
            <>
              <Headers />
              {children}
              <Footer />
            </>
          )}
        </AuthProvider>
      </body>
    </html>
  );
}
