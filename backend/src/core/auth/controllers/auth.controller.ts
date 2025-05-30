import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
  Res,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Query,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiOperation, ApiTags, ApiResponse, ApiBody } from '@nestjs/swagger';
import { OAuthService, PKCEParams } from '../services/oauth.service';
import { TokenService } from '../services/token.service';
import { SecureTokenService } from '../services/secure-token.service';
import { TokenRefreshService } from '../services/token-refresh.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/entities/audit-log.entity';
import { Public } from '../../../common/decorators/is-public.decorator';
import { IAuthenticatedRequest } from '../../../common/interfaces/auth-request.interface';
import {
  GoogleOAuthCallbackDto,
  GoogleOAuthResponseDto,
} from '../dto/google-oauth.dto';
import { GoogleOAuthService } from '../services/google-oauth.service';
import { UserService } from 'src/modules/user/user.service';
import { AuthService } from '../services/auth.service';
import { OAuthStateService } from '../services/oauth-state.service';
import { CsrfMiddleware } from 'src/common/middleware/csrf.middleware';
import {
  OAuthException,
  OAuthStateException,
} from '../exceptions/oauth-exceptions';

@ApiTags('authentication')
@Controller('auth')
export class AuthController {
  private readonly logger: Logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly oauthService: OAuthService,
    private readonly tokenService: TokenService,
    private readonly secureTokenService: SecureTokenService,
    private readonly tokenRefreshService: TokenRefreshService,
    private readonly auditService: AuditService,
    private readonly googleOAuthService: GoogleOAuthService,
    private readonly userService: UserService,
    private readonly oauthStateService: OAuthStateService,
    private readonly csrfMiddleware: CsrfMiddleware,
  ) {}

  @Public()
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        password: { type: 'string' },
      },
    },
  })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginData: { email: string; password: string },
    @Req() req: IAuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = this.getIpAddress(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    try {
      // Validate credentials and generate tokens
      const tokenResult =
        await this.oauthService.validateCredentialsAndGenerateTokens(
          loginData.email,
          loginData.password,
          ip,
          userAgent,
        );

      // Set secure authentication cookies and get session ID
      const sessionId = this.secureTokenService.setSecureAuthCookies(
        res,
        tokenResult.accessToken,
        tokenResult.refreshToken,
        tokenResult.expiresIn,
      );

      // Generate CSRF token tied to the session
      const csrfToken = this.csrfMiddleware.generateSecureToken(sessionId, res);

      // Return success response (no sensitive tokens in response body)
      return {
        success: true,
        message: 'Login successful',
        sessionId, // Safe to return - not sensitive
        csrfToken, // Safe to return - needed by client for future requests
        expiresIn: tokenResult.expiresIn,
      };
    } catch (error) {
      this.logger.error(`Login error: ${error.message}`, error.stack);

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new BadRequestException('Login failed');
    }
  }

  @Public()
  @ApiOperation({ summary: 'Begin OAuth2 authorization flow with PKCE' })
  @ApiResponse({ status: 200, description: 'Authorization successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post('authorize')
  @HttpCode(HttpStatus.OK)
  async authorize(
    @Body()
    authData: { email: string; password: string; pkceParams: PKCEParams },
    @Req() req: IAuthenticatedRequest,
  ) {
    const ip = this.getIpAddress(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Validate credentials
    const user = await this.authService.validateUser(
      authData.email,
      authData.password,
    );

    if (!user) {
      // Audit failed login attempt
      await this.auditService.logAction({
        userId: 'unknown',
        action: AuditAction.FAILED_LOGIN,
        resource: 'auth',
        details: {
          email: authData.email,
          ip,
          userAgent,
          method: 'oauth_authorize',
        },
      });

      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate authorization code with PKCE
    return this.oauthService.generateAuthorizationCode(
      user.id,
      authData.pkceParams,
      ip,
      userAgent,
    );
  }

  @Public()
  @ApiOperation({ summary: 'Exchange authorization code for tokens' })
  @ApiResponse({ status: 200, description: 'Token exchange successful' })
  @ApiResponse({ status: 401, description: 'Invalid code or verifier' })
  @Post('token')
  @HttpCode(HttpStatus.OK)
  async token(
    @Body()
    tokenData: {
      grant_type: string;
      code?: string;
      code_verifier?: string;
      client_id: string;
      redirect_uri?: string;
      refresh_token?: string;
    },
    @Req() req: IAuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = this.getIpAddress(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    if (tokenData.grant_type === 'authorization_code') {
      // Exchange authorization code for tokens
      const tokenResult = await this.oauthService.exchangeCodeForTokens(
        tokenData.code,
        tokenData.code_verifier,
        tokenData.client_id,
        tokenData.redirect_uri,
        ip,
        userAgent,
      );

      // Set secure authentication cookies
      const sessionId = this.secureTokenService.setSecureAuthCookies(
        res,
        tokenResult.accessToken,
        tokenResult.refreshToken,
        tokenResult.expiresIn,
      );

      // Generate CSRF token
      const csrfToken = this.csrfMiddleware.generateSecureToken(sessionId, res);

      // Return response without sensitive tokens
      return {
        success: true,
        tokenType: tokenResult.tokenType,
        expiresIn: tokenResult.expiresIn,
        scope: tokenResult.scope,
        sessionId,
        csrfToken,
      };
    } else if (tokenData.grant_type === 'refresh_token') {
      // Use the new TokenRefreshService
      const refreshResult = await this.tokenRefreshService.refreshTokens(
        req,
        res,
      );

      if (!refreshResult.success) {
        if (refreshResult.requiresReauth) {
          throw new UnauthorizedException('Re-authentication required');
        }
        throw new BadRequestException(
          refreshResult.error || 'Token refresh failed',
        );
      }

      return {
        success: true,
        tokenType: 'Bearer',
        expiresIn: refreshResult.expiresIn,
        sessionId: refreshResult.sessionId,
        csrfToken: refreshResult.csrfToken,
      };
    } else {
      throw new UnauthorizedException('Unsupported grant type');
    }
  }

  @Public()
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: IAuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Use the new TokenRefreshService for comprehensive security checks
    const refreshResult = await this.tokenRefreshService.refreshTokens(
      req,
      res,
    );

    if (!refreshResult.success) {
      if (refreshResult.requiresReauth) {
        // Clear any existing cookies and require full re-authentication
        this.secureTokenService.clearAuthCookies(res);
        throw new UnauthorizedException(
          'Re-authentication required for security',
        );
      }
      throw new UnauthorizedException(
        refreshResult.error || 'Token refresh failed',
      );
    }

    return {
      success: true,
      message: 'Token refreshed successfully',
      tokenType: 'Bearer',
      expiresIn: refreshResult.expiresIn,
      sessionId: refreshResult.sessionId,
      csrfToken: refreshResult.csrfToken,
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: IAuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = this.getIpAddress(req);
    const sessionId = req.cookies['session-id'];

    // Clear secure authentication cookies
    this.secureTokenService.clearAuthCookies(res);

    // Clear CSRF token
    if (sessionId) {
      this.csrfMiddleware.clearToken(sessionId, res);
    }

    // Revoke user's refresh tokens
    await this.tokenService.revokeUserRefreshTokens(req.user.userId, ip);

    // Add token to blacklist if JWT ID is available
    if (req.user.jti && req.user.exp) {
      const expiresAt = new Date(req.user.exp * 1000);
      await this.tokenService.blacklistToken(req.user.jti, expiresAt);
    }

    // Audit logout
    await this.auditService.logAction({
      userId: req.user.userId,
      action: AuditAction.LOGOUT,
      resource: 'auth',
      details: { ip, sessionId },
    });

    return {
      success: true,
      message: 'Logout successful',
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Returns the current user profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('profile')
  async getProfile(@Req() req: IAuthenticatedRequest) {
    // Log the access for audit trail
    await this.auditService.logAction({
      userId: req.user.userId,
      action: AuditAction.PROFILE_ACCESS,
      resource: 'user',
      resourceId: req.user.userId,
      details: { message: 'User accessed their profile' },
    });

    // Get user profile
    const userProfile = await this.authService.getUserProfile(req.user.userId);

    return { user: userProfile };
  }

  /**
   * Initiates Google OAuth authentication flow with secure state
   */
  @Public()
  @ApiOperation({ summary: 'Initiate Google OAuth authentication' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Google OAuth consent screen',
  })
  @Get('google')
  async googleOAuth(
    @Req() req: IAuthenticatedRequest,
    @Res() res: Response,
    @Query('redirect_url') redirectUrl?: string,
  ) {
    const ip = this.getIpAddress(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    try {
      // Generate secure OAuth state with metadata
      const state = await this.oauthStateService.generateState({
        redirectUrl,
        linkMode: false,
        ipAddress: ip,
        userAgent,
      });

      // Build Google OAuth URL with secure state
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', process.env.GOOGLE_CALLBACK_URL);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'openid profile email');
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');

      // Redirect to Google OAuth
      res.redirect(authUrl.toString());
    } catch (error) {
      this.logger.error(
        `Error initiating Google OAuth: ${error.message}`,
        error.stack,
      );
      throw new OAuthException(
        'Failed to initiate Google OAuth',
        'OAUTH_INITIATION_FAILED',
        500,
        'Unable to start Google authentication. Please try again.',
      );
    }
  }

  /**
   * Handles Google OAuth callback with enhanced security
   */
  @Public()
  @ApiOperation({ summary: 'Handle Google OAuth callback' })
  @ApiResponse({
    status: 200,
    description: 'Google OAuth authentication successful',
    type: GoogleOAuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid OAuth callback' })
  @ApiResponse({ status: 401, description: 'OAuth authentication failed' })
  @Get('google/callback')
  async googleOAuthCallback(
    @Req() req: IAuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
    @Query() query: GoogleOAuthCallbackDto,
  ) {
    const ip = this.getIpAddress(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    try {
      // Validate OAuth state with enhanced security checks
      const stateValidation =
        await this.oauthStateService.validateAndConsumeState(
          query.state,
          ip,
          userAgent,
        );

      if (!stateValidation.valid) {
        throw new OAuthStateException('Invalid OAuth state parameter');
      }

      // Log security warnings if any
      if (stateValidation.securityWarnings?.length > 0) {
        this.logger.warn(
          `OAuth security warnings for callback: ${stateValidation.securityWarnings.join(', ')}`,
        );
      }

      // Handle the OAuth callback using existing strategy
      // The GoogleOAuthStrategy will be triggered by the AuthGuard
      const authenticatedUser = req.user;

      if (!authenticatedUser) {
        throw new UnauthorizedException('Google authentication failed');
      }

      // Get the full user object from database
      const user = await this.userService.findOne(authenticatedUser.userId);

      if (!user) {
        throw new UnauthorizedException('User not found after authentication');
      }

      // Generate JWT tokens
      const { accessToken, refreshToken } =
        await this.googleOAuthService.generateAuthTokens(user, ip, userAgent);

      // Set secure authentication cookies
      const sessionId = this.secureTokenService.setSecureAuthCookies(
        res,
        accessToken,
        refreshToken,
        parseInt(process.env.JWT_ACCESS_EXPIRATION || '900', 10),
      );

      // Generate CSRF token
      const csrfToken = this.csrfMiddleware.generateSecureToken(sessionId, res);

      // Determine if this is a new user
      const isNewUser = user.createdAt > new Date(Date.now() - 5 * 60 * 1000);

      // Audit successful OAuth login
      await this.auditService.logAction({
        userId: user.id,
        action: AuditAction.LOGIN,
        resource: 'auth',
        details: {
          provider: 'google',
          method: 'oauth_callback',
          isNewUser,
          ip,
          userAgent,
          securityWarnings: stateValidation.securityWarnings,
        },
      });

      // Redirect to frontend with success (or return JSON for API clients)
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const callbackUrl = new URL('/auth/success', frontendUrl);

      // Add success parameters
      callbackUrl.searchParams.set('session_id', sessionId);
      callbackUrl.searchParams.set('is_new_user', isNewUser.toString());

      if (stateValidation.redirectUrl) {
        callbackUrl.searchParams.set(
          'redirect_to',
          stateValidation.redirectUrl,
        );
      }

      res.redirect(callbackUrl.toString());
    } catch (error) {
      this.logger.error(
        `Google OAuth callback error: ${error.message}`,
        error.stack,
      );

      // Audit failed OAuth attempt
      await this.auditService.logAction({
        userId: 'unknown',
        action: AuditAction.FAILED_LOGIN,
        resource: 'auth',
        details: {
          provider: 'google',
          error: error.message,
          method: 'oauth_callback',
          ip,
          userAgent,
        },
      });

      if (error instanceof OAuthException) {
        throw error;
      }

      throw new BadRequestException('OAuth authentication failed');
    }
  }

  /**
   * Link Google account to existing authenticated user
   */
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Link Google account to current user' })
  @ApiResponse({
    status: 200,
    description: 'Google account linked successfully',
  })
  @ApiResponse({ status: 400, description: 'Google account already linked' })
  @ApiResponse({ status: 401, description: 'User not authenticated' })
  @Get('google/link')
  async linkGoogleAccount(
    @Req() req: IAuthenticatedRequest,
    @Res() res: Response,
  ) {
    const ip = this.getIpAddress(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    try {
      // Generate secure OAuth state for account linking
      const state = await this.oauthStateService.generateState({
        userId: req.user.userId,
        linkMode: true,
        ipAddress: ip,
        userAgent,
      });

      // Build Google OAuth URL for linking
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', process.env.GOOGLE_CALLBACK_URL);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'openid profile email');
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');

      res.redirect(authUrl.toString());
    } catch (error) {
      this.logger.error(
        `Google account linking error: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        'Failed to initiate Google account linking',
      );
    }
  }

  /**
   * Unlink Google account from current user
   */
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Unlink Google account from current user' })
  @ApiResponse({
    status: 200,
    description: 'Google account unlinked successfully',
  })
  @ApiResponse({ status: 400, description: 'Cannot unlink Google account' })
  @ApiResponse({ status: 401, description: 'User not authenticated' })
  @Post('google/unlink')
  @HttpCode(HttpStatus.OK)
  async unlinkGoogleAccount(@Req() req: IAuthenticatedRequest) {
    try {
      // Check if user can unlink their Google account
      const canUnlink = await this.userService.canUnlinkOAuthAccount(
        req.user.userId,
      );

      if (!canUnlink) {
        throw new BadRequestException(
          'Cannot unlink Google account. Please set a password first.',
        );
      }

      await this.userService.unlinkGoogleAccount(
        req.user.userId,
        req.user.userId,
      );

      // Audit the unlinking
      await this.auditService.logAction({
        userId: req.user.userId,
        action: AuditAction.UPDATE,
        resource: 'auth',
        details: {
          action: 'google_account_unlinked',
        },
      });

      return {
        success: true,
        message: 'Google account unlinked successfully',
      };
    } catch (error) {
      this.logger.error(
        `Google account unlinking error: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to unlink Google account');
    }
  }

  /**
   * Get OAuth account status for current user
   */
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get OAuth account linking status' })
  @ApiResponse({ status: 200, description: 'OAuth account status' })
  @Get('oauth/status')
  async getOAuthStatus(@Req() req: IAuthenticatedRequest) {
    const user = await this.userService.findOne(req.user.userId);

    return {
      hasPassword: !!user.password,
      linkedAccounts: {
        google: !!user.googleId,
        auth0: !!user.auth0Id,
      },
      primaryProvider: user.getPrimaryOAuthProvider(),
      canUnlinkOAuth: user.password ? true : false,
    };
  }

  /**
   * Helper method to get client IP address
   */
  private getIpAddress(req: IAuthenticatedRequest): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return Array.isArray(forwarded)
        ? forwarded[0]
        : forwarded.split(',')[0].trim();
    }
    return req.ip || 'unknown';
  }
}
