import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  InventoryService,
  type Inventory,
  type UserResponseOption,
} from '@/lib/actions/supabase-inventories';

// Simplified types to avoid recursion issues
type CalculatedScores = any;
type InterpretationResult = any;

interface InventoryState {
  // Core data
  currentInventory: Inventory | null;
  responses: UserResponseOption[];
  calculatedScores: CalculatedScores | null;
  interpretationResults: InterpretationResult | null;

  // User consent and privacy
  consentGiven: boolean;
  consentTimestamp: Date | null;

  // UI state
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;

  // Navigation state
  currentQuestionIndex: number;
  canGoBack: boolean;
  canGoNext: boolean;

  // Results state
  hasResults: boolean;

  // Actions
  setCurrentInventory: (inventory: Inventory | null) => void;
  updateResponse: (
    questionId: string,
    optionValue: number,
    optionLabel?: string,
    questionTitle?: string,
  ) => void;
  setResponses: (responses: UserResponseOption[]) => void;
  setResults: (scores: CalculatedScores, interpretation: InterpretationResult) => void;
  setConsent: (consent: boolean) => void;
  setLoading: (loading: boolean) => void;
  setSubmitting: (submitting: boolean) => void;
  setError: (error: string | null) => void;
  resetState: () => void;
}

const initialState = {
  currentInventory: null,
  responses: [],
  calculatedScores: null,
  interpretationResults: null,
  consentGiven: false,
  consentTimestamp: null,
  isLoading: false,
  isSubmitting: false,
  error: null,
  currentQuestionIndex: 0,
  canGoBack: false,
  canGoNext: false,
  hasResults: false,
};

export const useInventoryStore = create<InventoryState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      setCurrentInventory: (inventory) =>
        set({
          currentInventory: inventory,
          responses: [],
          currentQuestionIndex: 0,
          canGoBack: false,
          canGoNext: false,
        }),

      updateResponse: (questionId, optionValue, optionLabel, questionTitle) =>
        set((state) => {
          const existingIndex = state.responses.findIndex((r) => r.questionId === questionId);
          const newResponse: UserResponseOption = {
            questionId,
            optionValue,
            optionLabel,
            questionTitle,
          };

          const newResponses = [...state.responses];
          if (existingIndex >= 0) {
            newResponses[existingIndex] = newResponse;
          } else {
            newResponses.push(newResponse);
          }

          return {
            responses: newResponses,
            canGoNext: true,
          };
        }),

      setResponses: (responses) => set({ responses }),

      setResults: (calculatedScores, interpretationResults) =>
        set({
          calculatedScores,
          interpretationResults,
          hasResults: true,
        }),

      setConsent: (consentGiven) =>
        set({
          consentGiven,
          consentTimestamp: consentGiven ? new Date() : null,
        }),

      setLoading: (isLoading) => set({ isLoading }),

      setSubmitting: (isSubmitting) => set({ isSubmitting }),

      setError: (error) => set({ error }),

      resetState: () => set(initialState),
    }),
    { name: 'inventory-store' },
  ),
);

// Selectors for easier access
export const useCurrentInventory = () => useInventoryStore((state) => state.currentInventory);
export const useInventoryResponses = () => useInventoryStore((state) => state.responses);
export const useInventoryResults = () =>
  useInventoryStore((state) => ({
    calculatedScores: state.calculatedScores,
    interpretationResults: state.interpretationResults,
    hasResults: state.hasResults,
  }));
export const useInventoryConsent = () => useInventoryStore((state) => state.consentGiven);
export const useInventoryLoading = () => useInventoryStore((state) => state.isLoading);
export const useInventoryError = () => useInventoryStore((state) => state.error);
