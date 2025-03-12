'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import data from '../../data/breath.json';
import Image from 'next/image';
import BreathingAnimation from '../../components/BreathingAnimation';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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

      <div className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div className="text-center">
            <h1 className="small-caps font-varela mb-4 text-center text-4xl leading-9 font-bold tracking-tight text-gray-900">
              Técnicas de Respiração
            </h1>
            <p className="text-base text-gray-700">
              Pratique técnicas de respiração comuns para reduzir o estresse e manter a calma.
            </p>
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {data.map((item) => (
                <button
                  key={item.id}
                  className="relative flex cursor-pointer flex-col items-center justify-center rounded-lg px-6 py-5 shadow transition hover:shadow-md"
                  style={{ backgroundColor: item.bgcolor }}
                  onClick={() => openModal(item)}
                >
                  <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
                  <span className="mt-2 text-sm text-gray-700">Clique para ver</span>
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
              className="max-h-[600px] max-w-[800px] overflow-hidden p-0"
              onInteractOutside={(e) => e.preventDefault()}
            >
              <div className="relative grid size-full place-content-center overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl">
                <DialogClose className="absolute top-4 right-4 cursor-pointer text-gray-500 hover:text-gray-700 focus:outline-none">
                  <X className="size-6" aria-hidden="true" />
                </DialogClose>

                <div className="mt-2 text-center">
                  {selectedTechnique && (
                    <Image
                      src={`/breath${selectedTechnique.id}.svg`}
                      alt={selectedTechnique.name || 'Technique Image'}
                      width={150}
                      height={150}
                      className="mx-auto"
                    />
                  )}
                  <DialogTitle className="font-varela mt-8 text-3xl leading-6 font-medium text-gray-900">
                    {selectedTechnique?.name}
                  </DialogTitle>
                </div>
                <div className="mt-2 text-center">
                  <DialogDescription className="max-w-md text-base font-semibold text-gray-600">
                    {selectedTechnique?.desc}
                  </DialogDescription>
                </div>

                <div className="mt-6 text-center">
                  <p className="mb-4 text-sm text-gray-700">
                    Fique confortável e comece a respirar.
                  </p>
                  <Button
                    className="inline-flex cursor-pointer items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    onClick={startAnimation}
                  >
                    Iniciar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <div className="flex justify-center">
            <Image
              src="/meditation1.svg"
              alt="Breathing Avatar"
              width={500}
              height={500}
              className="mx-auto"
              priority
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default Breathing;
