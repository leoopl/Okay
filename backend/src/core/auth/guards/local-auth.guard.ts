import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Local authentication guard - validates email/password
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
