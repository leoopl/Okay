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
          <p className="mb-3 font-varela text-base font-bold leading-7 text-gray-900">
            Algo inesperado aconteceu, não achamos a página desejada!
          </p>
          <Link
            href="/"
            className="small-caps inline-flex justify-center rounded-md bg-greenDark px-4 py-2 text-sm font-semibold text-black shadow-sm hover:bg-greenMedium focus:outline-none focus:ring-2 focus:ring-greenDark focus:ring-offset-2"
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
