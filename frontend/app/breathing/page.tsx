'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Info } from 'lucide-react';
import BreathingAnimation from '@/components/breathing-animation';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  breathingTechniques,
  type BreathingTechnique,
  type BreathingTone,
} from '@/data/breathing-techniques';

// Palette-family tints that follow the light/dark theme tokens.
const TONE_CLASSES: Record<BreathingTone, string> = {
  earth: 'bg-muted',
  sky: 'bg-secondary/30',
  sage: 'bg-accent/50',
};

const hasBreathHold = ({ secs }: BreathingTechnique) => secs[1] > 0 || secs[3] > 0;

const Breathing: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedTechnique, setSelectedTechnique] = useState<BreathingTechnique | null>(null);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  const openModal = (technique: BreathingTechnique) => {
    setSelectedTechnique(technique);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsAnimating(false);
  };

  const startAnimation = () => {
    if (selectedTechnique) {
      setIsAnimating(true);
      setIsModalOpen(false); // Close the modal when starting animation
    }
  };

  return (
    <>
      {/* Animation Overlay - Independent of Dialog */}
      {isAnimating && selectedTechnique && (
        <BreathingAnimation
          onClose={() => {
            setIsAnimating(false);
            setIsModalOpen(true); // Reopen the modal when closing animation
          }}
          title={selectedTechnique.name}
          breathingTime={selectedTechnique.secs}
        />
      )}

      <div className="flex min-h-screen flex-col p-4 sm:p-6 lg:p-10 lg:py-15">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
            <div className="animate-fade-in flex flex-col gap-3">
              <h1 className="font-varela text-accent-strong text-3xl leading-tight md:text-4xl lg:text-5xl lg:leading-[1.2] lg:tracking-[-0.01em]">
                Técnicas de Respiração
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
                Pratique técnicas de respiração comuns para reduzir o estresse e manter a calma.
              </p>
              <div className="mt-6 grid grid-cols-1 gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-6">
                {breathingTechniques.map((item) => (
                  <button
                    key={item.id}
                    className={`${TONE_CLASSES[item.tone]} relative flex cursor-pointer flex-col items-center justify-center rounded-lg px-4 py-4 shadow transition-transform duration-300 hover:-translate-y-1 hover:shadow-md sm:px-6 sm:py-5`}
                    onClick={() => openModal(item)}
                  >
                    <h2 className="font-varela text-foreground text-base font-medium sm:text-lg">
                      {item.name}
                    </h2>
                    <span className="text-foreground/75 mt-2 text-xs sm:text-sm">
                      {item.purpose}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <Dialog
              open={isModalOpen}
              onOpenChange={(open) => {
                if (!open && !isAnimating) {
                  closeModal();
                }
              }}
            >
              {/* Scrollable body + sticky footer: the safety note and Iniciar stay visible. */}
              <DialogContent
                className="bg-card flex max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0"
                onInteractOutside={(e) => e.preventDefault()}
              >
                {selectedTechnique && (
                  <>
                    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                      <div className="grid gap-4 sm:grid-cols-[minmax(0,13rem)_1fr] sm:gap-8">
                        <div className="flex items-center gap-4 pr-8 sm:flex-col sm:pr-0 sm:text-center">
                          <Image
                            src={`/breath${selectedTechnique.id}.svg`}
                            alt=""
                            width={120}
                            height={120}
                            className="size-16 shrink-0 sm:size-30"
                          />
                          <div>
                            <DialogTitle className="font-varela text-foreground text-xl leading-tight font-medium sm:text-2xl">
                              {selectedTechnique.name}
                            </DialogTitle>
                            <p className="text-muted-foreground mt-2 hidden text-sm sm:block">
                              {selectedTechnique.purpose}
                            </p>
                          </div>
                        </div>

                        <div className="sm:pr-6">
                          <DialogDescription className="text-muted-foreground text-sm leading-relaxed sm:text-base">
                            {selectedTechnique.desc}
                          </DialogDescription>
                          <Accordion type="single" collapsible className="mt-2">
                            <AccordionItem value="references" className="border-none">
                              <AccordionTrigger className="text-foreground cursor-pointer py-2 text-sm hover:no-underline">
                                {`Referências (${selectedTechnique.references.length})`}
                              </AccordionTrigger>
                              <AccordionContent>
                                <ul className="text-muted-foreground space-y-1 text-xs">
                                  {selectedTechnique.references.map((ref) => (
                                    <li key={ref.url}>
                                      <a
                                        href={ref.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:text-foreground underline underline-offset-2"
                                      >
                                        {ref.citation}
                                      </a>
                                    </li>
                                  ))}
                                </ul>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </div>
                      </div>
                    </div>

                    <div className="border-t p-4 sm:px-6">
                      <div className="border-primary/30 bg-primary/10 flex items-start gap-2 rounded-lg border p-3">
                        <Info
                          size={18}
                          className="text-accent-strong mt-0.5 shrink-0"
                          aria-hidden="true"
                        />
                        <p className="text-accent-strong text-xs sm:text-sm">
                          Respire sem forçar. Se sentir tontura, falta de ar ou desconforto, pare e
                          volte a respirar normalmente.
                          {hasBreathHold(selectedTechnique) &&
                            ' Se você tem problemas cardíacos ou respiratórios, ou está grávida, converse com um profissional de saúde antes de prender a respiração.'}
                        </p>
                      </div>
                      <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
                        <p className="text-muted-foreground text-xs sm:text-sm">
                          Encontre uma posição confortável antes de começar.
                        </p>
                        <Button onClick={startAnimation} className="w-full px-6 sm:w-auto">
                          Iniciar
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </DialogContent>
            </Dialog>

            <div className="hidden md:flex md:justify-center">
              <Image
                src="/meditation1.svg"
                alt="Avatar de Meditação"
                width={500}
                height={500}
                className="mx-auto"
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                }}
                // placeholder="blur" Add placeholder for non-SVG images
                // blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAEtgJyBzPZIQAAAABJRU5ErkJggg=="
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Breathing;
