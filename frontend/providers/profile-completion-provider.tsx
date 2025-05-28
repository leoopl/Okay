'use client';

import { ProfileCompletionDialog } from '@/components/profile/profile-completion-dialog';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

// Pages where we should check for profile completion
const PROFILE_CHECK_PAGES = ['/dashboard', '/profile', '/journal', '/medication', '/inventory'];

export function ProfileCompletionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [shouldCheck, setShouldCheck] = useState(false);

  useEffect(() => {
    // Only check on specific pages and after a short delay
    if (PROFILE_CHECK_PAGES.includes(pathname)) {
      const timer = setTimeout(() => {
        setShouldCheck(true);
      }, 500);

      return () => clearTimeout(timer);
    } else {
      setShouldCheck(false);
    }
  }, [pathname]);

  return (
    <>
      {children}
      {shouldCheck && <ProfileCompletionDialog />}
    </>
  );
}
