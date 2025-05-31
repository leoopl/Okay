export class OIDCException extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any,
  ) {
    super(message);
    this.name = 'OIDCException';
  }
}

export class PKCEValidationException extends OIDCException {
  constructor(message: string, details?: any) {
    super(message, 'PKCE_VALIDATION_FAILED', details);
  }
}

export class IDTokenValidationException extends OIDCException {
  constructor(message: string, details?: any) {
    super(message, 'ID_TOKEN_VALIDATION_FAILED', details);
  }
}

export class NonceValidationException extends OIDCException {
  constructor(message: string, details?: any) {
    super(message, 'NONCE_VALIDATION_FAILED', details);
  }
}
