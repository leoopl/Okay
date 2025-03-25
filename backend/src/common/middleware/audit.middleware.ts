/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../../core/audit/audit.service';

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuditMiddleware.name);

  constructor(private readonly auditService: AuditService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Capture initial timestamp
    const startTime = Date.now();

    // Get the original end method
    const originalEnd = res.end;

    // Create a reference to auditService and logger for closure
    const auditService = this.auditService;
    const logger = this.logger;

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

        // Log the request - using captured auditService reference
        auditService
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
            logger.error(`Failed to log audit: ${err.message}`);
          });
      }

      // Call the original end method with the correct 'this' context
      // eslint-disable-next-line prefer-rest-params
      return originalEnd.apply(res, arguments as any);
    };

    next();
  }
}
