import Image from 'next/image';
import tree from '../../public/tree.png';

const Lol: React.FC = () => (
  <div className="w-full p-20 lg:py-40">
    <div className="container mx-auto">
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <h1 className="max-w-lg text-left font-varela text-5xl tracking-tighter md:text-7xl">
            Okay!
          </h1>
          <p className="max-w-md text-left text-xl leading-relaxed tracking-tight text-muted-foreground">
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
  </div>
);
export default Lol;