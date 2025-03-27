import { Module } from '@nestjs/common';
import { AuditMiddleware } from './audit.middleware';
import { DataIsolationMiddleware } from './data-isolation.middleware';
import { AuditModule } from '../../core/audit/audit.module';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [AuditModule, TypeOrmModule],
  providers: [AuditMiddleware, DataIsolationMiddleware],
  exports: [AuditMiddleware, DataIsolationMiddleware],
})
export class MiddlewareModule {}
