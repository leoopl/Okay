import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, Heart, Info, MessageCircle, Phone } from 'lucide-react';
import Image from 'next/image';

export default function Cvv() {
  return (
    <main className="container mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-col items-center text-center">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
          <div className="animate-fade-in flex flex-col gap-8 text-center">
            <h1 className="font-varela text-green-dark text-3xl font-bold md:text-4xl">
              Centro de Valorização da Vida (CVV)
            </h1>
            <p className="text-beige-dark text-xl">Apoio emocional e prevenção do suicídio</p>
          </div>
          <div className="mb-4 flex items-center justify-center">
            <div className="relative size-60">
              <Image src="/cvv.png" alt="CVV Logo" fill className="object-contain" />
            </div>
          </div>
        </div>
        <div className="bg-yellow-dark mt-6 h-1 w-60 rounded-full"></div>
      </div>

      {/* Quem somos Card */}
      <section className="mt-12">
        <Card className="border-green-medium overflow-hidden transition-all duration-300 hover:shadow-md">
          <CardHeader className="border-green-medium border-b bg-[#D1DBC3]/30">
            <CardTitle className="font-varela text-green-dark flex items-center">
              <span className="mr-2">
                <Info className="text-green-dark size-6" />
              </span>
              Sobre o CVV
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="leading-relaxed">
              Formado exclusivamente por voluntários, o CVV oferece apoio emocional e prevenção do
              suicídio gratuitamente. Quem nos procura, normalmente está se sentido solitário ou
              precisa conversar de forma sigilosa, sem julgamentos, críticas ou comparações. Atuamos
              nacionalmente. Nosso atendimento é realizado pelo telefone 188 (24 horas por dia e sem
              custo de ligação), chat, e-mail e pessoalmente em alguns endereços. O CVV é uma
              entidade nacional fundada em 1962, financeira e ideologicamente independente. Sem viés
              religioso, político-partidário ou empresarial.
            </p>
            <div className="text-yellow-dark mt-6 flex place-self-center">
              <Heart className="size5 mr-2" />
              <span className="font-medium">Estamos aqui para ouvir, sem julgamentos.</span>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-12">
        <h2 className="text-green-dark font-varela mb-6 text-center text-2xl font-semibold">
          Como Podemos Ajudar
        </h2>

        <div className="mb-8">
          {/* Online Chat Section */}
          <Card className="shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <CardHeader className="bg-green-light/30 rounded-t-lg">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="bg-green-light text-grey-dark rounded-full p-3">
                    <MessageCircle className="size-6" />
                  </div>
                  <CardTitle className="text-green-dark text-xl">Chat Online</CardTitle>
                </div>
                <div>
                  <a
                    href="https://servidorseguro.mysuite1.com.br/empresas/cvw/verificaseguro.php"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full"
                  >
                    <Button className="w-full text-lg">
                      <MessageCircle className="mr-2 size-4" /> Iniciar Chat
                    </Button>
                  </a>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-6 pt-6 md:grid-cols-1 lg:grid-cols-2">
              <p className="mb-6 content-center">
                Converse gratuitamente com um dos nossos voluntários via chat, onde estiver.
                <br></br>
                <br></br>
                Aqui, como em qualquer outra forma de contato com o CVV, você é atendido por um
                voluntário, com respeito, anonimato, que guardará sigilo sobre tudo que for dito.
                Nossos voluntários são treinados para conversar com todas as pessoas que procuram
                ajuda e apoio emocional.
              </p>
              <div className="bg-green-light/20 mb-4 rounded-lg p-4 text-center">
                <p className="text-grey-dark">
                  <span className="mb-1 block font-semibold text-black">
                    Horário de atendimento:
                  </span>
                  Domingos: 15h às 01h <br></br> Segundas-feiras: 08h às 01h <br></br>{' '}
                  Terças-feiras: 08h às 01h <br></br> Quartas-feiras: 08h às 01h <br></br>{' '}
                  Quintas-feiras: 08h às 01h <br></br> Sextas-feiras: 13h às 01h <br></br> Sábados:
                  13h às 01h
                </p>
              </div>
            </CardContent>
            <CardFooter></CardFooter>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-1 lg:grid-cols-2">
          {/* Support Number Card */}
          <Card className="shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <CardHeader className="bg-blue-light/30 rounded-t-lg">
              <div className="flex items-center gap-3">
                <div className="bg-blue-light text-grey-dark rounded-full p-3">
                  <Phone className="size-6" />
                </div>
                <CardTitle className="text-blue-dark text-xl">Ligue 188</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="mb-6">
                Converse gratuitamente com um dos nossos voluntários, de qualquer lugar do Brasil,
                24 horas por dia.
              </p>
              <div className="bg-blue-light/20 mb-4 rounded-lg p-4 text-center">
                <span className="text-blue-dark block text-3xl font-bold">188</span>
                <span className="text-grey-dark">Ligação Gratuita</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full cursor-default">
                <Phone className="mr-2 h-4 w-4" /> Ligar Agora
              </Button>
            </CardFooter>
          </Card>

          {/* Website Link Card */}
          <Card className="shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <CardHeader className="bg-beige-light/30 rounded-t-lg">
              <div className="flex items-center gap-3">
                <div className="bg-beige-light text-grey-dark rounded-full p-3">
                  <Globe className="size-6" />
                </div>
                <CardTitle className="text-beige-dark text-xl">Site Oficial</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="mb-6">
                Acesse o site oficial do CVV para mais recursos, informações e formas de ajudar você
                nesse momento difícil.
              </p>
              <div className="bg-beige-light/20 mb-4 rounded-lg p-4 text-center">
                <p className="text-grey-dark">
                  <span className="font-varela mb-1 block text-3xl font-semibold text-black">
                    cvv.org.br
                  </span>
                  Conheça mais sobre nossa missão e trabalho
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <a
                href="https://www.cvv.org.br/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button className="w-full">
                  <Globe className="mr-2 size-4" /> Visitar Site
                </Button>
              </a>
            </CardFooter>
          </Card>
        </div>
      </section>
    </main>
  );
}
