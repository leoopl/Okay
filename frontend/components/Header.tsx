'use client';

import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import {
  BookHeart,
  CircleUser,
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
import { useAuth } from '@/providers/auth-provider';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { getProfilePictureUrl, getUserInitials } from '@/lib/utils';

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
    name: 'Journal',
    description: 'Personal reflections and thoughts',
    icon: BookHeart,
    href: '/journal',
  },
  {
    name: 'Inventory',
    description: 'Psychological assessments',
    icon: NotebookPen,
    href: '/inventory',
  },
  {
    name: 'Medications',
    description: 'Medication tracking and reminders',
    icon: Pill,
    href: '/medication',
  },
  {
    name: 'Settings',
    description: 'Account and app preferences',
    icon: Settings,
    href: '/profile',
  },
];

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    setIsMobileMenuOpen(false); // Close menu on logout
    logout();
  };

  return (
    <header className="shadow-soft-xs">
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
              className="hover:text-yellow-dark font-varela text-lg text-gray-900 transition-colors"
            >
              {page.name}
            </Link>
          ))}
        </div>
        <div className="hidden lg:flex lg:items-center">
          {user ? (
            <UserButton />
          ) : (
            <Link
              href="/signin"
              className="hover:text-yellow-dark font-varela text-lg font-semibold text-gray-900"
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
                className="inline-flex items-center justify-center rounded-md bg-transparent p-2 text-gray-700 focus:ring-2 focus:outline-none focus:ring-inset"
                aria-label="Open main menu"
              >
                <Menu className="size-6 cursor-pointer" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-white p-4">
              <SheetTitle>
                <Link
                  href="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center"
                >
                  <Logo />
                </Link>
              </SheetTitle>

              {user ? (
                <div className="mt-7 flex items-center gap-3">
                  <Avatar className="ring-beige-medium/30 size-10 ring-2">
                    <AvatarImage
                      src={user ? getProfilePictureUrl(user) : undefined}
                      alt={user?.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="from-yellow-light to-yellow-dark bg-gradient-to-br text-sm font-medium text-white">
                      {user ? getUserInitials(user) : <CircleUser />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-black">{user?.name}</span>
                    <span className="text-grey-dark text-xs">{user?.email}</span>
                  </div>
                </div>
              ) : null}

              <Separator className="bg-grey-medium my-4" />

              <nav className="flex flex-col space-y-1">
                {' '}
                {pages.map((page) => (
                  <Link
                    key={page.name}
                    href={page.href}
                    className="hover:bg-yellow-dark/40 flex gap-2 rounded-md px-3 py-2 text-base font-medium text-black"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span>
                      <page.icon className="text-green-dark mt-1 size-4" />
                    </span>
                    {page.name}
                  </Link>
                ))}
                <Separator className="bg-grey-medium my-4" />
                {user ? (
                  <>
                    {' '}
                    {userPages.map((page) => (
                      <Link
                        key={page.name}
                        href={page.href}
                        className="hover:bg-yellow-dark/40 flex gap-2 rounded-md px-3 py-2 text-base font-medium text-gray-900"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <span>
                          <page.icon className="text-green-dark mt-1 size-4" />
                        </span>
                        {page.name}
                      </Link>
                    ))}
                    <Separator className="bg-grey-medium my-4" />
                    <Button
                      variant="ghost"
                      className="hover:bg-destructive/40 w-full cursor-pointer rounded-md px-3 py-2 text-left text-base font-medium text-red-600 transition-colors duration-150"
                      onClick={handleLogout}
                    >
                      Sair
                      <span>
                        <LogOut className="size-4" />
                      </span>
                    </Button>
                  </>
                ) : (
                  <Link
                    href="/signin"
                    className="hover:bg-yellow-dark/40 block rounded-md px-3 py-2 text-base font-medium text-gray-900"
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
