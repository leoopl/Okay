import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { DbModule } from './db/db.module';
import { BreathingTechniquesModule } from './breathing-technique/breathing-technique.module';
import { AuditModule } from './audit/audit.module';
import { EncryptionModule } from './common/encryption/encryption.module';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

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

    // Core modules
    UserModule,
    AuthModule,
    AuditModule,
    EncryptionModule,

    // Database module
    DbModule,

    // Feature modules
    BreathingTechniquesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
