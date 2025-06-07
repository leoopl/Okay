import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Google OAuth guard - validates OAuth callback
 */
@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google-oauth') {}
