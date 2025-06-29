// Error types for better error handling
export enum JournalErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  ENCRYPTION_ERROR = 'ENCRYPTION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class JournalError extends Error {
  constructor(
    public type: JournalErrorType,
    message: string,
    public retryable: boolean = false,
    public details?: any,
  ) {
    super(message);
    this.name = 'JournalError';
  }
}

// Helper function to determine error type
export function getErrorType(error: any): JournalErrorType {
  if (error?.code === 'PGRST301' || error?.message?.includes('JWT')) {
    return JournalErrorType.AUTH_ERROR;
  }
  if (error?.code === '42501' || error?.message?.includes('permission denied')) {
    return JournalErrorType.PERMISSION_ERROR;
  }
  if (error?.code === '23505' || error?.message?.includes('duplicate')) {
    return JournalErrorType.VALIDATION_ERROR;
  }
  if (error?.code === 'ECONNREFUSED' || error?.message?.includes('network')) {
    return JournalErrorType.NETWORK_ERROR;
  }
  return JournalErrorType.UNKNOWN_ERROR;
}
