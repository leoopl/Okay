import { redirect } from 'next/navigation';
import { getUserWithRolesAndPermissions } from '@/lib/supabase/server';
import { getMyValidationRequest } from '@/lib/actions/supabase-provider-validation';
import ProfessionalValidationClient from './professional-validation-client';

export default async function ProfessionalValidationPage() {
  const userData = await getUserWithRolesAndPermissions();
  if (!userData) redirect('/signin?returnUrl=/profile/professional');

  // If already a healthcare_provider, no point in showing the form
  const isProvider = userData.hasRole('healthcare_provider');
  const existingRequest = await getMyValidationRequest();

  return (
    <ProfessionalValidationClient
      isProvider={isProvider}
      existingRequest={existingRequest}
      userId={userData.user.id}
    />
  );
}
