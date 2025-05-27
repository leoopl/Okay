import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  Inventory,
  UserResponseOption,
  InterpretationResult,
  CalculatedScores,
} from '@/services/inventory-service';

// Enhanced types for better state management
export interface InventoryProgress {
  currentQuestionIndex: number;
  totalQuestions: number;
  percentage: number;
  estimatedTimeRemaining: number; // in minutes
}

export interface InventoryError {
  type: 'fetch' | 'submit' | 'validation' | 'network';
  message: string;
  timestamp: Date;
  retryable: boolean;
}

export interface InventorySession {
  startedAt: Date;
  lastUpdatedAt: Date;
  timeSpent: number; // in seconds
  questionTimeSpent: { [questionId: string]: number }; // time per question in seconds
}

// Main store interface with enhanced functionality
interface InventoryState {
  // Core data
  currentInventory: Inventory | null;
  responses: UserResponseOption[];
  calculatedScores: CalculatedScores | null;
  interpretationResults: InterpretationResult | null;

  // User consent and privacy
  consentGiven: boolean;
  consentTimestamp: Date | null;
  privacyAcknowledged: boolean;

  // UI state
  isLoading: boolean;
  isSubmitting: boolean;
  error: InventoryError | null;

  // Progress tracking
  progress: InventoryProgress | null;
  session: InventorySession | null;

  // Navigation state
  currentQuestionIndex: number;
  canGoBack: boolean;
  canGoNext: boolean;

  // Results state
  hasResults: boolean;
  resultsViewedAt: Date | null;

  // Actions - Core functionality
  setCurrentInventory: (inventory: Inventory | null) => void;
  addResponse: (response: UserResponseOption) => void;
  updateResponse: (
    questionId: string,
    optionValue: number,
    optionLabel?: string,
    questionTitle?: string,
    timeSpent?: number,
  ) => void;
  setResponses: (responses: UserResponseOption[]) => void;
  removeResponse: (questionId: string) => void;

  // Actions - Results management
  setResults: (scores: CalculatedScores, interpretation: InterpretationResult) => void;
  markResultsViewed: () => void;

  // Actions - Consent management
  setConsent: (consent: boolean) => void;
  acknowledgePrivacy: () => void;
  revokeConsent: () => void;

  // Actions - Progress management
  updateProgress: (questionIndex: number) => void;
  startSession: () => void;
  updateSession: () => void;
  endSession: () => void;

  // Actions - Navigation
  setCurrentQuestion: (index: number) => void;
  goToNextQuestion: () => void;
  goToPreviousQuestion: () => void;
  canNavigateNext: () => boolean;
  canNavigatePrevious: () => boolean;

  // Actions - Error handling
  setLoading: (loading: boolean) => void;
  setSubmitting: (submitting: boolean) => void;
  setError: (error: InventoryError | null) => void;
  clearError: () => void;

  // Actions - State management
  resetState: () => void;
  resetToQuestion: (questionIndex: number) => void;

  // Computed values
  getCompletionPercentage: () => number;
  getEstimatedTimeRemaining: () => number;
  getTotalTimeSpent: () => number;
  getResponseByQuestionId: (questionId: string) => UserResponseOption | null;
  getAllAnsweredQuestions: () => string[];
  getUnansweredQuestions: () => string[];
  isCompleted: () => boolean;
  isValidForSubmission: () => boolean;
}

// Helper functions
const calculateProgress = (
  currentIndex: number,
  totalQuestions: number,
  startTime: Date,
): InventoryProgress => {
  const percentage = Math.round(((currentIndex + 1) / totalQuestions) * 100);
  const avgTimePerQuestion = 0.5; // 30 seconds average
  const remainingQuestions = totalQuestions - (currentIndex + 1);
  const estimatedTimeRemaining = remainingQuestions * avgTimePerQuestion;

  return {
    currentQuestionIndex: currentIndex,
    totalQuestions,
    percentage,
    estimatedTimeRemaining,
  };
};

const createInventoryError = (
  type: InventoryError['type'],
  message: string,
  retryable: boolean = true,
): InventoryError => ({
  type,
  message,
  timestamp: new Date(),
  retryable,
});

// Initial state
const initialState = {
  currentInventory: null,
  responses: [],
  calculatedScores: null,
  interpretationResults: null,
  consentGiven: false,
  consentTimestamp: null,
  privacyAcknowledged: false,
  isLoading: false,
  isSubmitting: false,
  error: null,
  progress: null,
  session: null,
  currentQuestionIndex: 0,
  canGoBack: false,
  canGoNext: false,
  hasResults: false,
  resultsViewedAt: null,
};

