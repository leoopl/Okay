import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './core/auth/auth.module';
import { AuditModule } from './core/audit/audit.module';
import { EncryptionModule } from './common/encryption/encryption.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { JournalModule } from './modules/journal/journal.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseConfig from './config/database.config';
import authConfig from './config/auth.config';

import { APP_GUARD } from '@nestjs/core';
import { CaslModule } from './core/casl/casl.module';
import { JwtAuthGuard } from './core/auth/guards/jwt-auth.guard';
import { MiddlewareModule } from './common/middleware/middleware.module';
import { AuditMiddleware } from './common/middleware/audit.middleware';
import { DataIsolationMiddleware } from './common/middleware/data-isolation.middleware';
import { CsrfMiddleware } from './common/middleware/csrf.middleware';
import { TestimonialModule } from './modules/testimonial/testimonial.module';
import { MedicationModule } from './modules/medication/medication.module';
import { StorageModule } from './common/storage/storage.module';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, authConfig],
    }),

    // Database setup
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get('database'),
    }),
    AuthModule,

    // Rate limiting protection against brute force attacks
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get('THROTTLE_TTL', 60),
          limit: config.get('THROTTLE_LIMIT', 20),
        },
      ],
    }),

    // Core modules - Make sure Auth is loaded early
    AuditModule,
    EncryptionModule,
    MiddlewareModule,
    CaslModule,
    UserModule,
    AuthModule,

    // Feature modules
    JournalModule,
    InventoryModule,
    TestimonialModule,
    MedicationModule,
    StorageModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global authentication guard - use our new JWT guard
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply audit middleware globally
    consumer.apply(AuditMiddleware).forRoutes('*');

    // Apply CSRF middleware
    consumer.apply(CsrfMiddleware).forRoutes('*');

    // Apply data isolation middleware for authenticated routes
    consumer
      .apply(DataIsolationMiddleware)
      .exclude('auth/login', 'auth/refresh', 'auth/token', 'health', 'info')
      .forRoutes('*');
  }
}
