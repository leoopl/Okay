import Image from 'next/image';
import Link from 'next/link';

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="grid gap-8 md:grid-cols-2 md:items-center">
        <div className="text-center">
          <h1 className="font-varela text-accent-strong mb-4 text-3xl font-bold">
            Você está offline
          </h1>
          <p className="text-muted-foreground mb-6">
            Parece que você perdeu a conexão com a internet. Algumas funcionalidades podem estar
            limitadas até que você se reconecte.
          </p>
          <p className="text-muted-foreground text-sm">
            Os conteúdos que você já visitou ainda estão disponíveis.
          </p>
          <Link
            href="/"
            className="small-caps bg-primary text-primary-foreground mt-6 inline-flex rounded-md px-4 py-2 font-semibold shadow-sm"
          >
            Voltar para a página inicial
          </Link>
        </div>
        <div className="flex justify-center">
          <Image
            width={400}
            height={400}
            alt="Offline"
            src="/offline.svg" // need to add this image
            className="object-contain"
            priority
          />
        </div>
      </div>
    </div>
  );
}
