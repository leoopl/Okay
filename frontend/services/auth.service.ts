// import { ApiClient } from '@/lib/api-client';

// export interface User {
//   id: string;
//   email: string;
//   name: string;
//   surname?: string;
//   roles: string[];
//   profilePictureUrl?: string;
// }

// export interface AuthResponse {
//   accessToken: string;
//   tokenType: string;
//   expiresIn: number;
//   csrfToken: string;
//   isNewUser: boolean;
//   user: User;
// }

// export interface OAuthStatus {
//   hasPassword: boolean;
//   linkedAccounts: {
//     google: boolean;
//     auth0: boolean;
//   };
//   primaryProvider: string | null;
//   canUnlinkOAuth: boolean;
// }

// /**
//  * Authentication service for handling OAuth flows
//  */
// export class AuthService {
//   private static readonly STORAGE_KEYS = {
//     ACCESS_TOKEN: 'accessToken',
//     CSRF_TOKEN: 'csrfToken',
//     USER: 'user',
//     OAUTH_STATE: 'oauthState',
//     REDIRECT_URL: 'redirectUrl',
//   };

//   private apiService: ApiClient;

//   constructor(apiService: ApiClient) {
//     this.apiService = apiService;
//   }

//   /**
//    * Initiates Google OAuth login flow
//    */
//   initiateGoogleLogin(redirectUrl?: string): void {
//     // Store redirect URL for post-login navigation
//     if (redirectUrl) {
//       localStorage.setItem(AuthService.STORAGE_KEYS.REDIRECT_URL, redirectUrl);
//     }

//     // Generate and store state for CSRF protection
//     const state = this.generateState();
//     localStorage.setItem(AuthService.STORAGE_KEYS.OAUTH_STATE, state);

//     // Redirect to backend OAuth endpoint
//     const oauthUrl = new URL('/api/auth/google', this.apiService.getBaseUrl());
//     oauthUrl.searchParams.set('state', state);

//     if (redirectUrl) {
//       oauthUrl.searchParams.set('redirect_url', redirectUrl);
//     }

//     window.location.href = oauthUrl.toString();
//   }

//   /**
//    * Initiates Google account linking for existing users
//    */
//   linkGoogleAccount(): void {
//     const accessToken = this.getAccessToken();
//     if (!accessToken) {
//       throw new Error('User must be authenticated to link Google account');
//     }

//     // Generate state for CSRF protection
//     const state = this.generateState();
//     localStorage.setItem(AuthService.STORAGE_KEYS.OAUTH_STATE, state);

//     const linkUrl = new URL('/api/auth/google/link', this.apiService.getBaseUrl());
//     linkUrl.searchParams.set('state', state);

//     window.location.href = linkUrl.toString();
//   }

//   /**
//    * Unlinks Google account from current user
//    */
//   async unlinkGoogleAccount(): Promise<void> {
//     const response = await this.apiService.post('/auth/google/unlink');

//     if (!response.ok) {
//       throw new Error('Failed to unlink Google account');
//     }

//     // Refresh user data after unlinking
//     await this.refreshUserData();
//   }

//   /**
//    * Handles OAuth callback from backend
//    */
//   async handleOAuthCallback(): Promise<{ success: boolean; error?: string }> {
//     try {
//       const urlParams = new URLSearchParams(window.location.search);
//       const error = urlParams.get('error');
//       const errorDescription = urlParams.get('error_description');

//       // Check for OAuth errors
//       if (error) {
//         this.clearOAuthState();
//         return {
//           success: false,
//           error: errorDescription || this.getErrorMessage(error),
//         };
//       }

//       // Validate state parameter
//       const state = urlParams.get('state');
//       const storedState = localStorage.getItem(AuthService.STORAGE_KEYS.OAUTH_STATE);

//       if (!state || state !== storedState) {
//         this.clearOAuthState();
//         return {
//           success: false,
//           error: 'Security validation failed. Please try again.',
//         };
//       }

