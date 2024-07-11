import Image from "next/image";
import Link from "next/link";

function randomInt(max: number) {
  return Math.floor(Math.random() * max);
}

export default function NotFound() {
  return (
    <main className="grid min-h-full place-items-center px-6 py-24 sm:py-32 lg:px-8">
      <div className="text-center">
        <Image
          width={550}
          height={440}
          alt="404"
          src={`/404_error_${randomInt(4)}.svg`}
        />
        <p className="mt-6 text-base font-bold leading-7 text-gray-900">
          Algo inesperado aconteceu, não achamos a página desejada!
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link
            href="/"
            className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Vamos voltar e tentar de novo?
          </Link>
        </div>
      </div>
    </main>
  );
}
