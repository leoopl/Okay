import { create } from 'zustand';
import {
  Inventory,
  UserResponseOption,
  InterpretationResult,
  CalculatedScores,
} from '@/services/inventory-service';

interface InventoryState {
  // Current inventory being taken
  currentInventory: Inventory | null;
  // User responses to questions
  responses: UserResponseOption[];
  // Results after submission
  calculatedScores: CalculatedScores | null;
  interpretationResults: InterpretationResult | null;
  // Consent status
  consentGiven: boolean;
  // Loading states
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentInventory: (inventory: Inventory | null) => void;
  addResponse: (response: UserResponseOption) => void;
  updateResponse: (questionId: string, optionValue: number, optionLabel?: string) => void;
  setResponses: (responses: UserResponseOption[]) => void;
  setResults: (scores: CalculatedScores, interpretation: InterpretationResult) => void;
  setConsent: (consent: boolean) => void;
  resetState: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useInventoryStore = create<InventoryState>((set) => ({
  currentInventory: null,
  responses: [],
  calculatedScores: null,
  interpretationResults: null,
  consentGiven: false,
  isLoading: false,
  error: null,

  setCurrentInventory: (inventory) => set({ currentInventory: inventory }),

  addResponse: (response) =>
    set((state) => {
      // Check if this questionId already has a response
      const existingIndex = state.responses.findIndex((r) => r.questionId === response.questionId);

      if (existingIndex >= 0) {
        // Replace existing response
        const newResponses = [...state.responses];
        newResponses[existingIndex] = response;
        return { responses: newResponses };
      } else {
        // Add new response
        return { responses: [...state.responses, response] };
      }
    }),

  updateResponse: (questionId, optionValue, optionLabel) =>
    set((state) => {
      const existingIndex = state.responses.findIndex((r) => r.questionId === questionId);

      if (existingIndex >= 0) {
        // Update existing response
        const newResponses = [...state.responses];
        newResponses[existingIndex] = {
          ...newResponses[existingIndex],
          optionValue,
          optionLabel,
        };
        return { responses: newResponses };
      }
      return state; // No change if question not found
    }),

  setResponses: (responses) => set({ responses }),

  setResults: (calculatedScores, interpretationResults) =>
    set({
      calculatedScores,
      interpretationResults,
    }),

  setConsent: (consentGiven) => set({ consentGiven }),

  resetState: () =>
    set({
      currentInventory: null,
      responses: [],
      calculatedScores: null,
      interpretationResults: null,
      consentGiven: false,
      error: null,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),
}));
