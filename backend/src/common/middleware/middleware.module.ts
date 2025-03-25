import { Module } from '@nestjs/common';
import { AuditMiddleware } from './audit.middleware';
import { AuditModule } from '../../core/audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [AuditMiddleware],
  exports: [AuditMiddleware],
})
export class MiddlewareModule {}
