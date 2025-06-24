import Link from 'next/link';
import Image from 'next/image';
import githubicon from '../public/github.svg';
import Logo from './common/Logo';
import { Github, Linkedin, Phone } from 'lucide-react';

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
      <hr className="mx-auto w-11/12 border-slate-600/30" />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        {/* Main Content - Logo/Description and Emergency side by side */}
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Logo and Description */}
          <div className="space-y-6">
            <div>
              <Logo size="xl" />
            </div>

            <p className="text-base leading-relaxed text-slate-300 lg:text-lg lg:leading-relaxed">
              Dedicado a apoiar a saúde mental e o bem-estar através de recursos acessíveis e
              baseados em evidências.
            </p>
          </div>

          {/* Emergency Contact - Enhanced visibility and accessibility */}
          <div className="flex h-fit">
            <div className="w-full rounded-xl border-2 border-red-300/30 bg-gradient-to-br from-red-50/15 to-red-100/10 p-6 shadow-lg backdrop-blur-sm">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20 text-red-200">
                    <Phone className="h-5 w-5" aria-hidden="true" />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="mb-2 text-lg font-semibold text-red-100">🚨 Emergência?</h3>

                  <p className="mb-3 text-sm leading-relaxed text-red-100/90">
                    Se você está em crise, vá para a emergência mais próxima ou ligue para:
                  </p>

                  <a
                    href="tel:188"
                    className="inline-flex items-center justify-center rounded-lg bg-red-500/20 px-4 py-3 text-3xl font-bold text-red-200 transition-all duration-200 hover:scale-105 hover:bg-red-500/30 hover:text-red-100 focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-transparent focus:outline-none"
                    aria-label="Ligar para o número de emergência 188"
                  >
                    📞 188
                  </a>

                  <p className="mt-2 text-xs text-red-200/80">
                    Centro de Valorização da Vida - 24h gratuito
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Copyright, Social Links, Legal Links, Attribution */}
        <div className="mt-12 border-t border-slate-600/30 pt-8">
          <div className="flex flex-col space-y-6">
            {/* Copyright and Social Links */}
            <div className="flex flex-col items-center justify-between space-y-4 sm:flex-row sm:space-y-0">
              <p className="text-sm text-slate-400">
                © {currentYear} Okay? Todos os direitos reservados
              </p>

              {/* Social Links with better spacing and hover effects */}
              <div className="flex items-center space-x-3">
                {socialLinks.map((social) => {
                  const IconComponent = social.icon;
                  return (
                    <Link
                      key={social.name}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group rounded-lg p-2.5 text-slate-400 transition-all duration-200 hover:bg-white/10 hover:text-white focus:ring-2 focus:ring-white/20 focus:outline-none"
                      aria-label={`Siga-nos no ${social.name}`}
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
            <div className="flex flex-wrap items-center justify-center space-x-6 text-sm">
              <Link
                href="/privacy-policy"
                className="text-slate-400 underline-offset-4 transition-colors duration-200 hover:text-white hover:underline focus:rounded focus:ring-2 focus:ring-white/20 focus:outline-none"
              >
                Política de Privacidade
              </Link>
              <span className="text-slate-600" aria-hidden="true">
                •
              </span>
              <Link
                href="/terms-of-service"
                className="text-slate-400 underline-offset-4 transition-colors duration-200 hover:text-white hover:underline focus:rounded focus:ring-2 focus:ring-white/20 focus:outline-none"
              >
                Termos de Uso
              </Link>
            </div>

            {/* Creator Attribution */}
            <div className="text-center">
              <p className="text-xs text-slate-500">
                Desenvolvido com{' '}
                <span className="animate-pulse text-red-400" aria-label="amor">
                  ❤️
                </span>{' '}
                por{' '}
                <Link
                  href="https://www.linkedin.com/in/leopl/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 underline-offset-2 transition-colors duration-200 hover:text-white hover:underline focus:rounded focus:ring-2 focus:ring-white/20 focus:outline-none"
                >
                  Leonardo Leite
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
