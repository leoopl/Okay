import Link from 'next/link';
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
    <footer id="footer" className="bg-border/30 mt-auto">
      <hr className="border-border/40 mx-auto w-11/12" />

      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        {/* Main Content - Logo/Description and Emergency side by side */}
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Logo and Description */}
          <div className="space-y-8">
            <div>
              <Logo size="xl" />
            </div>

            <p className="text-muted-foreground font-varela text-base leading-relaxed font-bold lg:text-lg lg:leading-relaxed">
              Suporte para sua jornada de saúde mental com recursos, ferramentas e orientação.
            </p>
          </div>

          {/* Emergency Contact - Enhanced visibility and accessibility */}
          <div className="flex h-fit">
            <div className="border-crisis/30 from-crisis/15 to-crisis-bg/10 w-full rounded-xl border-2 bg-linear-to-br p-6 shadow-lg backdrop-blur-sm">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="bg-crisis text-crisis-foreground flex h-10 w-10 items-center justify-center rounded-full">
                    <Phone className="h-5 w-5" aria-hidden="true" />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-crisis mb-2 text-lg font-semibold">🚨 Emergência?</h3>

                  <p className="text-crisis/90 mb-3 text-sm leading-relaxed">
                    Se você está em crise, vá para a emergência mais próxima ou ligue para:
                  </p>

                  <a
                    href="tel:188"
                    className="border-crisis text-crisis hover:bg-crisis/20 focus:ring-crisis inline-flex items-center justify-center rounded-lg border px-4 py-3 text-3xl font-bold transition-all duration-200 hover:scale-105 focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:outline-none"
                    aria-label="Ligar para o número de emergência 188"
                  >
                    📞 188
                  </a>

                  <p className="text-crisis/80 mt-2 text-xs">
                    Centro de Valorização da Vida - 24h gratuito
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Copyright, Social Links, Legal Links, Attribution */}
        <div className="border-border/50 mt-12 border-t pt-8">
          <div className="flex flex-col space-y-6">
            {/* Copyright and Social Links */}
            <div className="flex flex-col items-center justify-between space-y-4 sm:flex-row sm:space-y-0">
              <p className="text-muted-foreground text-sm">
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
                      className="group text-muted-foreground hover:bg-muted/20 hover:text-muted-foreground focus:ring-ring/30 rounded-lg p-2.5 transition-all duration-200 focus:ring-2 focus:outline-none"
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
                className="text-muted-foreground hover:text-muted-foreground focus:ring-ring/30 underline-offset-4 transition-colors duration-200 hover:underline focus:rounded focus:ring-2 focus:outline-none"
              >
                Política de Privacidade
              </Link>
              <span className="text-muted-foreground" aria-hidden="true">
                •
              </span>
              <Link
                href="/terms-of-service"
                className="text-muted-foreground hover:text-muted-foreground focus:ring-ring/30 underline-offset-4 transition-colors duration-200 hover:underline focus:rounded focus:ring-2 focus:outline-none"
              >
                Termos de Uso
              </Link>
            </div>

            {/* Creator Attribution */}
            <div className="text-center">
              <p className="text-muted-foreground text-xs">
                Desenvolvido com{' '}
                <span className="text-crisis animate-pulse" aria-label="amor">
                  ❤️
                </span>{' '}
                por{' '}
                <Link
                  href="https://www.linkedin.com/in/leopl/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-muted-foreground focus:ring-ring/30 underline-offset-2 transition-colors duration-200 hover:underline focus:rounded focus:ring-2 focus:outline-none"
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
