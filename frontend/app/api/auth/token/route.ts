import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';

export async function GET(req: NextRequest) {
  const session = await auth0.getSession(req);

  if (!session || !session.accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Return only the access token, not the entire session
  return NextResponse.json({ accessToken: session.accessToken });
}
