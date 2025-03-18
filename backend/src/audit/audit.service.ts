import { Injectable, Logger, Scope, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from './entities/audit-log.entity';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable({ scope: Scope.REQUEST })
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private auditRepository: Repository<AuditLog>,
    @Inject(REQUEST) private readonly request: Request,
    private configService: ConfigService,
  ) {}

  async logAction(params: {
    userId: string;
    action: AuditAction;
    resource: string;
    resourceId?: string;
    details?: Record<string, any>;
  }): Promise<AuditLog> {
    try {
      const auditLog = this.auditRepository.create({
        userId: params.userId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        ipAddress: this.getIpAddress(),
        userAgent: this.getUserAgent(),
        details: this.sanitizeDetails(params.details),
        timestamp: new Date(),
      });

      // Log to console in development
      if (this.configService.get('NODE_ENV') === 'development') {
        this.logger.debug(
          `AUDIT: ${params.action} ${params.resource} by ${params.userId}`,
          params.details,
        );
      }

      return this.auditRepository.save(auditLog);
    } catch (error) {
      this.logger.error(
        `Failed to create audit log: ${error.message}`,
        error.stack,
      );
      // Continue execution even if audit logging fails
      return null;
    }
  }

  // Helper methods
  private getIpAddress(): string {
    // X-Forwarded-For can be spoofed, but in a proper setup with a trusted proxy, it's reliable
    const forwarded = this.request.headers['x-forwarded-for'];
    if (forwarded) {
      return Array.isArray(forwarded)
        ? forwarded[0]
        : forwarded.split(',')[0].trim();
    }
    return this.request.ip || 'unknown';
  }

  private getUserAgent(): string {
    return this.request.headers['user-agent'] || 'unknown';
  }

  // Prevent storing sensitive information in audit logs
  private sanitizeDetails(details: Record<string, any>): Record<string, any> {
    if (!details) return null;

    // Create a copy to avoid mutating the original
    const sanitized = { ...details };

    // List of sensitive fields to remove/mask
    const sensitiveFields = [
      'password',
      'token',
      'accessToken',
      'refreshToken',
    ];

    // Sanitize any sensitive fields
    for (const key of Object.keys(sanitized)) {
      if (
        sensitiveFields.some((field) =>
          key.toLowerCase().includes(field.toLowerCase()),
        )
      ) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
