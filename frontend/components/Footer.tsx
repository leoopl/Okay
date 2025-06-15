import Link from 'next/link';
import Image from 'next/image';
import githubicon from '../public/github.svg';
import Logo from './common/Logo';
import { Github, Linkedin } from 'lucide-react';

interface SocialLink {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

/**
 * Social media links
 */
export const socialLinks: SocialLink[] = [
  {
    name: 'GitHub',
    href: 'https://github.com/leoopl/Okay',
    icon: Github,
  },
  {
    name: 'LinkedIn',
    href: 'https://www.linkedin.com/in/leopl/',
    icon: Linkedin,
  },
];

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer id="footer" className="from-grey-light to-grey-medium mt-auto bg-gradient-to-br">
      <hr className="mx-auto w-11/12" />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5 lg:gap-12">
          {/* <div className="flex flex-col items-center justify-center gap-x-5 gap-y-1 sm:flex-row"> */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <Logo size="lg" />
            </div>

            <p className="mb-6 text-sm leading-relaxed text-slate-300 lg:text-base">
              Dedicado a apoiar a saúde mental e o bem-estar através de recursos acessíveis e
              baseados em evidências.
            </p>

            {/* Emergency Contact - Enhanced visibility */}
            <div className="rounded-lg border border-red-200/20 bg-red-50/10 p-4">
              <p className="text-sm font-medium text-red-100">
                <span className="font-semibold text-red-200">🚨 Emergência?</span>
              </p>
              <p className="mt-1 text-sm text-red-100">
                Se você está em crise, ligue para{' '}
                <a
                  href="tel:188"
                  className="font-semibold text-red-200 underline decoration-2 underline-offset-2 transition-colors duration-200 hover:text-red-100"
                >
                  188
                </a>{' '}
                ou vá para a emergência mais próxima.
              </p>
            </div>
          </div>
          <div className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
            <div className="border-t border-slate-700 pt-8">
              <div className="flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0">
                {/* Copyright */}
                <p className="text-sm text-slate-400">
                  © {currentYear} Okay? Todos os direitos reservados
                </p>

                {/* Social Links */}
                <div className="order-first md:order-none">
                  <div className="flex items-center space-x-4">
                    {socialLinks.map((social) => {
                      const IconComponent = social.icon;
                      return (
                        <Link
                          key={social.name}
                          href={social.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group rounded-lg p-2 text-slate-400 transition-all duration-200 hover:bg-white/10 hover:text-white"
                          aria-label={`Follow us on ${social.name}`}
                        >
                          <IconComponent
                            className="h-5 w-5 transition-transform duration-200 group-hover:scale-110"
                            aria-hidden="true"
                          />
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Legal Links */}
                <div className="flex flex-wrap items-center justify-center space-x-4 text-sm md:justify-end">
                  <Link
                    href="/privacy-policy"
                    className="text-slate-400 transition-colors duration-200 hover:text-white"
                  >
                    Política de Privacidade
                  </Link>
                  <span className="text-slate-600">•</span>
                  <Link
                    href="/terms-of-service"
                    className="text-slate-400 transition-colors duration-200 hover:text-white"
                  >
                    Termos de Uso
                  </Link>
                </div>
              </div>

              {/* Creator Attribution */}
              <div className="mt-4 text-center text-xs text-slate-500">
                <p>
                  Desenvolvido com ❤️ por{' '}
                  <Link
                    href="https://www.linkedin.com/in/leopl/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-400 transition-colors duration-200 hover:text-white"
                  >
                    Leonardo Leite
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
