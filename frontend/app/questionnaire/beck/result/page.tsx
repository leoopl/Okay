'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const ResultPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const score = searchParams.get('score');

  const getResultInterpretation = (score: number) => {
    if (score < 10) return 'These ups and downs are considered normal';
    if (score < 20) return 'Mild mood disturbance';
    if (score < 30) return 'Borderline clinical depression';
    if (score < 40) return 'Moderate depression';
    if (score < 50) return 'Severe depression';
    return 'Extreme depression';
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="max-w-md space-y-6 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Your Result</h1>
        <p className="text-xl text-gray-700">
          Your total score is <span className="font-semibold">{score}</span>
        </p>
        <p className="text-lg text-gray-600">{getResultInterpretation(Number(score))}</p>
        <button
          onClick={() => router.push('/')}
          className="small-caps inline-flex justify-center rounded-md bg-greenDark px-4 py-2 text-sm font-semibold text-black shadow-sm hover:bg-greenMedium focus:outline-none focus:ring-2 focus:ring-greenDark focus:ring-offset-2"
        >
          Go Back Home
        </button>
      </div>
    </div>
  );
};

export default ResultPage;
