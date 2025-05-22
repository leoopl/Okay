import { ApiClient } from '@/lib/api-client';

// Types that match the backend structure
export interface Option {
  label: string;
  value: number;
}

export interface Question {
  id: string;
  title: string;
  subscale?: string;
  reverseScore?: boolean;
  options: Option[];
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
  interpretation?: ScoreRange[];
}

export interface Inventory {
  id: string;
  name: string;
  title: string;
  description: string;
  disclaimer?: string;
  questions: Question[];
  scoring: AssessmentScoring;
  version?: string;
  source?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserResponseOption {
  questionId: string;
  optionValue: number;
  questionTitle?: string;
  optionLabel?: string;
}

export interface CalculatedScores {
  total?: number;
  [key: string]: number | undefined;
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

export interface InventoryResponse {
  id: string;
  inventoryId: string;
  inventoryTitle: string;
  responses: UserResponseOption[];
  calculatedScores: CalculatedScores;
  interpretationResults: InterpretationResult;
  completedAt: string;
}

export interface SubmitResponseDto {
  inventoryId: string;
  responses: UserResponseOption[];
  consentGiven: boolean;
}

/**
 * Service for managing mental health assessments securely
 */
export const InventoryService = {
  /**
   * Fetch all available assessment inventories
   */
  getInventories: async (): Promise<Inventory[]> => {
    return ApiClient.get('/inventories');
  },

  /**
   * Fetch a specific inventory by ID
   */
  getInventory: async (id: string): Promise<Inventory> => {
    return ApiClient.get(`/inventories/${id}`);
  },

  /**
   * Submit a response to an assessment inventory
   */
  submitResponse: async (data: SubmitResponseDto): Promise<InventoryResponse> => {
    return ApiClient.post('/inventories/responses', data);
  },

  /**
   * Get all responses for the current user
   */
  getUserResponses: async (): Promise<InventoryResponse[]> => {
    return ApiClient.get('/inventories/responses/me');
  },

  /**
   * Get a specific response by ID
   */
  getResponse: async (id: string): Promise<InventoryResponse> => {
    return ApiClient.get(`/inventories/responses/${id}`);
  },

  /**
   * Withdraw consent for a response
   */
  withdrawConsent: async (responseId: string): Promise<void> => {
    return ApiClient.delete(`/inventories/responses/${responseId}/consent`);
  },
};
