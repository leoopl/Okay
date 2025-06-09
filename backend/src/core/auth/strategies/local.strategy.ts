import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../modules/user/entities/user.entity';
import * as argon2 from 'argon2';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  private readonly logger = new Logger(LocalStrategy.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super({
      usernameField: 'email',
      passwordField: 'password',
    });

    this.logger.log('🎯 LocalStrategy initialized successfully');
  }

  async validate(email: string, password: string): Promise<any> {
    this.logger.log(`🔍 Validating user: ${email}`);

    try {
      // Find user directly to avoid circular dependency
      const user = await this.userRepository.findOne({
        where: { email },
        relations: ['roles'],
      });

      if (!user) {
        this.logger.warn(`❌ User not found: ${email}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      if (!user.password) {
        this.logger.warn(`❌ User has no password (OAuth-only): ${email}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      // Verify password using argon2
      const isPasswordValid = await argon2.verify(user.password, password);

      if (!isPasswordValid) {
        this.logger.warn(`❌ Invalid password for: ${email}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      this.logger.log(`✅ Authentication successful for: ${email}`);

      // Return user without password
      const { password: _, ...result } = user;
      return result;
    } catch (error) {
      this.logger.error(`❌ Validation error: ${error.message}`);
      throw new UnauthorizedException('Invalid credentials');
    }
  }
}
