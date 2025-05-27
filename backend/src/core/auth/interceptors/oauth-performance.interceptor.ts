import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { OAuthPerformanceService } from '../services/oauth-performance.service';

/**
 * Interceptor for measuring OAuth endpoint performance
 */
@Injectable()
export class OAuthPerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(OAuthPerformanceInterceptor.name);

  constructor(private readonly performanceService: OAuthPerformanceService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Only measure OAuth endpoints
    if (!request.path.includes('/auth/')) {
      return next.handle();
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const responseTime = Date.now() - startTime;
          this.logPerformance(
            request.path,
            request.method,
            responseTime,
            'success',
          );
        },
        error: (error) => {
          const responseTime = Date.now() - startTime;
          this.logPerformance(
            request.path,
            request.method,
            responseTime,
            'error',
            error.message,
          );
        },
      }),
    );
  }

  private logPerformance(
    path: string,
    method: string,
    responseTime: number,
    status: string,
    error?: string,
  ): void {
    const logMessage = `OAuth ${method} ${path} - ${responseTime}ms - ${status}`;

    if (status === 'error') {
      this.logger.error(`${logMessage} - ${error}`);
    } else if (responseTime > 1000) {
      this.logger.warn(`${logMessage} - SLOW RESPONSE`);
    } else {
      this.logger.debug(logMessage);
    }
  }
}
