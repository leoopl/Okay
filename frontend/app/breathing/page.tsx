'use client';

import { useState } from 'react';
import data from '../../data/breath.json';
import Image from 'next/image';
import BreathingAnimation from '../../components/breathing-animation';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useMobile } from '@/hooks/use-mobile';

interface Technique {
  id: number;
  name: string;
  desc: string;
  secs: number[];
  bgcolor: string;
}

const Breathing: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedTechnique, setSelectedTechnique] = useState<Technique | null>(null);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const isMobile = useMobile();

  const openModal = (technique: Technique) => {
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
          breathingTime={selectedTechnique.secs}
        />
      )}

      <div className="flex min-h-screen flex-col p-4 sm:p-6 lg:p-10 lg:py-15">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
            <div className="animate-fade-in flex flex-col gap-3">
              <h1 className="font-varela text-green-dark text-2xl leading-tight font-bold sm:text-3xl md:text-4xl lg:text-5xl">
                Técnicas de Respiração
              </h1>
              <p className="text-beige-dark text-sm sm:text-base md:text-lg">
                Pratique técnicas de respiração comuns para reduzir o estresse e manter a calma.
              </p>
              <div className="mt-6 grid grid-cols-1 gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-6">
                {data.map((item) => (
                  <button
                    key={item.id}
                    className="relative flex cursor-pointer flex-col items-center justify-center rounded-lg px-4 py-4 shadow transition-transform duration-300 hover:-translate-y-1 hover:shadow-md sm:px-6 sm:py-5"
                    style={{ backgroundColor: item.bgcolor }}
                    onClick={() => openModal(item)}
                  >
                    <h3 className="text-base font-medium text-gray-900 sm:text-lg">{item.name}</h3>
                    <span className="mt-2 text-xs text-gray-700 sm:text-sm">Clique para ver</span>
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
              <DialogContent
                className={`${
                  isMobile ? 'mx-4 max-h-[85vh] w-full max-w-[95vw]' : 'max-h-[600px] max-w-[800px]'
                } overflow-hidden p-0`}
                onInteractOutside={(e) => e.preventDefault()}
              >
                <div className="relative grid size-full place-content-center overflow-hidden rounded-2xl bg-white p-4 text-left align-middle shadow-xl sm:p-6">
                  <div className="mt-2 text-center">
                    {selectedTechnique && (
                      <div className="relative mx-auto mb-4 sm:mb-6">
                        <Image
                          src={`/breath${selectedTechnique.id}.svg`}
                          alt={selectedTechnique.name || 'Technique Image'}
                          width={isMobile ? 120 : 150}
                          height={isMobile ? 120 : 150}
                          className="mx-auto"
                          style={{
                            maxWidth: '100%',
                            height: 'auto',
                          }}
                        />
                      </div>
                    )}
                    <DialogTitle className="font-varela mt-4 text-xl leading-6 font-medium text-gray-900 sm:mt-8 sm:text-2xl lg:text-3xl">
                      {selectedTechnique?.name}
                    </DialogTitle>
                  </div>
                  <div className="mt-2 text-center">
                    <DialogDescription
                      className={`${
                        isMobile ? 'max-w-full text-sm' : 'max-w-md text-base'
                      } mx-auto leading-relaxed font-semibold text-gray-600`}
                    >
                      {selectedTechnique?.desc}
                    </DialogDescription>
                  </div>

                  <div className="mt-4 text-center sm:mt-6">
                    <p className="mb-4 text-xs text-gray-700 sm:text-sm">
                      Fique confortável e comece a respirar.
                    </p>
                    <Button
                      onClick={startAnimation}
                      className={`${isMobile ? 'w-full py-3 text-base' : 'px-6 py-2'}`}
                    >
                      Iniciar
                    </Button>
                  </div>
                </div>
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
