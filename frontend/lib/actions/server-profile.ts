'use server';

import { z } from 'zod';
import { cookies } from 'next/headers';
import { getServerSession, refreshServerToken } from './server-auth';
import { revalidatePath } from 'next/cache';
import { ProfileFormSchema, PasswordChangeSchema } from '@/lib/definitions';

// Common response type for all profile actions
export type ProfileActionResponse = {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

/**
 * Update user profile
 */
export async function updateProfile(
  prevState: ProfileActionResponse | undefined,
  formData: FormData,
): Promise<ProfileActionResponse> {
  try {
    // Get current user session
    const session = await getServerSession();
    if (!session) {
      return { success: false, message: 'Você precisa estar logado para atualizar seu perfil' };
    }

    // Extract and validate form data
    const validatedFields = ProfileFormSchema.safeParse({
      name: formData.get('name'),
      surname: formData.get('surname'),
      email: formData.get('email'),
      gender: formData.get('gender'),
      birthdate: formData.get('birthdate'),
    });

    if (!validatedFields.success) {
      return {
        success: false,
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    // Make API call to update user profile
    const apiUrl = process.env.API_URL;
    const userId = session.id;
    const cookieStore = await cookies();
    const csrfToken = cookieStore.get('csrf_token')?.value || '';
    const accessToken = cookieStore.get('access_token')?.value;

    // Check if we have an access token
    if (!accessToken) {
      // Try to refresh the token
      const refreshed = await refreshServerToken();
      if (!refreshed) {
        return { success: false, message: 'Sua sessão expirou. Por favor, faça login novamente.' };
      }
    }

    // Get the potentially refreshed token
    const currentToken = cookieStore.get('access_token')?.value;

    const response = await fetch(`${apiUrl}/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        // Add Authorization header with the Bearer token
        Authorization: `Bearer ${currentToken}`,
      },
      credentials: 'include', // This sends cookies automatically
      body: JSON.stringify(validatedFields.data),
    });

    if (!response.ok) {
      // Check if it's an authentication error
      if (response.status === 401) {
        return {
          success: false,
          message: 'Sua sessão expirou. Por favor, faça login novamente.',
        };
      }

      const errorData = await response.json();
      return {
        success: false,
        message: errorData.message || 'Erro ao atualizar perfil',
      };
    }

    // Revalidate user profile path
    revalidatePath('/profile');

    return {
      success: true,
      message: 'Perfil atualizado com sucesso',
    };
  } catch (error) {
    console.error('Error updating profile:', error);
    return {
      success: false,
      message: 'Ocorreu um erro ao atualizar seu perfil. Tente novamente mais tarde.',
    };
  }
}

/**
 * Change user password
 */
export async function changePassword(
  prevState: ProfileActionResponse | undefined,
  formData: FormData,
): Promise<ProfileActionResponse> {
  try {
    // Get current user session
    const session = await getServerSession();
    if (!session) {
      return { success: false, message: 'Você precisa estar logado para alterar sua senha' };
    }

    // Extract and validate form data
    const validatedFields = PasswordChangeSchema.safeParse({
      currentPassword: formData.get('currentPassword'),
      newPassword: formData.get('newPassword'),
      confirmPassword: formData.get('confirmPassword'),
    });

    if (!validatedFields.success) {
      return {
        success: false,
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    // Make API call to change password
    const apiUrl = process.env.API_URL;
    const cookieStore = await cookies();
    const csrfToken = cookieStore.get('csrf_token')?.value || '';
    const accessToken = cookieStore.get('access_token')?.value;

    // Check if we have an access token
    if (!accessToken) {
      // Try to refresh the token
      const refreshed = await refreshServerToken();
      if (!refreshed) {
        return { success: false, message: 'Sua sessão expirou. Por favor, faça login novamente.' };
      }
    }

    // Get the potentially refreshed token
    const currentToken = cookieStore.get('access_token')?.value;

    const response = await fetch(`${apiUrl}/users/update-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        // Add Authorization header with the Bearer token
        Authorization: `Bearer ${currentToken}`,
      },
      credentials: 'include', // This sends cookies automatically
      body: JSON.stringify({
        currentPassword: validatedFields.data.currentPassword,
        newPassword: validatedFields.data.newPassword,
      }),
    });

    if (!response.ok) {
      // Check if it's an authentication error
      if (response.status === 401) {
        return {
          success: false,
          message: 'Senha atual incorreta ou sessão expirada.',
        };
      }

      const errorData = await response.json();
      return {
        success: false,
        message: errorData.message || 'Erro ao alterar senha',
      };
    }

    return {
      success: true,
      message: 'Senha alterada com sucesso',
    };
  } catch (error) {
    console.error('Error changing password:', error);
    return {
      success: false,
      message: 'Ocorreu um erro ao alterar sua senha. Tente novamente mais tarde.',
    };
  }
}

/**
 * Update user consent settings
 */
export async function updateConsent(
  prevState: ProfileActionResponse | undefined,
  formData: FormData,
): Promise<ProfileActionResponse> {
  try {
    // Get current user session
    const session = await getServerSession();
    if (!session) {
      return {
        success: false,
        message: 'Você precisa estar logado para atualizar suas preferências de consentimento',
      };
    }

    // Make API call to update consent
    const apiUrl = process.env.API_URL;
    const userId = session.id;
    const cookieStore = await cookies();
    const csrfToken = cookieStore.get('csrf_token')?.value || '';
    const accessToken = cookieStore.get('access_token')?.value;

    // Check if we have an access token
    if (!accessToken) {
      // Try to refresh the token
      const refreshed = await refreshServerToken();
      if (!refreshed) {
        return { success: false, message: 'Sua sessão expirou. Por favor, faça login novamente.' };
      }
    }

    // Get the potentially refreshed token
    const currentToken = cookieStore.get('access_token')?.value;

    const response = await fetch(`${apiUrl}/users/${userId}/consent`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        // Add Authorization header with the Bearer token
        Authorization: `Bearer ${currentToken}`,
      },
      credentials: 'include', // This sends cookies automatically
      body: JSON.stringify({
        consentToDataProcessing: formData.get('consentToDataProcessing') === 'on',
        consentToResearch: formData.get('consentToResearch') === 'on',
        consentToMarketing: formData.get('consentToMarketing') === 'on',
      }),
    });

    if (!response.ok) {
      // Check if it's an authentication error
      if (response.status === 401) {
        return {
          success: false,
          message: 'Sua sessão expirou. Por favor, faça login novamente.',
        };
      }

      const errorData = await response.json();
      return {
        success: false,
        message: errorData.message || 'Erro ao atualizar preferências de consentimento',
      };
    }

    // Revalidate user profile path
    revalidatePath('/profile');

    return {
      success: true,
      message: 'Preferências de consentimento atualizadas com sucesso',
    };
  } catch (error) {
    console.error('Error updating consent:', error);
    return {
      success: false,
      message:
        'Ocorreu um erro ao atualizar suas preferências de consentimento. Tente novamente mais tarde.',
    };
  }
}

/**
 * Get current user profile data
 */
export async function getUserProfile() {
  try {
    const session = await getServerSession();
    if (!session) {
      return null;
    }

    const apiUrl = process.env.API_URL;
    const userId = session.id;
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;

    if (!accessToken) {
      return null;
    }

    const response = await fetch(`${apiUrl}/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: 'include',
      next: { tags: ['user-profile'] },
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}
