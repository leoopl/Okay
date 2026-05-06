'use server';

import { revalidatePath } from 'next/cache';
import {
  createClient,
  getUserWithRolesAndPermissions,
  logAuditTrail,
} from '@/lib/supabase/server';
import type { Database, Tables } from '@/lib/supabase/database.types';

type Testimonial = Tables<'testimonials'>;
type TestimonialStatus = Database['public']['Enums']['testimonial_status'];

export type AdminActionResult = {
  success: boolean;
  message?: string;
};

async function requireAdmin() {
  const userData = await getUserWithRolesAndPermissions();
  if (!userData || !userData.hasRole('admin')) {
    return { ok: false as const, message: 'Acesso negado' };
  }
  return { ok: true as const, userId: userData.user.id };
}

export async function listTestimonialsByStatus(
  status: TestimonialStatus | 'all' = 'all',
): Promise<{ data: Testimonial[]; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { data: [], error: auth.message };

  const supabase = await createClient();
  let query = supabase
    .from('testimonials')
    .select('*')
    .order('created_at', { ascending: false });

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error listing testimonials:', error);
    return { data: [], error: 'Erro ao carregar depoimentos' };
  }
  return { data: data ?? [] };
}

export async function approveTestimonial(id: string): Promise<AdminActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, message: auth.message };

  const supabase = await createClient();
  const { error } = await supabase
    .from('testimonials')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by_id: auth.userId,
    })
    .eq('id', id);

  if (error) {
    console.error('Error approving testimonial:', error);
    return { success: false, message: 'Erro ao aprovar depoimento' };
  }

  await logAuditTrail({
    action: 'update',
    resource: 'testimonials',
    resourceId: id,
    details: { transition: 'pending_to_approved' },
  });

  revalidatePath('/admin/testimonials');
  revalidatePath('/');
  return { success: true, message: 'Depoimento aprovado' };
}

export async function rejectTestimonial(id: string): Promise<AdminActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, message: auth.message };

  const supabase = await createClient();
  const { error } = await supabase
    .from('testimonials')
    .update({ status: 'rejected' })
    .eq('id', id);

  if (error) {
    console.error('Error rejecting testimonial:', error);
    return { success: false, message: 'Erro ao rejeitar depoimento' };
  }

  await logAuditTrail({
    action: 'update',
    resource: 'testimonials',
    resourceId: id,
    details: { transition: 'pending_to_rejected' },
  });

  revalidatePath('/admin/testimonials');
  return { success: true, message: 'Depoimento rejeitado' };
}

export async function deleteTestimonial(id: string): Promise<AdminActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, message: auth.message };

  const supabase = await createClient();
  const { error } = await supabase.from('testimonials').delete().eq('id', id);

  if (error) {
    console.error('Error deleting testimonial:', error);
    return { success: false, message: 'Erro ao excluir depoimento' };
  }

  await logAuditTrail({
    action: 'delete',
    resource: 'testimonials',
    resourceId: id,
  });

  revalidatePath('/admin/testimonials');
  revalidatePath('/');
  return { success: true, message: 'Depoimento excluído' };
}
