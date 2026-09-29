import { notFound } from 'next/navigation';

// Patient-provider connections are unfinished, so this route is hidden until the UI is
// complete. The real page is in ./validation-page.tsx; to enable it, replace this file's
// contents with: export { default } from './validation-page';
export default function ProfessionalValidationPage() {
  notFound();
}
