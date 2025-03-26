import { ServerApiClient } from '@/lib/api-client';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

interface AuthResponse {
  user: UserProfile;
}

/**
 * Service for interacting with the authentication API endpoints
 * This service is designed to be used on both client and server side
 */
export class AuthService {
  private apiClient: ServerApiClient;

  constructor(accessToken?: string) {
    this.apiClient = new ServerApiClient(accessToken);
  }

  /**
   * Get the current user's profile from the backend
   */
  async getProfile(): Promise<UserProfile> {
    const response = await this.apiClient.get<AuthResponse>('/auth/profile');
    return response.user;
  }

  /**
   * Get the Auth0 configuration from the backend
   */
  async getAuth0Config() {
    return this.apiClient.get<{
      domain: string;
      clientId: string;
      audience: string;
      redirectUri: string;
    }>('/auth/config');
  }

  /**
   * Check if a user has a specific role
   */
  hasRole(user: UserProfile | null, role: string): boolean {
    if (!user || !user.roles) return false;
    return user.roles.includes(role);
  }

  /**
   * Check if a user has any of the specified roles
   */
  hasAnyRole(user: UserProfile | null, roles: string[]): boolean {
    if (!user || !user.roles) return false;
    return roles.some((role) => user.roles.includes(role));
  }

  /**
   * Check if a user has all of the specified roles
   */
  hasAllRoles(user: UserProfile | null, roles: string[]): boolean {
    if (!user || !user.roles) return false;
    return roles.every((role) => user.roles.includes(role));
  }
}

// Export a default instance for client-side use
export default new AuthService();