//       // OAuth success is handled by the backend redirect
//       // The backend should have set cookies and redirected here with success parameters
//       const accessToken = urlParams.get('access_token');
//       const csrfToken = urlParams.get('csrf_token');
//       const userParam = urlParams.get('user');

//       if (accessToken && csrfToken && userParam) {
//         // Store auth data
//         localStorage.setItem(AuthService.STORAGE_KEYS.ACCESS_TOKEN, accessToken);
//         localStorage.setItem(AuthService.STORAGE_KEYS.CSRF_TOKEN, csrfToken);

//         try {
//           const user = JSON.parse(decodeURIComponent(userParam));
//           localStorage.setItem(AuthService.STORAGE_KEYS.USER, JSON.stringify(user));
//         } catch (e) {
//           console.warn('Failed to parse user data from callback');
//         }
//       }

//       this.clearOAuthState();

//       // Redirect to intended URL or dashboard
//       const redirectUrl = localStorage.getItem(AuthService.STORAGE_KEYS.REDIRECT_URL);
//       localStorage.removeItem(AuthService.STORAGE_KEYS.REDIRECT_URL);

//       if (redirectUrl) {
//         window.location.href = redirectUrl;
//       }

//       return { success: true };
//     } catch (error) {
//       console.error('OAuth callback error:', error);
//       this.clearOAuthState();
//       return {
//         success: false,
//         error: 'An unexpected error occurred during login.',
//       };
//     }
//   }

//   /**
//    * Gets OAuth account status for current user
//    */
//   async getOAuthStatus(): Promise<OAuthStatus> {
//     const response = await this.apiService.get('/auth/oauth/status');
//     return response.json();
//   }

//   /**
//    * Refreshes current user data
//    */
//   async refreshUserData(): Promise<User | null> {
//     try {
//       const response = await this.apiService.get('/auth/profile');
//       const data = await response.json();

//       if (data.user) {
//         localStorage.setItem(AuthService.STORAGE_KEYS.USER, JSON.stringify(data.user));
//         return data.user;
//       }

//       return null;
//     } catch (error) {
//       console.error('Failed to refresh user data:', error);
//       return null;
//     }
//   }

//   /**
//    * Gets current user from storage
//    */
//   getCurrentUser(): User | null {
//     try {
//       const userJson = localStorage.getItem(AuthService.STORAGE_KEYS.USER);
//       return userJson ? JSON.parse(userJson) : null;
//     } catch (error) {
//       console.error('Failed to parse user from storage:', error);
//       return null;
//     }
//   }

//   /**
//    * Gets access token from storage
//    */
//   getAccessToken(): string | null {
//     return localStorage.getItem(AuthService.STORAGE_KEYS.ACCESS_TOKEN);
//   }

//   /**
//    * Gets CSRF token from storage
//    */
//   getCsrfToken(): string | null {
//     return localStorage.getItem(AuthService.STORAGE_KEYS.CSRF_TOKEN);
//   }

//   /**
//    * Checks if user is authenticated
//    */
//   isAuthenticated(): boolean {
//     return !!this.getAccessToken();
//   }

//   /**
//    * Logs out the current user
//    */
//   async logout(): Promise<void> {
//     try {
//       await this.apiService.post('/auth/logout');
//     } catch (error) {
//       console.error('Logout error:', error);
//     } finally {
//       // Clear all auth data
//       Object.values(AuthService.STORAGE_KEYS).forEach(key => {
//         localStorage.removeItem(key);
//       });
//     }
//   }

//   /**
//    * Generates a random state parameter for CSRF protection
//    */
//   private generateState(): string {
//     const array = new Uint32Array(8);
//     crypto.getRandomValues(array);
//     return Array.from(array, (dec) => dec.toString(16)).join('');
//   }

//   /**
//    * Clears OAuth state from storage
//    */
//   private clearOAuthState(): void {
//     localStorage.removeItem(AuthService.STORAGE_KEYS.OAUTH_STATE);
//   }

