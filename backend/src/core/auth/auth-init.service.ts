import { Injectable, OnModuleInit } from '@nestjs/common';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';

@Injectable()
export class AuthInitService implements OnModuleInit {
  constructor(
    private localStrategy: LocalStrategy,
    private jwtStrategy: JwtStrategy,
    private jwtRefreshStrategy: JwtRefreshStrategy,
  ) {}

  onModuleInit() {
    // Strategies are automatically registered when injected
    // This ensures they're properly instantiated
    console.log('Auth strategies initialized');
  }
}
