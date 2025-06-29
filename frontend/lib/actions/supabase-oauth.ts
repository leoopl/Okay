'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function signInWithGoogle() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/auth/v1/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    console.error('Error signing in with Google:', error);
    redirect('/signin?error=oauth_error');
  }

  redirect(data.url);
}

export async function linkGoogleAccount() {
  const supabase = await createClient();

  // Check if user is authenticated
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    redirect('/signin');
  }

  const { data, error } = await supabase.auth.linkIdentity({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/auth/v1/callback?action=link`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    console.error('Error linking Google account:', error);
    redirect('/profile?error=link_error');
  }

  redirect(data.url);
}

export async function unlinkGoogleAccount() {
  const supabase = await createClient();

  // Check if user is authenticated
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    redirect('/signin');
  }

  try {
    // Get user identities first to find the Google identity
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: 'Erro ao buscar informações do usuário' };
    }

    const googleIdentity = user.identities?.find((identity) => identity.provider === 'google');

    if (!googleIdentity) {
      return { success: false, message: 'Conta Google não encontrada' };
    }

    const { error } = await supabase.auth.unlinkIdentity(googleIdentity);

    if (error) {
      console.error('Error unlinking Google account:', error);
      return { success: false, message: 'Erro ao desvincular conta Google' };
    }

    revalidatePath('/profile');
    return { success: true, message: 'Conta Google desvinculada com sucesso' };
  } catch (error) {
    console.error('Error unlinking Google account:', error);
    return { success: false, message: 'Erro interno do servidor' };
  }
}

export async function getUserIdentities() {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    return null;
  }

  try {
    // Get user identities from Supabase Auth
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      console.error('Error fetching user identities:', error);
      return null;
    }

    return user.identities || [];
  } catch (error) {
    console.error('Error fetching user identities:', error);
    return null;
  }
}
