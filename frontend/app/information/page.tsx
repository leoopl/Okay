import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import data from '../../data/information.json';
import IllnessCard from '../../components/IllnessCard';

interface IIllnessData {
  id: number;
  redirection: string;
  illness: string;
  image: string;
  description: string;
}

const InformationPage: React.FC = () => {
  const illnessData: IIllnessData[] = data;

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div className="space-y-6 text-center md:text-left">
            <h1 className="font-varela text-4xl font-bold text-gray-900">Recursos e informações</h1>
            <p className="text-base text-gray-700">
              Encontre informações sobre diversas condições de saúde mental.
            </p>
            <nav className="flex flex-wrap gap-2">
              {illnessData.map((item) => (
                <Link
                  key={item.id}
                  className="rounded-full bg-greenLight px-4 py-2 text-sm font-medium text-greenDark hover:bg-greenMedium hover:text-white"
                  href={`#${item.redirection}`}
                >
                  {item.illness}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex justify-center">
            <Image
              src="/thinking.svg"
              alt="Ilustração"
              width={500}
              height={500}
              className="object-contain"
              priority
            />
          </div>
        </div>

        <div className="mt-12">
          {illnessData.map((item, index) => (
            <IllnessCard key={item.id} item={item} reverseLayout={index % 2 !== 0} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default InformationPage;
