import Image from 'next/image';
import type { NextPage } from 'next';
import tree from '../public/tree.png';

const Home: NextPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="grid gap-8 md:grid-cols-2 md:items-center">
        <div>
          <p className="max-w-xl font-varela text-lg text-gray-800">
            Bem-vindo ao Okay?, um lugar onde você pode encontrar o apoio e a orientação de que
            precisa para administrar seus problemas. Entendemos que lidar com essas condições pode
            ser desafiador, mas você não precisa passar por isso sozinho. Nosso site oferece uma
            variedade de recursos e ferramentas, incluindo ferramentas de autoavaliação, estratégias
            de enfrentamento e opções de ajuda profissional, para ajudá-lo a assumir o controle de
            sua saúde mental. Estamos aqui para apoiá-lo em sua jornada e esperamos que considere
            úteis as informações e os recursos em nosso site. Lembre-se de que não há problema em
            pedir ajuda e você merece se sentir melhor. Okay?
          </p>
        </div>
        <div className="flex justify-center">
          <Image
            src={tree}
            alt="brain tree"
            width={500}
            height={500}
            className="object-contain"
            priority
          />
        </div>
      </div>
    </div>
  );
};

export default Home;
