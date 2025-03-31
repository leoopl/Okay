/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../../core/audit/audit.service';
import { AuditAction } from '../../core/audit/entities/audit-log.entity';

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuditMiddleware.name);

  constructor(private readonly auditService: AuditService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Capture initial timestamp
    const startTime = Date.now();

    // Get the original end method
    const originalEnd = res.end;

    // Save a reference to 'this' for the closure
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    // Map HTTP methods to audit action types
    const mapMethodToAction = (method: string): AuditAction => {
      switch (method.toUpperCase()) {
        case 'GET':
          return AuditAction.READ;
        case 'POST':
          return AuditAction.CREATE;
        case 'PUT':
        case 'PATCH':
          return AuditAction.UPDATE;
        case 'DELETE':
          return AuditAction.DELETE;
        default:
          return AuditAction.READ;
      }
    };

    // Override the end method
    res.end = function (
      chunk?: any,
      encoding?: BufferEncoding | (() => void),
      cb?: () => void,
    ): Response {
      // Calculate response time
      const responseTime = Date.now() - startTime;

      // Log request info (but not for health checks or similar)
      if (
        !req.path.includes('/health') &&
        req.method !== 'OPTIONS' &&
        !req.path.includes('/info')
      ) {
        // Get user ID if authenticated
        const userId = (req as any).user?.userId || 'anonymous';

        // Log the request - using self.auditService instead of auditService
        if (self && self.auditService) {
          self.auditService
            .logAction({
              userId,
              action: mapMethodToAction(req.method), // Map HTTP method to proper AuditAction enum
              resource: req.path,
              resourceId: req.params?.id,
              details: {
                statusCode: res.statusCode,
                responseTime,
                query: req.query,
                // Don't log request body as it may contain sensitive data
              },
            })
            .catch((err) => {
              self.logger.error(`Failed to log audit: ${err.message}`);
            });
        }
      }

      // Call the original end method with the correct 'this' context
      // eslint-disable-next-line prefer-rest-params
      return originalEnd.apply(res, arguments as any);
    };

    next();
  }
}