//   /**
//    * Maps OAuth error codes to user-friendly messages
//    */
//   private getErrorMessage(errorCode: string): string {
//     const errorMessages: Record<string, string> = {
//       access_denied: 'You cancelled the login process. Please try again if you want to sign in.',
//       invalid_request: 'There was a problem with the login request. Please try again.',
//       server_error: 'The authentication service is temporarily unavailable. Please try again later.',
//       temporarily_unavailable: 'The service is temporarily unavailable. Please try again later.',
//     };

//     return errorMessages[errorCode] || 'An unexpected error occurred during login. Please try again.';
//   }
// }

// // frontend/src/components/GoogleOAuthButton.tsx
// import React, { useState } from 'react';
// import { AuthService } from '../services/auth.service';

// interface GoogleOAuthButtonProps {
//   onSuccess?: (user: User) => void;
//   onError?: (error: string) => void;
//   redirectUrl?: string;
//   linkMode?: boolean;
//   disabled?: boolean;
//   className?: string;
// }

// export const GoogleOAuthButton: React.FC<GoogleOAuthButtonProps> = ({
//   onSuccess,
//   onError,
//   redirectUrl,
//   linkMode = false,
//   disabled = false,
//   className = '',
// }) => {
//   const [isLoading, setIsLoading] = useState(false);

//   const handleClick = async () => {
//     if (disabled || isLoading) return;

//     try {
//       setIsLoading(true);

//       const authService = new AuthService(); // Inject your API service here

//       if (linkMode) {
//         authService.linkGoogleAccount();
//       } else {
//         authService.initiateGoogleLogin(redirectUrl);
//       }
//     } catch (error) {
//       setIsLoading(false);
//       const errorMessage = error instanceof Error ? error.message : 'Failed to initiate Google login';
//       onError?.(errorMessage);
//     }
//   };

//   return (
//     <button
//       onClick={handleClick}
//       disabled={disabled || isLoading}
//       className={`
//         flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm
//         bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none
//         focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50
//         disabled:cursor-not-allowed ${className}
//       `}
//     >
//       {isLoading ? (
//         <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
//       ) : (
//         <>
//           <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
//             <path
//               fill="#4285F4"
//               d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
//             />
//             <path
//               fill="#34A853"
//               d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
//             />
//             <path
//               fill="#FBBC05"
//               d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
//             />
//             <path
//               fill="#EA4335"
//               d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
//             />
//           </svg>
//           {linkMode ? 'Link Google Account' : 'Continue with Google'}
//         </>
//       )}
//     </button>
//   );
// };

// // frontend/src/pages/AuthCallbackPage.tsx
// import React, { useEffect, useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { AuthService } from '../services/auth.service';

// export const AuthCallbackPage: React.FC = () => {
//   const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
//   const [errorMessage, setErrorMessage] = useState<string>('');
//   const navigate = useNavigate();

//   useEffect(() => {
//     const handleCallback = async () => {
//       const authService = new AuthService(); // Inject your API service here
//       const result = await authService.handleOAuthCallback();

//       if (result.success) {
//         setStatus('success');
//         // Redirect will be handled by the auth service
//         setTimeout(() => navigate('/dashboard'), 1000);
//       } else {
//         setStatus('error');
//         setErrorMessage(result.error || 'Authentication failed');
//       }
//     };

//     handleCallback();
//   }, [navigate]);

//   if (status === 'loading') {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
//           <p className="mt-4 text-gray-600">Completing authentication...</p>
//         </div>
//       </div>
//     );
//   }

//   if (status === 'error') {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <div className="text-center">
//           <div className="bg-red-50 border border-red-200 rounded-md p-4">
//             <h3 className="text-lg font-medium text-red-800">Authentication Failed</h3>
//             <p className="mt-2 text-red-600">{errorMessage}</p>
//             <button
//               onClick={() => navigate('/login')}
//               className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
//             >
//               Try Again
//             </button>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen flex items-center justify-center">
//       <div className="text-center">
//         <div className="bg-green-50 border border-green-200 rounded-md p-4">
//           <h3 className="text-lg font-medium text-green-800">Authentication Successful</h3>
//           <p className="mt-2 text-green-600">Redirecting to your dashboard...</p>
//         </div>
//       </div>
//     </div>
//   );
// };
