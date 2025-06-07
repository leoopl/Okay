import { Module } from '@nestjs/common';
import { AuditMiddleware } from './audit.middleware';
import { DataIsolationMiddleware } from './data-isolation.middleware';
import { AuditModule } from '../../core/audit/audit.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityHeadersMiddleware } from './security-headers.middleware';

@Module({
  imports: [AuditModule, TypeOrmModule],
  providers: [
    AuditMiddleware,
    DataIsolationMiddleware,
    SecurityHeadersMiddleware,
  ],
  exports: [
    AuditMiddleware,
    DataIsolationMiddleware,
    SecurityHeadersMiddleware,
  ],
})
export class MiddlewareModule {}
