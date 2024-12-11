'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { RadioGroupItem, RadioGroup } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import data from '../../../data/beck.json';

interface IQuestion {
  id: number;
  options: string[];
  note?: string | null;
}

interface IQuestionnaire {
  id: number;
  title: string;
  desc: string;
  questions: IQuestion[];
}

const BeckPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const questionnaire: IQuestionnaire = data;
  const [answers, setAnswers] = useState<number[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectOption, setSelectOption] = useState<number | null>(null);
  const currentQuestion: IQuestion = questionnaire.questions[currentQuestionIndex];

  function handleOptionChange(optionIndex: number | null): void {
    setSelectOption(optionIndex);
  }

  function handleNextQuestion() {
    if (selectOption === null) {
      alert('Selecione uma opção antes de prosseguir');
      return;
    }

    setAnswers([...answers, selectOption]);
    setSelectOption(null);

    if (currentQuestionIndex < questionnaire.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      const totalScore = answers.reduce((acc, curr) => acc + curr, 0);
      const currentParams = new URLSearchParams(searchParams.toString());
      currentParams.set('score', `${totalScore}`);
      router.replace(`/questionnaire/beck/result?${currentParams.toString()}`, { scroll: false });
    }
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-center font-varela text-3xl font-bold text-gray-900">
          {questionnaire.title}
        </h1>
        <div className="mt-8 space-y-6">
          <h3 className="text-center text-sm text-black">{questionnaire.desc}</h3>
          <p className="text-center text-sm text-gray-600">
            Question {currentQuestionIndex + 1} of {questionnaire.questions.length}
          </p>
          {currentQuestion.note && <p className="text-sm text-gray-900">{currentQuestion.note}</p>}

          <RadioGroup
            value={String(selectOption)}
            // Radix uses onValueChange instead of onChange for radio groups
            onValueChange={(val) => handleOptionChange(Number(val))}
            aria-label="Beck question"
          >
            {currentQuestion.options.map((option, index) => (
              <RadioGroupItem key={index} value={String(index)} className="w-full">
                <Label>{option}</Label>
              </RadioGroupItem>
            ))}
          </RadioGroup>

          <div className="text-center">
            <button
              onClick={handleNextQuestion}
              className="small-caps inline-flex justify-center rounded-md bg-greenDark px-4 py-2 text-sm font-semibold text-black shadow-sm hover:bg-greenMedium focus:outline-none focus:ring-2 focus:ring-greenDark focus:ring-offset-2"
            >
              {currentQuestionIndex < questionnaire.questions.length - 1
                ? 'Next Question'
                : 'See Results'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BeckPage;
