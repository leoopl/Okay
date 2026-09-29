import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Acesso negado',
  robots: { index: false },
};

export default function UnauthorizedPage() {
  return (
    <div className="container mx-auto px-4 py-20 text-center">
      <h1 className="mb-4 text-3xl font-bold">Acesso negado</h1>
      <p className="text-muted-foreground mb-8">Você não tem permissão para acessar esta área.</p>
      <Link
        href="/"
        className="small-caps bg-accent-strong hover:bg-accent-strong/80 focus:ring-accent-strong text-accent-strong-foreground inline-flex justify-center rounded-md px-4 py-2 text-sm font-semibold shadow-sm focus:ring-2 focus:ring-offset-2 focus:outline-none"
      >
        Voltar para o início
      </Link>
    </div>
  );
}
