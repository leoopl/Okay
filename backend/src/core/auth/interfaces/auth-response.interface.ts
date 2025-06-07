export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  csrfToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    roles: string[];
    hasPassword: boolean;
    linkedProviders: string[];
  };
}
