import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthenticationLogicService } from '../authentication-logic/authentication-logic.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  private readonly logger = new Logger(LocalStrategy.name);

  constructor(private readonly authLogicService: AuthenticationLogicService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
    });

    this.logger.log(
      '🎯 LocalStrategy initialized with AuthenticationLogicService',
    );
  }

  async validate(email: string, password: string): Promise<any> {
    this.logger.log(`🔍 LocalStrategy.validate called for: ${email}`);

    const user = await this.authLogicService.validateUserCredentials(
      email,
      password,
    );

    if (!user) {
      this.logger.warn(`❌ Authentication failed for: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log(`✅ Authentication successful for: ${email}`);
    return user;
  }
}
