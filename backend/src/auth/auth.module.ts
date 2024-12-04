import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from 'src/user/user.module';
// import { jwtConstants } from './constants';
import { JwtModule } from '@nestjs/jwt';

//secret doesnt work
@Module({
  imports: [
    UserModule,
    JwtModule.register({
      global: true,
      secret: 'secretKey',
      signOptions: { expiresIn: '60s' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
