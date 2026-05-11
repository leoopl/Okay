import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ProfessionalNotFound() {
  return (
    <div className="container mx-auto flex max-w-5xl flex-col items-center justify-center px-4 py-16 text-center">
      <div className="bg-muted/30 mb-6 rounded-full p-6">
        <Image
          src="/placeholder.svg?height=120&width=120&text=Não+encontrado"
          alt="Profissional não encontrado"
          width={96}
          height={96}
          className="h-24 w-24 opacity-70"
        />
      </div>

      <h1 className="font-varela mb-2 text-3xl">
        Profissional não encontrado
      </h1>

      <p className="text-muted-foreground mb-8 max-w-md">
        O profissional que você está procurando não foi encontrado ou pode ter sido removido.
      </p>

      <Link href="/professional">
        <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
          Voltar para a lista de profissionais
        </Button>
      </Link>
    </div>
  );
}
