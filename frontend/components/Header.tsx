'use client';

import { useState } from 'react';
import { Dialog, DialogPanel } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="inline-flex items-center justify-center rounded-md p-2 text-gray-700 focus:bg-yellowDark/40 focus:outline-none focus:ring-2 focus:ring-inset"
            aria-label="Open main menu"
          >
            <Bars3Icon className="size-6" aria-hidden="true" />
          </button>
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

      {/* Mobile Menu */}
      <Dialog as="div" className="lg:hidden" open={mobileMenuOpen} onClose={setMobileMenuOpen}>
        <div className="fixed inset-0 z-40 bg-black opacity-25" />
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <DialogPanel className="w-full max-w-xs bg-yellowLight p-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center">
                <Image src={logo} alt="Okay" width={15} height={15} />
                <span className="ml-4 font-varela text-2xl font-bold text-gray-900">Okay!</span>
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md p-2 text-gray-700 focus:bg-yellowDark/40 focus:outline-none focus:ring-2 focus:ring-inset"
                aria-label="Close menu"
              >
                <XMarkIcon className="size-6" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-6 space-y-2">
              {pages.map((page) => (
                <Link
                  key={page.name}
                  href={page.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-md px-3 py-2 text-base font-medium text-gray-900 hover:bg-yellowDark/40"
                >
                  {page.name}
                </Link>
              ))}
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-md px-3 py-2 text-base font-medium text-gray-900 hover:bg-yellowDark/40"
              >
                Log in
              </Link>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </header>
  );
};

export default Header;
