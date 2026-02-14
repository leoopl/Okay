'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { createClient, logAuditTrail } from '@/lib/supabase/server';
import {
  SignInSchema,
  SignUpSchema,
  ForgotPasswordSchema,
  type SignInInput,
  type SignUpInput,
  type ForgotPasswordInput,
} from '@/lib/schemas/auth-schemas';
import { ActionResult } from '../definitions';
import { headers } from 'next/headers';

/**
 * Get client IP address and user agent for audit logging
 */
export async function getRequestMetadata() {
  const headersList = await headers();
  const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';
  const userAgent = headersList.get('user-agent') || 'unknown';

  return { ipAddress, userAgent };
}

// ============= Server Actions =============

/**
 * Sign in action with email and password
 */
export async function signIn(input: SignInInput): Promise<ActionResult> {
  try {
    // Validate input
    const validatedData = SignInSchema.parse(input);
    const supabase = await createClient();
    const { ipAddress, userAgent } = await getRequestMetadata();

    // Attempt sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email: validatedData.email,
      password: validatedData.password,
    });

    if (error) {
      // Log failed login attempt
      await supabase.from('audit_logs').insert({
        action: 'failed_login',
        resource: 'auth',
        details: { email: validatedData.email, error: error.message },
        ip_address: ipAddress,
        user_agent: userAgent,
      });

      return {
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Email ou senha inválidos',
        },
      };
    }

    // Log successful login
    await logAuditTrail({
      action: 'login',
      resource: 'auth',
      details: { email: validatedData.email },
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

    console.error('Sign in error:', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ocorreu um erro ao fazer login',
      },
    };
  }
}

/**
 * Sign up action with profile creation
 */
export async function signUp(input: SignUpInput): Promise<ActionResult> {
  try {
    // Validate input
    const validatedData = SignUpSchema.parse(input);
    const supabase = await createClient();
    const { ipAddress, userAgent } = await getRequestMetadata();

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: validatedData.email,
      password: validatedData.password,
      options: {
        data: {
          name: validatedData.name,
        },
      },
    });

    if (authError) {
      return {
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: authError.message,
        },
      };
    }

    if (!authData.user) {
      return {
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Falha ao criar usuário',
        },
      };
    }

    // Create profile
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      email: validatedData.email,
      name: validatedData.name,
    });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Note: We don't delete the auth user here as it might be a temporary issue
      // The user can still sign in and complete their profile later
    }

    // Assign default role
    const { data: defaultRole } = await supabase
      .from('roles')
      .select('id')
      .eq('is_default', true)
      .single();

    if (defaultRole) {
      await supabase.from('user_roles').insert({
        user_id: authData.user.id,
        role_id: defaultRole.id,
      });
    }

    // Log account creation
    await supabase.from('audit_logs').insert({
      user_id: authData.user.id,
      action: 'create',
      resource: 'profile',
      resource_id: authData.user.id,
      details: { email: validatedData.email },
      ip_address: ipAddress,
      user_agent: userAgent,
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

    console.error('Sign up error:', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ocorreu um erro ao criar sua conta',
      },
    };
  }
}

/**
 * Sign out action — clears server-side cookies (including httpOnly) and logs audit trail.
 * Client handles navigation via window.location.replace('/').
 */
export async function signOut(): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { ipAddress, userAgent } = await getRequestMetadata();

    // Get current user for audit log
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Log sign out
    if (user) {
      await logAuditTrail({
        action: 'logout',
        resource: 'auth',
        ipAddress,
        userAgent,
      });
    }

    // Sign out — server client clears cookies via Next.js cookies() API
    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Erro ao fazer logout',
        },
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ocorreu um erro ao fazer logout',
      },
    };
  }
}

/**
 * Forgot password action - sends password reset email
 */
export async function forgotPassword(input: ForgotPasswordInput): Promise<ActionResult> {
  try {
    // Validate input
    const validatedData = ForgotPasswordSchema.parse(input);
    const supabase = await createClient();
    const { ipAddress, userAgent } = await getRequestMetadata();

    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(validatedData.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/reset-password`,
    });

    if (error) {
      // Log failed password reset attempt
      await supabase.from('audit_logs').insert({
        action: 'failed_login',
        resource: 'auth',
        details: { email: validatedData.email, error: error.message },
        ip_address: ipAddress,
        user_agent: userAgent,
      });

      return {
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Erro ao enviar email de recuperação',
        },
      };
    }

    // Log successful password reset request
    await supabase.from('audit_logs').insert({
      action: 'password_reset_request',
      resource: 'auth',
      details: { email: validatedData.email },
      ip_address: ipAddress,
      user_agent: userAgent,
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

    console.error('Forgot password error:', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ocorreu um erro ao solicitar recuperação de senha',
      },
    };
  }
}

/**
 * Form action wrapper for Next.js form submissions
 */
export async function signInFormAction(
  prevState: any,
  formData: FormData,
): Promise<{ message?: string; success?: boolean }> {
  const result = await signIn({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  });

  if (result.success) {
    const redirectTo = (formData.get('redirect') as string) || '/profile';
    redirect(redirectTo);
  }

  return {
    message: result.success ? undefined : result.error.message,
    success: result.success,
  };
}
/**
 * Form action wrapper for Next.js form submissions
 */
export async function signUpFormAction(
  prevState: any,
  formData: FormData,
): Promise<{ message?: string; success?: boolean }> {
  const result = await signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
    name: formData.get('name') as string,
    consentToDataProcessing: false,
    consentToMarketing: false,
    consentToResearch: false,
  });

  if (result.success) {
    const redirectTo = (formData.get('redirect') as string) || '/profile';
    redirect(redirectTo);
  }

  return {
    message: result.success ? undefined : result.error.message,
    success: result.success,
  };
}
