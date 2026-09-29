import { notFound } from 'next/navigation';

// Patient-provider connections are unfinished, so this route is hidden until the UI is
// complete. The real page is in ./provider-validations-page.tsx; to enable it, replace this file's
// contents with: export { default } from './provider-validations-page';
export default function AdminProviderValidationsPage() {
  notFound();
}
