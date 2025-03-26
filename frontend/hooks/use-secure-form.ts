'use client';

import { useState, useCallback } from 'react';
import { secureClearData } from '@/lib/encryption-utils';

/**
 * Hook for securely handling sensitive form data
 * Provides methods to handle form changes and securely clear data after submission
 */
export function useSecureForm<T>(initialState: T) {
  const [formData, setFormData] = useState<T>(initialState);

  /**
   * Update form data for a specific field
   */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    },
    [],
  );

  /**
   * Update form data directly with an object
   */
  const updateFormData = useCallback((data: Partial<T>) => {
    setFormData((prev) => ({
      ...prev,
      ...data,
    }));
  }, []);

  /**
   * Securely clear all form data
   * Use after successful form submission to remove sensitive data from memory
   */
  const clearFormData = useCallback(() => {
    secureClearData(formData);
    setFormData(initialState);
  }, [formData, initialState]);

  /**
   * Reset form data to initial state
   */
  const resetFormData = useCallback(() => {
    setFormData(initialState);
  }, [initialState]);

  return {
    formData,
    handleChange,
    updateFormData,
    clearFormData,
    resetFormData,
  };
}
