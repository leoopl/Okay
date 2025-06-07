export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  idToken: string;
  tokenType: string;
  expiresIn: number;
  scope: string;
}
