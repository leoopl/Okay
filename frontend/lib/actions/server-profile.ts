'use server';

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

// Profile picture upload
export type ProfilePictureActionResponse = {
  success: boolean;
  message?: string;
  profilePictureUrl?: string;
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

    const currentToken = cookieStore.get('__Secure-access-token')?.value; // Check the HttpOnly cookie
    if (!currentToken) {
      // Try to refresh the token
      const refreshed = await refreshServerToken();
      if (!refreshed) {
        return { success: false, message: 'Sua sessão expirou. Por favor, faça login novamente.' };
      }
    }

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

    const currentToken = cookieStore.get('__Secure-access-token')?.value; // Check the HttpOnly cookie
    if (!currentToken) {
      // Try to refresh the token
      const refreshed = await refreshServerToken();
      if (!refreshed) {
        return { success: false, message: 'Sua sessão expirou. Por favor, faça login novamente.' };
      }
    }

    const response = await fetch(`${apiUrl}/users/update-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
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

    const currentToken = cookieStore.get('__Secure-access-token')?.value; // Check the HttpOnly cookie
    if (!currentToken) {
      // Try to refresh the token
      const refreshed = await refreshServerToken();
      if (!refreshed) {
        return { success: false, message: 'Sua sessão expirou. Por favor, faça login novamente.' };
      }
    }

    const response = await fetch(`${apiUrl}/users/${userId}/consent`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
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
    const accessToken = cookieStore.get('__Secure-access-token')?.value;

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

/**
 * Upload user profile picture
 */
export async function uploadProfilePicture(
  _: ProfilePictureActionResponse | undefined,
  formData: FormData,
): Promise<ProfilePictureActionResponse> {
  try {
    // Get current user session
    const session = await getServerSession();
    if (!session) {
      return { success: false, message: 'Você precisa estar logado para fazer upload da foto' };
    }

    // Get the file from form data
    const file = formData.get('file') as File;
    if (!file || file.size === 0) {
      return { success: false, message: 'Nenhum arquivo foi selecionado' };
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        message: 'Tipo de arquivo não permitido. Use JPG, PNG, GIF ou WEBP',
      };
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return {
        success: false,
        message: 'Arquivo muito grande. Tamanho máximo: 5MB',
      };
    }

    // Make API call to upload profile picture
    const apiUrl = process.env.API_URL;
    const userId = session.id;
    const cookieStore = await cookies();
    const csrfToken = cookieStore.get('csrf_token')?.value || '';

    const currentToken = cookieStore.get('__Secure-access-token')?.value; // Check the HttpOnly cookie
    if (!currentToken) {
      // Try to refresh the token
      const refreshed = await refreshServerToken();
      if (!refreshed) {
        return { success: false, message: 'Sua sessão expirou. Por favor, faça login novamente.' };
      }
    }

    // Create form data for the API
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    const response = await fetch(`${apiUrl}/users/${userId}/profile-picture`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': csrfToken,
      },
      credentials: 'include',
      body: uploadFormData, // Don't set Content-Type for FormData
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          message: 'Sua sessão expirou. Por favor, faça login novamente.',
        };
      }

      const errorData = await response.json();
      return {
        success: false,
        message: errorData.message || 'Erro ao fazer upload da foto',
      };
    }

    const userData = await response.json();

    // IMPORTANT: Revalidate both the profile page AND clear Next.js cache
    revalidatePath('/profile');
    revalidatePath('/profile', 'page'); // Revalidate the specific page

    // Also revalidate the layout to refresh the user session
    revalidatePath('/', 'layout');

    return {
      success: true,
      message: 'Foto de perfil atualizada com sucesso',
      profilePictureUrl: userData.profilePictureUrl,
    };
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    return {
      success: false,
      message: 'Ocorreu um erro ao fazer upload da foto. Tente novamente mais tarde.',
    };
  }
}

/**
 * Delete user profile picture
 */
export async function deleteProfilePicture(
  prevState: ProfilePictureActionResponse | undefined,
  formData: FormData,
): Promise<ProfilePictureActionResponse> {
  try {
    // Get current user session
    const session = await getServerSession();
    if (!session) {
      return { success: false, message: 'Você precisa estar logado para remover a foto' };
    }

    // Make API call to delete profile picture
    const apiUrl = process.env.API_URL;
    const userId = session.id;
    const cookieStore = await cookies();
    const csrfToken = cookieStore.get('csrf_token')?.value || '';

    const currentToken = cookieStore.get('__Secure-access-token')?.value; // Check the HttpOnly cookie
    if (!currentToken) {
      // Try to refresh the token
      const refreshed = await refreshServerToken();
      if (!refreshed) {
        return { success: false, message: 'Sua sessão expirou. Por favor, faça login novamente.' };
      }
    }

    const response = await fetch(`${apiUrl}/users/${userId}/profile-picture`, {
      method: 'DELETE',
      headers: {
        'X-CSRF-Token': csrfToken,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          message: 'Sua sessão expirou. Por favor, faça login novamente.',
        };
      }

      const errorData = await response.json();
      return {
        success: false,
        message: errorData.message || 'Erro ao remover a foto',
      };
    }

    // IMPORTANT: Revalidate both the profile page AND clear Next.js cache
    revalidatePath('/profile');
    revalidatePath('/profile', 'page');

    // Also revalidate the layout to refresh the user session
    revalidatePath('/', 'layout');

    return {
      success: true,
      message: 'Foto de perfil removida com sucesso',
    };
  } catch (error) {
    console.error('Error deleting profile picture:', error);
    return {
      success: false,
      message: 'Ocorreu um erro ao remover a foto. Tente novamente mais tarde.',
    };
  }
}
