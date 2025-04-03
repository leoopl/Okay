import React from 'react';
import Link from 'next/link';
import Logo from './Logo';

const Footer: React.FC = () => {
  const footerLinks = {
    resources: [
      { name: 'Artigos', path: '/articles' },
      { name: 'Vídeos', path: '/videos' },
      { name: 'Podcasts', path: '/podcasts' },
      { name: 'Infográficos', path: '/infographics' },
    ],
    tools: [
      { name: 'Autoavaliações', path: '/assessments' },
      { name: 'Rastreador de Humor', path: '/mood-tracking' },
      { name: 'Diário', path: '/journal' },
      { name: 'Rastreador de Medicamentos', path: '/medication' },
    ],
    support: [
      { name: 'Ajuda Profissional', path: '/professionals' },
      { name: 'Comunidade', path: '/community' },
      { name: 'Chat de Suporte', path: '/chat' },
      { name: 'Linha de Crise', path: '/crisis' },
    ],
    about: [
      { name: 'Nossa Missão', path: '/mission' },
      { name: 'Equipe', path: '/team' },
      { name: 'Contato', path: '/contact' },
      { name: 'Blog', path: '/blog' },
    ],
  };

  return (
    <footer className="bg-white pt-12 pb-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-5">
          {/* Logo and Mission */}
          <div className="md:col-span-2">
            <Logo size="lg" />
            <p className="text-okay-grey-medium mt-4">
              Dedicado a apoiar a saúde mental e o bem-estar através de recursos acessíveis e
              baseados em evidências.
            </p>
            <p className="text-okay-grey-medium mt-4">
              <strong>Emergência?</strong> Se você está em crise, ligue para{' '}
              <a href="tel:188" className="text-okay-blue-dark hover:underline">
                188
              </a>{' '}
              ou vá para a emergência mais próxima.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-okay-grey-dark mb-4 font-semibold">Recursos</h3>
            <ul className="space-y-2">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.path}
                    className="text-okay-grey-medium hover:text-okay-blue-dark transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-okay-grey-dark mb-4 font-semibold">Ferramentas</h3>
            <ul className="space-y-2">
              {footerLinks.tools.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.path}
                    className="text-okay-grey-medium hover:text-okay-blue-dark transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-okay-grey-dark mb-4 font-semibold">Suporte</h3>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.path}
                    className="text-okay-grey-medium hover:text-okay-blue-dark transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright and Legal */}
        <div className="border-okay-grey-light border-t pt-6">
          <div className="flex flex-col items-center justify-between md:flex-row">
            <p className="text-okay-grey-medium text-sm">
              © {new Date().getFullYear()} Okay. Todos os direitos reservados.
            </p>
            <div className="mt-4 flex space-x-4 md:mt-0">
              <Link
                href={'/privacy-policy'}
                className="text-okay-grey-medium hover:text-okay-blue-dark text-sm transition-colors"
              >
                Política de Privacidade
              </Link>
              <Link
                href={'/terms-of-service'}
                className="text-okay-grey-medium hover:text-okay-blue-dark text-sm transition-colors"
              >
                Termos de Uso
              </Link>
              <Link
                href={'/accessibility'}
                className="text-okay-grey-medium hover:text-okay-blue-dark text-sm transition-colors"
              >
                Acessibilidade
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
