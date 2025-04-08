import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.API_URL;

/**
 * This server-side route acts as a proxy for token refresh
 * It's safer to handle refresh tokens on the server-side
 */
export async function POST(request: NextRequest) {
  try {
    // Forward the refresh request to the backend API
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward cookies (including refresh token)
        Cookie: request.headers.get('cookie') || '',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      // If refresh failed, clear any existing tokens
      (
        await // If refresh failed, clear any existing tokens
        cookies()
      ).delete('access_token');
      (await cookies()).delete('csrf_token');

      // Return error
      return NextResponse.json(
        {
          success: false,
          message: 'Token refresh failed',
        },
        {
          status: response.status,
        },
      );
    }

    // Parse the successful response
    const data = await response.json();

    // Set the new access token in a cookie
    if (data.accessToken) {
      (await cookies()).set({
        name: 'access_token',
        value: data.accessToken,
        httpOnly: false, // Must be false to be accessible by client
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: data.expiresIn || 900, // Default 15 min in seconds
      });
    }

    // Set the CSRF token if provided
    if (data.csrfToken) {
      (await cookies()).set({
        name: 'csrf_token',
        value: data.csrfToken,
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60, // 24 hours
      });
    }

    // Return success with new token info
    return NextResponse.json({
      success: true,
      accessToken: data.accessToken,
      expiresIn: data.expiresIn,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred during token refresh',
      },
      {
        status: 500,
      },
    );
  }
}