// Create the store with enhanced functionality
export const useInventoryStore = create<InventoryState>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // Core functionality
        setCurrentInventory: (inventory) =>
          set((state) => {
            state.currentInventory = inventory;
            if (inventory) {
              state.session = {
                startedAt: new Date(),
                lastUpdatedAt: new Date(),
                timeSpent: 0,
                questionTimeSpent: {},
              };
              state.progress = calculateProgress(0, inventory.questions.length, new Date());
            }
          }),

        addResponse: (response) =>
          set((state) => {
            const existingIndex = state.responses.findIndex(
              (r) => r.questionId === response.questionId,
            );

            if (existingIndex >= 0) {
              state.responses[existingIndex] = {
                ...state.responses[existingIndex],
                ...response,
              };
            } else {
              state.responses.push(response);
            }

            // Update session
            if (state.session) {
              state.session.lastUpdatedAt = new Date();
            }
          }),

        updateResponse: (questionId, optionValue, optionLabel, questionTitle, timeSpent) =>
          set((state) => {
            const existingIndex = state.responses.findIndex((r) => r.questionId === questionId);

            const newResponse: UserResponseOption = {
              questionId,
              optionValue,
              optionLabel,
              questionTitle,
            };

            if (existingIndex >= 0) {
              state.responses[existingIndex] = newResponse;
            } else {
              state.responses.push(newResponse);
            }

            // Track time spent on question
            if (state.session && timeSpent) {
              state.session.questionTimeSpent[questionId] = timeSpent;
              state.session.lastUpdatedAt = new Date();
            }

            // Update navigation state
            const currentQuestion = state.currentInventory?.questions[state.currentQuestionIndex];
            if (currentQuestion) {
              state.canGoNext = true;
            }
          }),

        setResponses: (responses) =>
          set((state) => {
            state.responses = responses;
          }),

        removeResponse: (questionId) =>
          set((state) => {
            state.responses = state.responses.filter((r) => r.questionId !== questionId);
          }),

        // Results management
        setResults: (calculatedScores, interpretationResults) =>
          set((state) => {
            state.calculatedScores = calculatedScores;
            state.interpretationResults = interpretationResults;
            state.hasResults = true;
          }),

        markResultsViewed: () =>
          set((state) => {
            state.resultsViewedAt = new Date();
          }),

        // Consent management
        setConsent: (consentGiven) =>
          set((state) => {
            state.consentGiven = consentGiven;
            state.consentTimestamp = consentGiven ? new Date() : null;
          }),

        acknowledgePrivacy: () =>
          set((state) => {
            state.privacyAcknowledged = true;
          }),

        revokeConsent: () =>
          set((state) => {
            state.consentGiven = false;
            state.consentTimestamp = null;
            state.responses = [];
            state.calculatedScores = null;
            state.interpretationResults = null;
            state.hasResults = false;
          }),

        // Progress management
        updateProgress: (questionIndex) =>
          set((state) => {
            if (state.currentInventory && state.session) {
              state.currentQuestionIndex = questionIndex;
              state.progress = calculateProgress(
                questionIndex,
                state.currentInventory.questions.length,
                state.session.startedAt,
              );
              state.canGoBack = questionIndex > 0;
              state.canGoNext = !!state.responses.find(
                (r) => r.questionId === state.currentInventory?.questions[questionIndex]?.id,
              );
            }
          }),

        startSession: () =>
          set((state) => {
            state.session = {
              startedAt: new Date(),
              lastUpdatedAt: new Date(),
              timeSpent: 0,
              questionTimeSpent: {},
            };
          }),

        updateSession: () =>
          set((state) => {
            if (state.session) {
              const now = new Date();
              const timeDiff = (now.getTime() - state.session.lastUpdatedAt.getTime()) / 1000;
              state.session.timeSpent += timeDiff;
              state.session.lastUpdatedAt = now;
            }
          }),

        endSession: () =>
          set((state) => {
            if (state.session) {
              const now = new Date();
              const timeDiff = (now.getTime() - state.session.lastUpdatedAt.getTime()) / 1000;
              state.session.timeSpent += timeDiff;
              state.session.lastUpdatedAt = now;
            }
          }),

        // Navigation
        setCurrentQuestion: (index) =>
          set((state) => {
            if (
              state.currentInventory &&
              index >= 0 &&
              index < state.currentInventory.questions.length
            ) {
              state.currentQuestionIndex = index;
              get().updateProgress(index);
            }
          }),

        goToNextQuestion: () =>
          set((state) => {
            if (state.currentInventory && get().canNavigateNext()) {
              const newIndex = state.currentQuestionIndex + 1;
              if (newIndex < state.currentInventory.questions.length) {
                state.currentQuestionIndex = newIndex;
                get().updateProgress(newIndex);
              }
            }
          }),

        goToPreviousQuestion: () =>
          set((state) => {
            if (get().canNavigatePrevious()) {
              const newIndex = state.currentQuestionIndex - 1;
              if (newIndex >= 0) {
                state.currentQuestionIndex = newIndex;
                get().updateProgress(newIndex);
              }
            }
          }),

        canNavigateNext: () => {
          const state = get();
          if (!state.currentInventory) return false;

          const currentQuestion = state.currentInventory.questions[state.currentQuestionIndex];
          return !!state.responses.find((r) => r.questionId === currentQuestion?.id);
        },

        canNavigatePrevious: () => {
          const state = get();
          return state.currentQuestionIndex > 0;
        },

        // Error handling
        setLoading: (loading) =>
          set((state) => {
            state.isLoading = loading;
            if (loading) {
              state.error = null;
            }
          }),

        setSubmitting: (submitting) =>
          set((state) => {
            state.isSubmitting = submitting;
            if (submitting) {
              state.error = null;
            }
          }),

        setError: (error) =>
          set((state) => {
            state.error = error;
            state.isLoading = false;
            state.isSubmitting = false;
          }),

        clearError: () =>
          set((state) => {
            state.error = null;
          }),

        // State management
        resetState: () =>
          set((state) => {
            Object.assign(state, initialState);
          }),

        resetToQuestion: (questionIndex) =>
          set((state) => {
            if (
              state.currentInventory &&
              questionIndex >= 0 &&
              questionIndex < state.currentInventory.questions.length
            ) {
              // Keep responses up to the specified question
              const questionIds = state.currentInventory.questions
                .slice(0, questionIndex + 1)
                .map((q) => q.id);

              state.responses = state.responses.filter((r) => questionIds.includes(r.questionId));
              state.currentQuestionIndex = questionIndex;
              state.calculatedScores = null;
              state.interpretationResults = null;
              state.hasResults = false;

              get().updateProgress(questionIndex);
            }
          }),

        // Computed values
        getCompletionPercentage: () => {
          const state = get();
          if (!state.currentInventory) return 0;
          return Math.round(
            (state.responses.length / state.currentInventory.questions.length) * 100,
          );
        },

        getEstimatedTimeRemaining: () => {
          const state = get();
          if (!state.currentInventory) return 0;

          const remainingQuestions =
            state.currentInventory.questions.length - state.responses.length;
          return remainingQuestions * 0.5; // 30 seconds per question
        },

        getTotalTimeSpent: () => {
          const state = get();
          return state.session?.timeSpent || 0;
        },

        getResponseByQuestionId: (questionId) => {
          const state = get();
          return state.responses.find((r) => r.questionId === questionId) || null;
        },

        getAllAnsweredQuestions: () => {
          const state = get();
          return state.responses.map((r) => r.questionId);
        },

        getUnansweredQuestions: () => {
          const state = get();
          if (!state.currentInventory) return [];

          const answeredIds = state.responses.map((r) => r.questionId);
          return state.currentInventory.questions
            .filter((q) => !answeredIds.includes(q.id))
            .map((q) => q.id);
        },

        isCompleted: () => {
          const state = get();
          if (!state.currentInventory) return false;
          return state.responses.length === state.currentInventory.questions.length;
        },

        isValidForSubmission: () => {
          const state = get();
          return (
            !!state.consentGiven &&
            !!state.currentInventory &&
            state.responses.length === (state.currentInventory?.questions.length ?? 0) &&
            !state.isSubmitting
          );
        },
      })),
      {
        name: 'inventory-store',
        partialize: (state) => ({
          // Only persist essential data, not UI state
          currentInventory: state.currentInventory,
          responses: state.responses,
          calculatedScores: state.calculatedScores,
          interpretationResults: state.interpretationResults,
          consentGiven: state.consentGiven,
          consentTimestamp: state.consentTimestamp,
          currentQuestionIndex: state.currentQuestionIndex,
          hasResults: state.hasResults,
          resultsViewedAt: state.resultsViewedAt,
        }),
      },
    ),
    {
      name: 'inventory-store',
    },
  ),
);

// Export helper functions for external use
export const createError = createInventoryError;

// Export selectors for common computed values
export const inventorySelectors = {
  isLoading: (state: InventoryState) => state.isLoading,
  isSubmitting: (state: InventoryState) => state.isSubmitting,
  hasError: (state: InventoryState) => !!state.error,
  canSubmit: (state: InventoryState) => state.isValidForSubmission(),
  completionPercentage: (state: InventoryState) => state.getCompletionPercentage(),
  currentQuestion: (state: InventoryState) =>
    state.currentInventory?.questions[state.currentQuestionIndex] || null,
  currentResponse: (state: InventoryState) => {
    const currentQuestion = state.currentInventory?.questions[state.currentQuestionIndex];
    return currentQuestion ? state.getResponseByQuestionId(currentQuestion.id) : null;
  },
};
