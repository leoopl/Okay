import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../../modules/user/entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { ConfigModule } from '@nestjs/config';
import { AuthenticationLogicService } from './authentication-logic.service';

/**
 * Separate module for authentication logic to avoid circular dependencies
 * This module has no dependencies on AuthModule or UserModule
 */
@Module({
  imports: [TypeOrmModule.forFeature([User, RefreshToken]), ConfigModule],
  providers: [AuthenticationLogicService],
  exports: [AuthenticationLogicService],
})
export class AuthenticationLogicModule {}
