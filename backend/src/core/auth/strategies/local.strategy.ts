import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  private readonly logger = new Logger(LocalStrategy.name);

  constructor() {
    super({
      usernameField: 'email',
      passwordField: 'password',
    });

    this.logger.log('🎯 LocalStrategy constructor called');
    console.log('🎯 LocalStrategy constructor called'); // Double logging
  }

  async validate(email: string, password: string): Promise<any> {
    this.logger.log(`🔍 LocalStrategy.validate called with email: ${email}`);

    // Temporary: just return a mock user to test if the strategy works
    if (email === 'test@test.com' && password === 'test123') {
      return { id: '1', email: 'test@test.com', name: 'Test User' };
    }

    throw new UnauthorizedException('Invalid credentials');
  }
}
