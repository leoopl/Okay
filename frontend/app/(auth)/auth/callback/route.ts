import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Redirect to the v1 callback route
  const url = new URL(request.url);
  const v1Url = new URL('/auth/v1/callback', url.origin);

  // Preserve all search params
  v1Url.search = url.search;

  return NextResponse.redirect(v1Url);
}
