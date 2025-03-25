import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './core/auth/auth.module';
// import { BreathingTechniquesModule } from './modules/breathing-technique/breathing-technique.module';
import { AuditModule } from './core/audit/audit.module';
import { EncryptionModule } from './common/encryption/encryption.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { JournalModule } from './modules/journal/journal.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseConfig from './config/database.config';

import { APP_GUARD } from '@nestjs/core';
import { CaslModule } from './core/casl/casl.module';
import { Auth0Guard } from './core/auth/guards/auth0.guard';
import { MiddlewareModule } from './common/middleware/middleware.module';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),

    // Database setup
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get('database'),
    }),

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

    // Core modules - reordered to resolve dependencies properly
    AuditModule,
    EncryptionModule,
    MiddlewareModule, // Add the middleware module
    CaslModule,
    UserModule,
    AuthModule,

    // Feature modules
    JournalModule,
    InventoryModule,
    // BreathingTechniquesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global authentication guard
    {
      provide: APP_GUARD,
      useClass: Auth0Guard,
    },
  ],
})
export class AppModule {}
