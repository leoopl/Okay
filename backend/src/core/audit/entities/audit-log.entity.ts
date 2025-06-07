import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum AuditAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  FAILED_LOGIN = 'FAILED_LOGIN',
  PROFILE_ACCESS = 'PROFILE_ACCESS',
  DATA_EXPORT = 'DATA_EXPORT',
  CONSENT_UPDATED = 'CONSENT_UPDATED',
  SENSITIVE_DATA_ACCESS = 'SENSITIVE_DATA_ACCESS',
  PASSWORD_UPDATED = 'PASSWORD_UPDATED',
  ACCOUNT_DELETION = 'ACCOUNT_DELETION',
  ACCOUNT_LINKED = 'ACCOUNT_LINKED',
  OAUTH_REVOKED = 'OAUTH_REVOKED',
  TOKEN_REFRESHED = 'TOKEN_REFRESHED',
  TOKEN_REFRESH_FAILED = 'TOKEN_REFRESH_FAILED',
  SESSION_TERMINATED = 'SESSION_TERMINATED',
  PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_SUCCESS = 'PASSWORD_RESET_SUCCESS',
  EMAIL_VERIFICATION_REQUEST = 'EMAIL_VERIFICATION_REQUEST',
  EMAIL_VERIFIED = 'EMAIL_VERIFIED',
  ROLE_ASSIGNED = 'ROLE_ASSIGNED',
  ROLE_REMOVED = 'ROLE_REMOVED',
  PERMISSION_GRANTED = 'PERMISSION_GRANTED',
  PERMISSION_REVOKED = 'PERMISSION_REVOKED',
  SETTINGS_UPDATED = 'SETTINGS_UPDATED',
  ACCOUNT_MERGE_REQUESTED = 'ACCOUNT_MERGE_REQUESTED',
  ACCESS_DENIED = 'ACCESS_DENIED',
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  @Index()
  action: AuditAction;

  @Column()
  @Index()
  resource: string;

  @Column({ nullable: true })
  resourceId: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, any>;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  @Index()
  timestamp: Date;
}
