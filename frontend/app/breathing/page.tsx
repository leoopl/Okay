'use client';

import { Fragment, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import data from '../../data/breath.json';
import Image from 'next/image';
import { XMarkIcon } from '@heroicons/react/24/outline';
import BreathingAnimation from '../../components/BreathingAnimation';

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

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="grid gap-8 md:grid-cols-2 md:items-center">
        <div className="text-center">
          <h1 className="small-caps mb-4 text-center font-varela text-4xl font-bold leading-9 tracking-tight text-gray-900">
            Técnicas de Respiração
          </h1>
          <p className="text-base text-gray-700">
            Pratique técnicas de respiração comuns para reduzir o estresse e manter a calma.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {data.map((item) => (
              <button
                key={item.id}
                className="relative flex flex-col items-center justify-center rounded-lg px-6 py-5 shadow transition hover:shadow-md"
                style={{ backgroundColor: item.bgcolor }}
                onClick={() => openModal(item)}
              >
                <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
                <span className="mt-2 text-sm text-gray-700">Clique para ver</span>
              </button>
            ))}
          </div>
        </div>

        {/* Modal */}
        <Transition appear show={isModalOpen} as={Fragment}>
          <Dialog as="div" className="relative z-50" onClose={closeModal}>
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/25" />
            </TransitionChild>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <TransitionChild
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <DialogPanel className="relative grid size-1/2 place-content-center overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all lg:h-[600px] lg:w-[800px]">
                    <button
                      className="absolute right-4 top-4 text-gray-500 hover:text-gray-700 focus:outline-none"
                      onClick={closeModal}
                      aria-label="Fechar"
                    >
                      <XMarkIcon className="size-6" aria-hidden="true" />
                    </button>
                    <div className="mt-2 text-center">
                      <Image
                        src={`/breath${selectedTechnique?.id}.svg`}
                        alt={selectedTechnique?.name || 'Technique Image'}
                        width={150}
                        height={150}
                        className="mx-auto"
                      />
                      <DialogTitle
                        as="h1"
                        className="mt-8 font-varela text-3xl font-medium leading-6 text-gray-900"
                      >
                        {selectedTechnique?.name}
                      </DialogTitle>
                    </div>
                    <div className="mt-2 text-center">
                      <p className="max-w-md text-base font-semibold text-gray-600">
                        {selectedTechnique?.desc}
                      </p>
                    </div>

                    <div className="mt-6 text-center">
                      <p className="mb-4 text-sm text-gray-700">
                        Fique confortável e comece a respirar.
                      </p>
                      <button
                        className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        onClick={() => setIsAnimating(true)}
                      >
                        Iniciar
                      </button>
                    </div>

                    {/* Animation Overlay */}
                    {isAnimating && selectedTechnique && (
                      <BreathingAnimation
                        onClose={() => setIsAnimating(false)}
                        breathingTime={selectedTechnique.secs}
                      />
                    )}
                  </DialogPanel>
                </TransitionChild>
              </div>
            </div>
          </Dialog>
        </Transition>

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
  );
};

export default Breathing;
