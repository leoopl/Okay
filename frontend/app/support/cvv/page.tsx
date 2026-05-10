'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, Heart, Info, MessageCircle, Phone } from 'lucide-react';
import Image from 'next/image';
import { useMobile } from '@/hooks/use-mobile';

export default function Cvv() {
  const isMobile = useMobile();

  return (
    <main className="flex min-h-screen flex-col p-4 sm:p-6 lg:p-10 lg:py-15">
      <div className="flex flex-col items-center text-center">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
          <div className="animate-fade-in flex flex-col gap-8">
            <h1 className="font-varela text-accent-strong text-xl leading-tight font-bold sm:text-2xl md:text-3xl lg:text-4xl">
              Centro de Valorização da Vida (CVV)
            </h1>
            <p className="text-muted-foreground text-lg sm:text-xl">
              Apoio emocional e prevenção do suicídio
            </p>
          </div>
          <div className="mb-4 flex items-center justify-center">
            <div className="relative size-48 sm:size-60">
              <Image src="/cvv.svg" alt="CVV Logo" fill className="object-contain" />
            </div>
          </div>
        </div>
        <div className="bg-primary mt-6 h-1 w-60 rounded-full"></div>
      </div>

      {/* Quem somos Card */}
      <section className="mt-12">
        <Card className="border-accent-strong/40 overflow-hidden transition-all duration-300 hover:shadow-md">
          <CardHeader className="border-accent-strong/40 bg-accent-strong/10 border-b">
            <CardTitle className="font-varela text-accent-strong flex items-center">
              <span className="mr-2">
                <Info className="text-accent-strong size-6" />
              </span>
              Sobre o CVV
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <p className="leading-relaxed">
              Formado exclusivamente por voluntários, o CVV oferece apoio emocional e prevenção do
              suicídio gratuitamente. Quem nos procura, normalmente está se sentido solitário ou
              precisa conversar de forma sigilosa, sem julgamentos, críticas ou comparações. Atuamos
              nacionalmente. Nosso atendimento é realizado pelo telefone 188 (24 horas por dia e sem
              custo de ligação), chat, e-mail e pessoalmente em alguns endereços. O CVV é uma
              entidade nacional fundada em 1962, financeira e ideologicamente independente. Sem viés
              religioso, político-partidário ou empresarial.
            </p>
            <div className="text-primary mt-6 flex place-self-center">
              <Heart className="mr-2 size-5" />
              <span className="font-medium">Estamos aqui para ouvir, sem julgamentos.</span>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-12">
        <h2 className="text-accent-strong font-varela mb-6 text-center text-xl font-semibold sm:text-2xl">
          Como Podemos Ajudar
        </h2>

        <div className="mb-8">
          {/* Online Chat Section */}
          <Card className="shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <CardHeader className="bg-accent-strong/10 rounded-t-lg">
              {isMobile ? (
                // Mobile layout: Stack vertically
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-accent-strong/20 text-accent-strong rounded-full p-3">
                      <MessageCircle className="size-6" />
                    </div>
                    <CardTitle className="text-accent-strong text-lg sm:text-xl">
                      Chat Online
                    </CardTitle>
                  </div>
                  <div className="w-full">
                    <a
                      href="https://servidorseguro.mysuite1.com.br/empresas/cvw/verificaseguro.php"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full"
                    >
                      <Button className="w-full text-base sm:text-lg">
                        <MessageCircle className="mr-2 size-4" /> Iniciar Chat
                      </Button>
                    </a>
                  </div>
                </div>
              ) : (
                // Desktop layout: Side by side
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-accent-strong/20 text-accent-strong rounded-full p-3">
                      <MessageCircle className="size-6" />
                    </div>
                    <CardTitle className="text-accent-strong text-xl">Chat Online</CardTitle>
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
              )}
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-6 p-4 pt-6 sm:p-6 md:grid-cols-1 lg:grid-cols-2">
              <p className="mb-6 content-center">
                Converse gratuitamente com um dos nossos voluntários via chat, onde estiver.
                <br></br>
                <br></br>
                Aqui, como em qualquer outra forma de contato com o CVV, você é atendido por um
                voluntário, com respeito, anonimato, que guardará sigilo sobre tudo que for dito.
                Nossos voluntários são treinados para conversar com todas as pessoas que procuram
                ajuda e apoio emocional.
              </p>
              <div className="bg-accent-strong/10 mb-4 rounded-lg p-4 text-center">
                <p className="text-muted-foreground text-sm sm:text-base">
                  <span className="text-foreground mb-1 block font-semibold">
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
            <CardHeader className="bg-secondary/20 rounded-t-lg">
              <div className="flex items-center gap-3">
                <div className="bg-secondary/30 text-secondary rounded-full p-3">
                  <Phone className="size-6" />
                </div>
                <CardTitle className="text-secondary text-lg sm:text-xl">Ligue 188</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-6 sm:p-6">
              <p className="mb-6">
                Converse gratuitamente com um dos nossos voluntários, de qualquer lugar do Brasil,
                24 horas por dia.
              </p>
              <div className="bg-secondary/10 mb-4 rounded-lg p-4 text-center">
                <span className="text-secondary block text-2xl font-bold sm:text-3xl">188</span>
                <span className="text-muted-foreground text-sm sm:text-base">Ligação Gratuita</span>
              </div>
            </CardContent>
            <CardFooter className="p-4 sm:p-6">
              <Button className="w-full cursor-default">
                <Phone className="mr-2 h-4 w-4" /> Ligar Agora
              </Button>
            </CardFooter>
          </Card>

          {/* Website Link Card */}
          <Card className="shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <CardHeader className="bg-muted/30 rounded-t-lg">
              <div className="flex items-center gap-3">
                <div className="bg-muted text-muted-foreground rounded-full p-3">
                  <Globe className="size-6" />
                </div>
                <CardTitle className="text-muted-foreground text-lg sm:text-xl">
                  Site Oficial
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-6 sm:p-6">
              <p className="mb-6">
                Acesse o site oficial do CVV para mais recursos, informações e formas de ajudar você
                nesse momento difícil.
              </p>
              <div className="bg-muted/20 mb-4 rounded-lg p-4 text-center">
                <p className="text-muted-foreground">
                  <span className="font-varela text-foreground mb-1 block text-2xl font-semibold sm:text-3xl">
                    cvv.org.br
                  </span>
                  <span className="text-sm sm:text-base">
                    Conheça mais sobre nossa missão e trabalho
                  </span>
                </p>
              </div>
            </CardContent>
            <CardFooter className="p-4 sm:p-6">
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
