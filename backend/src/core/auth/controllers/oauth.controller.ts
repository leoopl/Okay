import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { GoogleOAuthService } from '../services/google-oauth.service';
import { AuthService } from '../services/auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Public } from '../../../common/decorators/is-public.decorator';
import { OAuthCallbackDto } from '../dto/oauth-callback.dto';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';

/**
 * OAuth controller handling OAuth 2.0 flows
 */
@ApiTags('authentication')
@Controller('auth')
export class OAuthController {
  constructor(
    private readonly googleOAuthService: GoogleOAuthService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Initiate Google OAuth flow
   */
  @Public()
  @Get('google')
  @Throttle({ auth: { limit: 5, ttl: 300 } })
  @ApiOperation({ summary: 'Initiate Google OAuth authentication' })
  @ApiQuery({
    name: 'redirect_uri',
    required: false,
    description: 'URI to redirect after authentication',
  })
  @ApiResponse({ status: 302, description: 'Redirect to Google OAuth' })
  async googleAuth(
    @Query('redirect_uri') redirectUri: string,
    @Res() res: Response,
  ) {
    const { url } =
      await this.googleOAuthService.generateAuthorizationUrl(redirectUri);

    return res.redirect(url);
  }

  /**
   * Initiate Google OAuth for account linking
   */
  @UseGuards(JwtAuthGuard)
  @Get('google/link')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Link Google account to existing user' })
  @ApiResponse({ status: 302, description: 'Redirect to Google OAuth' })
  async linkGoogleAccount(@Req() req: Request, @Res() res: Response) {
    const user = req.user as any;

    const { url } = await this.googleOAuthService.generateAuthorizationUrl(
      undefined,
      user.userId,
    );

    return res.redirect(url);
  }

  /**
   * Handle Google OAuth callback
   */
  @Public()
  @UseGuards(AuthGuard('google-oauth'))
  @Get('google/callback')
  @Throttle({ auth: { limit: 5, ttl: 300 } })
  @ApiOperation({ summary: 'Handle Google OAuth callback' })
  @ApiQuery({ name: 'code', description: 'Authorization code' })
  @ApiQuery({ name: 'state', description: 'State parameter' })
  @ApiQuery({ name: 'error', required: false, description: 'OAuth error' })
  @ApiResponse({ status: 302, description: 'Redirect to frontend' })
  async googleCallback(
    @Query() callbackDto: OAuthCallbackDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');

    try {
      // Check for OAuth errors
      if (callbackDto.error) {
        const errorUrl = new URL('/auth/error', frontendUrl);
        errorUrl.searchParams.set('error', callbackDto.error);
        errorUrl.searchParams.set(
          'error_description',
          callbackDto.error_description || 'OAuth authentication failed',
        );
        return res.redirect(errorUrl.toString());
      }

      // Extract device info
      const deviceInfo = this.authService.extractDeviceInfoFromRequest(req);

      // Handle OAuth callback
      const authResponse = await this.googleOAuthService.handleCallback(
        callbackDto.code,
        callbackDto.state,
        deviceInfo,
      );

      // Set refresh token cookie
      this.setRefreshTokenCookie(res, authResponse['refreshToken']);

      // Generate CSRF token
      let csrfToken = authResponse.csrfToken;

      if (
        req.csrfMiddleware &&
        typeof req.csrfMiddleware.generateToken === 'function'
      ) {
        csrfToken = req.csrfMiddleware.generateToken(res);
      } else {
        // Fallback: set CSRF token cookie manually
        const secure = this.configService.get<boolean>('SECURE_COOKIES', false);
        const domain = this.configService.get<string>('COOKIE_DOMAIN');

        res.cookie('csrf_token', csrfToken, {
          httpOnly: true,
          secure,
          sameSite: 'lax',
          domain,
          path: '/',
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
        });
      }

      // Redirect to frontend with success
      const successUrl = new URL('/auth/success', frontendUrl);
      successUrl.searchParams.set('token', authResponse.accessToken);
      if (csrfToken) {
        successUrl.searchParams.set('csrf_token', csrfToken);
      }

      return res.redirect(successUrl.toString());
    } catch (error) {
      // Redirect to frontend with error
      const errorUrl = new URL('/auth/error', frontendUrl);
      errorUrl.searchParams.set('error', 'authentication_failed');
      errorUrl.searchParams.set('error_description', error.message);

      return res.redirect(errorUrl.toString());
    }
  }

  /**
   * Revoke Google OAuth access
   */
  @UseGuards(JwtAuthGuard)
  @Delete('google/revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Revoke Google OAuth access' })
  @ApiResponse({ status: 204, description: 'Access revoked' })
  async revokeGoogleAccess(@Req() req: Request) {
    const user = req.user as any;
    await this.googleOAuthService.revokeGoogleAccess(user.userId);
  }

  /**
   * Set refresh token cookie
   */
  private setRefreshTokenCookie(res: Response, refreshToken: string): void {
    const secure = this.configService.get<boolean>('SECURE_COOKIES', false);
    const domain = this.configService.get<string>('COOKIE_DOMAIN');
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      domain,
      path: '/',
      maxAge,
    });
  }
}
