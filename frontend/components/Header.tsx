'use client';

import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import {
  BookHeart,
  Library,
  LogOut,
  LucideIcon,
  Menu,
  MessageSquareHeart,
  NotebookPen,
  Pill,
  Settings,
  UserSearch,
  Wind,
} from 'lucide-react';
import Link from 'next/link';
import UserButton from './user-button';
import Logo from './common/Logo';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ThemeToggle } from './theme-toggle';
import { getUserInitials } from '@/lib/utils';
import { useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { useMobile } from '@/hooks/use-mobile';

interface Page {
  name: string;
  description: string;
  icon: LucideIcon;
  href: string;
}

const pages: Page[] = [
  {
    name: 'Recursos e informações',
    description: 'Conheça o seu inimigo e como combatê-lo',
    icon: Library,
    href: '/blog',
  },
  {
    name: 'Técnica de respiração',
    description: 'Acalme a alma e o coração',
    icon: Wind,
    href: '/breathing',
  },
  {
    name: 'Ajuda profissional',
    description: 'Pedir ajuda não é sinal de fraqueza',
    icon: UserSearch,
    href: '/professional',
  },
  {
    name: 'Chat de suporte',
    description: 'Converse com um voluntário',
    icon: MessageSquareHeart,
    href: '/support/cvv',
  },
];

const userPages: Page[] = [
  {
    name: 'Diário',
    description: 'Reflexões pessoais e pensamentos',
    icon: BookHeart,
    href: '/journal',
  },
  {
    name: 'Inventário',
    description: 'Avaliações psicológicas',
    icon: NotebookPen,
    href: '/inventory',
  },
  {
    name: 'Medicamentos',
    description: 'Acompanhamento de medicamentos e lembretes',
    icon: Pill,
    href: '/medication',
  },
  {
    name: 'Configurações',
    description: 'Preferências da conta e do aplicativo',
    icon: Settings,
    href: '/profile',
  },
];

const Header: React.FC = () => {
  const { user, profile, signOut, isLoggingOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isMobile = useMobile();

  const handleLogout = async () => {
    setIsMobileMenuOpen(false);
    await signOut();
  };

  return (
    <header
      className={`shadow-soft-xs ${isMobile ? 'bg-background/50 sticky top-0 z-50 backdrop-blur-sm' : ''}`}
    >
      <nav
        aria-label="Global"
        className="mx-auto flex max-w-full items-center justify-between p-4 sm:px-6 lg:px-8"
      >
        <div className="flex items-center">
          <Link href="/" passHref>
            <Logo size="lg" />
          </Link>
        </div>

        {/* Desktop Menu */}
        <div className="hidden lg:flex lg:space-x-8 lg:text-center">
          {pages.map((page) => (
            <Link
              key={page.name}
              href={page.href}
              className="hover:text-primary font-varela text-foreground text-lg transition-colors"
            >
              {page.name}
            </Link>
          ))}
        </div>
        <div className="hidden lg:flex lg:items-center lg:gap-2">
          <ThemeToggle />
          {user ? (
            <UserButton />
          ) : (
            <Link
              href="/signin"
              className="hover:text-primary font-varela text-foreground text-lg font-semibold"
            >
              Login
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex lg:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                className="text-muted-foreground inline-flex items-center justify-center rounded-md bg-transparent p-2 focus:ring-2 focus:outline-none focus:ring-inset"
                aria-label="Abrir menu principal"
              >
                <Menu className="size-6 cursor-pointer" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-background p-4">
              <SheetTitle>
                <Link
                  href="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center"
                >
                  <Logo />
                </Link>
              </SheetTitle>

              {user && profile ? (
                <div className="mt-7 flex items-center gap-3">
                  <Avatar className="ring-border/30 size-10 ring-2">
                    <AvatarImage
                      src={profile?.profilePictureUrl ?? undefined}
                      alt={profile.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="from-primary/30 to-primary text-primary-foreground bg-linear-to-br text-sm font-medium">
                      {getUserInitials(profile as any)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-foreground text-sm font-medium">{profile.name}</span>
                    <span className="text-muted-foreground text-xs">{profile.email}</span>
                  </div>
                </div>
              ) : null}

              <div className="mt-4 flex items-center justify-between">
                <ThemeToggle />
              </div>

              <Separator className="bg-border my-4" />

              <nav className="flex flex-col space-y-1">
                {pages.map((page) => (
                  <Link
                    key={page.name}
                    href={page.href}
                    className="hover:bg-primary/40 text-foreground flex gap-2 rounded-md px-3 py-2 text-base font-medium"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span>
                      <page.icon className="text-accent-strong mt-1 size-4" />
                    </span>
                    {page.name}
                  </Link>
                ))}
                <Separator className="bg-border my-4" />
                {user ? (
                  <>
                    {userPages.map((page) => (
                      <Link
                        key={page.name}
                        href={page.href}
                        className="hover:bg-primary/40 text-foreground flex gap-2 rounded-md px-3 py-2 text-base font-medium"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <span>
                          <page.icon className="text-accent-strong mt-1 size-4" />
                        </span>
                        {page.name}
                      </Link>
                    ))}
                    <Separator className="bg-border my-4" />
                    <Button
                      variant="ghost"
                      className="hover:bg-destructive/40 text-destructive w-full cursor-pointer rounded-md px-3 py-2 text-left text-base font-medium transition-colors duration-150"
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                    >
                      {isLoggingOut ? 'Saindo...' : 'Sair'}
                      <span>
                        <LogOut className="size-4" />
                      </span>
                    </Button>
                  </>
                ) : (
                  <Link
                    href="/signin"
                    className="hover:bg-primary/40 text-foreground block rounded-md px-3 py-2 text-base font-medium"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
};

export default Header;
