import { NextRequest } from 'next/server';
import { auth0 } from '@/lib/auth0';

// Handle login, callback, logout, and other Auth0 routes
export const GET = auth0.handleAuth();
export const POST = auth0.handleAuth();
