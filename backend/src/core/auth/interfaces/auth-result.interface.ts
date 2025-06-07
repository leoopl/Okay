export interface AuthResult {
  user: any;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  session: any;
  csrfToken: string;
}
