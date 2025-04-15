'use client';

import { Sheet, SheetContent, SheetClose, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import logo from '../public/logo.png';
import UserButton from './user-button';
import Logo from './Logo';
import { useAuth } from '@/providers/auth-provider';

interface Page {
  name: string;
  description: string;
  href: string;
}

const pages: Page[] = [
  {
    name: 'Recursos e informações',
    description: 'Conheça o seu inimigo e como combatê-lo',
    href: '/blog',
  },
  {
    name: 'Técnica de respiração',
    description: 'Acalme a alma e o coração',
    href: '/breathing',
  },
  {
    name: 'Ajuda profissional',
    description: 'Pedir ajuda não é sinal de fraqueza',
    href: '/professional',
  },
  {
    name: 'Chat de suporte',
    description: 'Converse com um voluntário',
    href: '/chatcvv',
  },
  {
    name: 'Como está se sentindo?',
    description: 'Avalie seu estado emocional',
    href: '/questionnaire/beck',
  },
];

const Header: React.FC = () => {
  const { user } = useAuth();
  console.log(user);
  return (
    <header className="shadow-soft-xs">
      <nav
        aria-label="Global"
        className="mx-auto flex max-w-full items-center justify-between p-4 sm:px-6 lg:px-8"
      >
        <div className="flex items-center">
          <Link href="/" passHref legacyBehavior>
            <a className="flex items-center">
              <Logo size="lg" />
            </a>
          </Link>
        </div>

        {/* Desktop Menu */}
        <div className="hidden lg:flex lg:space-x-8 lg:text-center">
          {pages.map((page) => (
            <Link
              key={page.name}
              href={page.href}
              className="hover:text-yellow-dark text-lg font-semibold text-gray-900 transition-colors"
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
              className="hover:text-yellow-dark text-lg font-semibold text-gray-900"
            >
              Login
            </Link>
          )}
        </div>
        {/* <div className="flex items-center"> */}
        <div className="flex lg:hidden">
          {/* Mobile Menu Button */}
          <Sheet>
            <SheetTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md p-2 text-gray-700 focus:ring-2 focus:outline-none focus:ring-inset"
                aria-label="Open main menu"
              >
                <Menu className="size-6" aria-hidden="true" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-yellow-light/90 p-4">
              <SheetTitle>
                <Link href="/" className="flex items-center">
                  <Image src={logo} alt="Okay" width={15} height={15} />
                  <span className="font-varela ml-4 text-2xl font-bold text-gray-900">Okay!</span>
                </Link>
              </SheetTitle>
              <div className="flex items-center justify-between">
                <SheetClose
                  asChild
                  className="focus:bg-yellow-dark/40 rounded-md p-2 text-black focus:ring-2 focus:outline-none focus:ring-inset"
                />
              </div>
              <div className="mt-6 space-y-2">
                {pages.map((page) => (
                  <Link
                    key={page.name}
                    href={page.href}
                    className="hover:bg-yellow-dark/40 block rounded-md px-3 py-2 text-base font-medium text-gray-900"
                  >
                    {page.name}
                  </Link>
                ))}
                {user ? (
                  <></>
                ) : (
                  <Link
                    href="/signin"
                    className="hover:bg-yellow-dark/40 block rounded-md px-3 py-2 text-base font-medium text-gray-900"
                  >
                    Login
                  </Link>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
        {/* <UserButton />
        </div> */}
      </nav>
    </header>
  );
};

export default Header;
