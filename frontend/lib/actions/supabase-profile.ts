'use server';

import { revalidatePath } from 'next/cache';
import { createClient, logAuditTrail } from '@/lib/supabase/server';
import {
  PasswordChangeSchema,
  UpdateProfileInput,
  UpdateProfileSchema,
} from '../schemas/profile-schemas';
import { ActionResult } from '../definitions';
import { z } from 'zod';
import { Database } from '../supabase/database.types';
import { getRequestMetadata } from './supabase-auth';

// Define response types locally
export type ProfileActionResponse = {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

export type ProfilePictureActionResponse = {
  success: boolean;
  message?: string;
  profilePictureUrl?: string;
};

/**
 * Update profile action
 */
export async function updateProfile(input: UpdateProfileInput): Promise<ActionResult> {
  try {
    // Validate input
    const validatedData = UpdateProfileSchema.parse(input);
    const supabase = await createClient();
    const { ipAddress, userAgent } = await getRequestMetadata();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Usuário não autenticado',
        },
      };
    }

    // Prepare update data
    const updateData: Database['public']['Tables']['profiles']['Update'] = {
      name: validatedData.name,
      surname: validatedData.surname,
      email: validatedData.email,
      birthdate: validatedData.birthdate,
      gender: validatedData.gender,
      updated_at: new Date().toISOString(),
    };

    // Handle consent updates separately to track changes
    // if (
    //   validatedData.consentToMarketing !== undefined ||
    //   validatedData.consentToResearch !== undefined
    // ) {
    //   updateData.consent_to_marketing = validatedData.consentToMarketing;
    //   updateData.consent_to_research = validatedData.consentToResearch;
    //   updateData.consent_updated_at = new Date().toISOString();

    //   // Log consent update
    //   await logAuditTrail({
    //     action: 'consent_updated',
    //     resource: 'profile',
    //     resourceId: user.id,
    //     details: {
    //       marketing: validatedData.consentToMarketing,
    //       research: validatedData.consentToResearch,
    //     },
    //     ipAddress,
    //     userAgent,
    //   });
    // }

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id);

    if (updateError) {
      return {
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: 'Erro ao atualizar perfil',
        },
      };
    }

    // Log profile update
    await logAuditTrail({
      action: 'update',
      resource: 'profile',
      resourceId: user.id,
      details: { fields: Object.keys(updateData) },
      ipAddress,
      userAgent,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.issues[0].message,
        },
      };
    }

    console.error('Update profile error:', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ocorreu um erro ao atualizar o perfil',
      },
    };
  }
}

/**
 * Form action wrapper for Next.js form submissions
 */
export async function updateProfileFormAction(
  prevState: ProfileActionResponse | undefined,
  formData: FormData,
): Promise<ProfileActionResponse> {
  try {
    const data = {
      name: formData.get('name') as string,
      surname: formData.get('surname') as string | null,
      email: formData.get('email') as string,
      gender: (formData.get('gender') as UpdateProfileInput['gender']) || null,
      birthdate: (formData.get('birthdate') as string) || null,
    };
    const result = await updateProfile(data);
    // // Convert empty strings to undefined for optional fields
    // const cleanedData = {
    //   ...data,
    //   surname: data.surname === '' ? undefined : data.surname,
    //   gender: data.gender === null ? undefined : data.gender,
    //   birthdate: data.birthdate === '' ? undefined : data.birthdate,
    // };

    // const result = await updateProfile(cleanedData);

    if (result.success) {
      revalidatePath('/profile');
      return {
        success: true,
        message: 'Perfil atualizado com sucesso',
      };
    }

    return {
      success: false,
      message: result.error.message,
    };
  } catch (error) {
    console.error('Update profile form error:', error);
    return {
      success: false,
      message: 'Erro ao atualizar perfil',
    };
  }
}

export async function changePassword(
  prevState: ProfileActionResponse | undefined,
  formData: FormData,
): Promise<ProfileActionResponse> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    return { success: false, message: 'Você precisa estar logado para alterar sua senha' };
  }

  // Validate form data
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

  try {
    // Update password in Supabase
    const { error } = await supabase.auth.updateUser({
      password: validatedFields.data.newPassword,
    });

    if (error) {
      console.error('Error updating password:', error);
      return {
        success: false,
        message: error.message || 'Erro ao alterar senha',
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

export async function updateConsent(
  prevState: ProfileActionResponse | undefined,
  formData: FormData,
): Promise<ProfileActionResponse> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    return {
      success: false,
      message: 'Você precisa estar logado para atualizar suas preferências de consentimento',
    };
  }

  try {
    // Update consent preferences
    const { error } = await supabase
      .from('profiles')
      .update({
        consent_to_data_processing: formData.get('consentToDataProcessing') === 'on',
        consent_to_research: formData.get('consentToResearch') === 'on',
        consent_to_marketing: formData.get('consentToMarketing') === 'on',
        consent_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.user.id);

    if (error) {
      console.error('Error updating consent:', error);
      return {
        success: false,
        message: 'Erro ao atualizar preferências de consentimento',
      };
    }

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

export async function getUserProfile() {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  return profile;
}

export async function uploadProfilePicture(
  prevState: ProfilePictureActionResponse | undefined,
  formData: FormData,
): Promise<ProfilePictureActionResponse> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
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

  try {
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${session.user.id}/profile.${fileExt}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('profile-pictures')
      .upload(fileName, file, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return {
        success: false,
        message: `Erro ao fazer upload da foto: ${uploadError.message || 'Erro desconhecido'}`,
      };
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from('profile-pictures').getPublicUrl(fileName);

    // Update profile with new picture URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        profile_picture_url: urlData.publicUrl,
        profile_picture_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.user.id);

    if (updateError) {
      console.error('Error updating profile picture URL:', updateError);
      return {
        success: false,
        message: `Erro ao atualizar foto no perfil: ${updateError.message || 'Erro desconhecido'}`,
      };
    }

    revalidatePath('/profile');
    return {
      success: true,
      message: 'Foto de perfil atualizada com sucesso',
      profilePictureUrl: urlData.publicUrl,
    };
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    return {
      success: false,
      message: 'Ocorreu um erro ao fazer upload da foto. Tente novamente mais tarde.',
    };
  }
}

export async function deleteProfilePicture(
  _prevState: ProfilePictureActionResponse | undefined,
  _formData: FormData,
): Promise<ProfilePictureActionResponse> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    return { success: false, message: 'Você precisa estar logado para remover a foto' };
  }

  try {
    // Get current profile to check if there's a picture to delete
    const { data: profile } = await supabase
      .from('profiles')
      .select('profile_picture_url')
      .eq('id', session.user.id)
      .single();

    // Delete from storage if exists
    if (profile?.profile_picture_url) {
      const fileName = `${session.user.id}/profile.jpg`; // Assuming jpg, could parse from URL
      await supabase.storage.from('profile-pictures').remove([fileName]);
    }

    // Update profile to remove picture URL
    const { error } = await supabase
      .from('profiles')
      .update({
        profile_picture_url: null,
        profile_picture_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.user.id);

    if (error) {
      console.error('Error removing profile picture:', error);
      return {
        success: false,
        message: 'Erro ao remover a foto',
      };
    }

    revalidatePath('/profile');
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
