import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ProfessionalNotFound() {
  return (
    <div className="container mx-auto flex max-w-5xl flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-6 rounded-full bg-[#F2DECC]/30 p-6">
        <img
          src="/placeholder.svg?height=120&width=120&text=Não+encontrado"
          alt="Profissional não encontrado"
          className="h-24 w-24 opacity-70"
        />
      </div>

      <h1 className="font-varela mb-2 text-3xl font-bold text-[#039BE5]">
        Profissional não encontrado
      </h1>

      <p className="mb-8 max-w-md text-[#797D89]">
        O profissional que você está procurando não foi encontrado ou pode ter sido removido.
      </p>

      <Link href="/professional">
        <Button className="bg-[#039BE5] text-white hover:bg-[#78C7EE]">
          Voltar para a lista de profissionais
        </Button>
      </Link>
    </div>
  );
}
