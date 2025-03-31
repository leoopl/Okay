import { ApiClient } from '@/lib/api-client';

// Inventory types
export interface Inventory {
  id: string;
  name: string;
  description: string;
  questions: Question[];
  minScore: number;
  maxScore: number;
  scoreInterpretations: ScoreInterpretation[];
}

export interface Question {
  id: number;
  text: string;
  options: Option[];
}

export interface Option {
  id: number;
  text: string;
  value: number;
}

export interface ScoreInterpretation {
  minScore: number;
  maxScore: number;
  interpretation: string;
}

// Response types
export interface InventoryResponse {
  id: string;
  inventoryId: string;
  answers: Answer[];
  totalScore: number;
  interpretation: string;
  completedAt: string;
  inventory?: Inventory;
}

export interface Answer {
  questionId: number;
  optionId: number;
  value: number;
}

export interface SubmitResponseDto {
  inventoryId: string;
  answers: Answer[];
}

/**
 * Hook for managing mental health assessments securely
 * Uses authenticated API client to make requests to the backend
 */
export const useAssessmentService = () => {
  /**
   * Fetch all available assessment inventories
   */
  const getInventories = async (): Promise<Inventory[]> => {
    return ApiClient.get('/inventories');
  };

  /**
   * Fetch a specific inventory by ID
   */
  const getInventory = async (id: string): Promise<Inventory> => {
    return ApiClient.get(`/inventories/${id}`);
  };

  /**
   * Submit a response to an assessment inventory
   */
  const submitResponse = async (data: SubmitResponseDto): Promise<InventoryResponse> => {
    return ApiClient.post('/inventories/responses', data);
  };

  /**
   * Get all responses for the current user
   */
  const getUserResponses = async (): Promise<InventoryResponse[]> => {
    return ApiClient.get('/inventories/responses/me');
  };

  /**
   * Get a specific response by ID
   */
  const getResponse = async (id: string): Promise<InventoryResponse> => {
    return ApiClient.get(`/inventories/responses/${id}`);
  };

  return {
    getInventories,
    getInventory,
    submitResponse,
    getUserResponses,
    getResponse,
  };
};
