import { Injectable, NestMiddleware, Logger, Scope } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../../core/audit/audit.service';

@Injectable({ scope: Scope.REQUEST })
export class AuditMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuditMiddleware.name);

  constructor(private readonly auditService: AuditService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Capture initial timestamp
    const startTime = Date.now();

    // Store original end function
    const originalEnd = res.end;

    // Override end function to log after response
    res.end = function (
      chunk?: any,
      encodingOrCb?: BufferEncoding | (() => void) | string,
      cb?: () => void,
    ): Response {
      // Restore original end
      res.end = originalEnd;

      // Calculate response time
      const responseTime = Date.now() - startTime;

      // Log request info (but not for health checks or similar)
      if (!req.path.includes('/health') && req.method !== 'OPTIONS') {
        // Get user ID if authenticated
        const userId = (req as any).user?.userId || 'anonymous';

        // Log the request
        this.auditService
          .logAction({
            userId,
            action: req.method as any,
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
            this.logger.error(`Failed to log audit: ${err.message}`);
          });
      }

      // Call original end
      return originalEnd.call(this, chunk, encodingOrCb as BufferEncoding, cb);
    };

    next();
  }
}
