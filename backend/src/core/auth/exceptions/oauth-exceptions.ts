export class OAuthException extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number = 400,
    public readonly userMessage?: string,
    public readonly details?: any,
  ) {
    super(message);
    this.name = 'OAuthException';
  }
}

export class OAuthStateException extends OAuthException {
  constructor(message: string, details?: any) {
    super(
      message,
      'INVALID_OAUTH_STATE',
      400,
      'Security validation failed. Please try signing in again.',
      details,
    );
  }
}

export class OAuthProviderException extends OAuthException {
  constructor(message: string, provider: string, details?: any) {
    super(
      message,
      'OAUTH_PROVIDER_ERROR',
      502,
      `There was an issue with ${provider} authentication. Please try again later.`,
      { provider, ...details },
    );
  }
}
