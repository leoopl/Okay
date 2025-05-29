import Image from 'next/image';
import tree from '../public/tree.png';
import type { NextPage } from 'next';
import FeaturesSection from '@/components/home/features-section';
import Testimonials from '@/components/home/testimonials/testimonials-section';

const Home: NextPage = () => {
  return (
    <div className="flex min-h-screen flex-col p-10 lg:py-25">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
          <div className="animate-fade-in flex flex-col gap-8">
            <h1 className="font-varela text-green-dark text-3xl leading-tight font-bold md:text-4xl lg:text-5xl">
              Encontre o seu caminho para se sentir melhor
            </h1>
            <p className="font-varela text-lg text-gray-800 md:text-xl">
              Bem-vindo ao <span className="">Okay!</span> Um lugar onde você pode encontrar o apoio
              e a orientação de que precisa para administrar seus problemas. Entendemos que lidar
              com essas condições pode ser desafiador, mas você não precisa passar por isso sozinho.
              Nosso site oferece uma variedade de recursos e ferramentas, incluindo ferramentas de
              autoavaliação, estratégias de enfrentamento e opções de ajuda profissional, para
              ajudá-lo a assumir o controle de sua saúde mental. Estamos aqui para apoiá-lo em sua
              jornada e esperamos que considere úteis as informações e os recursos em nosso site.
              Lembre-se de que não há problema em pedir ajuda e você merece se sentir melhor. Okay?
            </p>
          </div>
          <div className="animate-float relative h-[400px] md:h-[500px]">
            <Image
              src={tree}
              alt="Ancient tree shaped like a brain, symbolizing growth and resilience"
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        </div>
      </div>
      <FeaturesSection />
      <Testimonials />
    </div>
  );
};

export default Home;
