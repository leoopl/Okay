import Image from 'next/image';
import Link from 'next/link';

function randomInt(max: number) {
  return Math.floor(Math.random() * max);
}

const NotFound: React.FC = () => {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="grid gap-8 md:grid-cols-2 md:items-center">
        <div className="text-center">
          <p className="font-varela mb-3 text-base leading-7 font-bold text-gray-900">
            Algo inesperado aconteceu, não achamos a página desejada!
          </p>
          <Link
            href="/"
            className="small-caps bg-green-dark hover:bg-green-medium focus:ring-green-dark inline-flex justify-center rounded-md px-4 py-2 text-sm font-semibold text-black shadow-sm focus:ring-2 focus:ring-offset-2 focus:outline-none"
          >
            Vamos voltar e tentar de novo?
          </Link>
        </div>
        <div className="flex justify-center">
          <Image
            width={500}
            height={500}
            alt="404"
            src={`/404_error_${randomInt(4)}.svg`}
            className="object-contain"
            priority
          />
        </div>
      </div>
    </div>
  );
};

export default NotFound;
