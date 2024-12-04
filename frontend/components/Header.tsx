'use client';

import { Sheet, SheetContent, SheetClose, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import logo from '../public/logo.png';

interface Page {
  name: string;
  description: string;
  href: string;
}

const pages: Page[] = [
  {
    name: 'Recursos e informações',
    description: 'Conheça o seu inimigo e como combatê-lo',
    href: '/information',
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
  return (
    <header className="bg-white shadow">
      <nav
        aria-label="Global"
        className="mx-auto flex max-w-full items-center justify-between bg-yellowLight/40 p-4 sm:px-6 lg:px-8"
      >
        <div className="flex items-center">
          <Link href="/" passHref legacyBehavior>
            <a className="flex items-center">
              <Image src={logo} alt="Okay" width={20} height={20} />
              <span className="ml-3 font-varela text-2xl font-bold text-yellowDark">Okay!</span>
            </a>
          </Link>
        </div>
        <div className="flex lg:hidden">
          {/* Mobile Menu Button */}
          <Sheet>
            <SheetTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md p-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-inset"
                aria-label="Open main menu"
              >
                <Menu className="size-6" aria-hidden="true" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-yellowLight p-4">
              <SheetTitle>
                <Link href="/" className="flex items-center">
                  <Image src={logo} alt="Okay" width={15} height={15} />
                  <span className="ml-4 font-varela text-2xl font-bold text-gray-900">Okay!</span>
                </Link>
              </SheetTitle>
              <div className="flex items-center justify-between">
                <SheetClose
                  asChild
                  className="rounded-md p-2 text-black focus:bg-yellowDark/40 focus:outline-none focus:ring-2 focus:ring-inset"
                />
              </div>
              <div className="mt-6 space-y-2">
                {pages.map((page) => (
                  <Link
                    key={page.name}
                    href={page.href}
                    className="block rounded-md px-3 py-2 text-base font-medium text-gray-900 hover:bg-yellowDark/40"
                  >
                    {page.name}
                  </Link>
                ))}
                <Link
                  href="/login"
                  className="block rounded-md px-3 py-2 text-base font-medium text-gray-900 hover:bg-yellowDark/40"
                >
                  Log in
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop Menu */}
        <div className="hidden lg:flex lg:space-x-8 lg:text-center">
          {pages.map((page) => (
            <Link
              key={page.name}
              href={page.href}
              className="text-lg font-semibold text-gray-900 hover:text-yellowDark"
            >
              {page.name}
            </Link>
          ))}
        </div>
        <div className="hidden lg:flex lg:items-center">
          <Link
            href="/signin"
            className="text-lg font-semibold text-gray-900 hover:text-yellowDark"
          >
            Login <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </nav>
    </header>
  );
};

export default Header;
