import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export interface IllnessData {
  id: number;
  redirection: string;
  illness: string;
  image?: string;
  description: string;
}

interface IllnessCardProps {
  item: IllnessData;
  reverseLayout: boolean;
}

const IllnessCard: React.FC<IllnessCardProps> = ({ item, reverseLayout }) => {
  return (
    <div
      id={item.redirection}
      className="mt-10 flex flex-col-reverse items-center justify-between gap-8 rounded-lg bg-white/20 p-6 shadow-lg md:flex-row md:gap-6 lg:p-10"
    >
      <div className={`flex-1 space-y-4 ${reverseLayout ? 'md:order-2' : 'md:order-1'}`}>
        <h2 className="font-varela text-center text-2xl font-bold text-gray-900">{item.illness}</h2>
        <p className="text-base text-gray-700">{item.description}</p>
        <Link
          href={`/information/${item.redirection}`}
          className="small-caps bg-green-dark hover:bg-green-medium focus:ring-green-dark inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold text-black focus:ring-2 focus:ring-offset-2 focus:outline-none"
        >
          Saiba mais...
        </Link>
      </div>
      <div className={`flex-1 ${reverseLayout ? 'md:order-1' : 'md:order-2'} flex justify-center`}>
        <Image
          src={item.image || '/thinking.svg'}
          alt={item.illness}
          width={400}
          height={400}
          className="object-contain"
          priority
        />
      </div>
    </div>
  );
};

export default IllnessCard;
