import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/profile';
  const action = searchParams.get('action'); // 'link' for account linking
  const error = searchParams.get('error');
  const error_description = searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    console.error('OAuth callback error:', error, error_description);
    const errorRedirect =
      action === 'link'
        ? `/profile?error=oauth_link_error&message=${encodeURIComponent(error_description || error)}`
        : `/signin?error=oauth_error&message=${encodeURIComponent(error_description || error)}`;
    return NextResponse.redirect(`${origin}${errorRedirect}`);
  }

  if (code) {
    const supabase = await createClient();

    try {
      // Exchange code for session
      const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

      if (sessionError) {
        console.error('Error exchanging code for session:', sessionError);
        const errorRedirect =
          action === 'link'
            ? `/profile?error=session_error&message=${encodeURIComponent(sessionError.message)}`
            : `/signin?error=session_error&message=${encodeURIComponent(sessionError.message)}`;
        return NextResponse.redirect(`${origin}${errorRedirect}`);
      }

      // Successful authentication/linking
      if (action === 'link') {
        // Account linking successful
        return NextResponse.redirect(`${origin}/profile?success=account_linked`);
      }

      // Regular sign in successful
      return NextResponse.redirect(`${origin}${next}`);
    } catch (error) {
      console.error('Unexpected error in auth callback:', error);
      return NextResponse.redirect(`${origin}/signin?error=unexpected_error`);
    }
  }

  // No code provided
  return NextResponse.redirect(`${origin}/signin?error=no_code`);
}
