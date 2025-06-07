import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT refresh guard - validates refresh tokens
 */
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
