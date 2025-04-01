import { Module } from '@nestjs/common';
import { PassportModule as NestPassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from '../../../modules/user/user.module';

@Module({
  imports: [
    NestPassportModule.register({ defaultStrategy: 'jwt' }),
    UserModule,
    ConfigModule,
  ],
  providers: [JwtStrategy],
  exports: [NestPassportModule, JwtStrategy],
})
export class PassportModule {}
