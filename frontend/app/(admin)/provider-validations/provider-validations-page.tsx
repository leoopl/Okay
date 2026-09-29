import { listValidationRequests } from '@/lib/actions/supabase-provider-validation';
import AdminProviderValidationsClient from './admin-provider-validations-client';

export default async function AdminProviderValidationsPage() {
  const { data, error } = await listValidationRequests('all');
  return <AdminProviderValidationsClient initialRequests={data} initialError={error} />;
}
