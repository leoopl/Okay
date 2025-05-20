export interface Option {
  label: string;
  value: number;
}

export interface Question {
  id: string;
  title: string;
  subscale?: string; // For DASS-21 with depression, anxiety, stress subscales
  options: Option[];
  reverseScore?: boolean; // For PSS-10 reverse-scored questions
}

export interface ScoreRange {
  min: number;
  max: number;
  label: string;
  recommendation: string;
}

export interface SubscaleInterpretation {
  maxRawScore?: number;
  interpretation: ScoreRange[];
}

export interface AssessmentScoring {
  totalScoreRange?: [number, number];
  subscales?: {
    [key: string]: SubscaleInterpretation;
  };
  interpretation?: ScoreRange[]; // For assessments with just total score (GAD-7, PHQ-9)
}

export interface UserResponseOption {
  questionId: string;
  optionValue: number;
  questionTitle?: string; // For easier reading without joins
  optionLabel?: string;
}

export interface InterpretationResult {
  label: string;
  recommendation: string;
  subscaleInterpretations?: {
    [key: string]: {
      label: string;
      recommendation: string;
    };
  };
}

export interface CalculatedScores {
  total?: number;
  depression?: number;
  anxiety?: number;
  stress?: number;
  [key: string]: number | undefined;
}
