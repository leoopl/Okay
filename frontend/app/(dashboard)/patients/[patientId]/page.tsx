import { notFound } from 'next/navigation';

// Patient-provider connections are unfinished, so this route is hidden until the UI is
// complete. The real page is in ./patient-detail-page.tsx; to enable it, replace this file's
// contents with: export { default } from './patient-detail-page';
export default function PatientDetailPage() {
  notFound();
}
