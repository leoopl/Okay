/* eslint-disable @typescript-eslint/no-unused-vars */
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
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/entities/audit-log.entity';
import { Public } from '../../../common/decorators/is-public.decorator';
import { IAuthenticatedRequest } from '../../../common/interfaces/auth-request.interface';
import { AuthGuard } from '@nestjs/passport';
import {
  GoogleOAuthCallbackDto,
  GoogleOAuthResponseDto,
} from '../dto/google-oauth.dto';
import { GoogleOAuthService } from '../services/google-oauth.service';
import { UserService } from 'src/modules/user/user.service';
import { AuthService } from '../services/auth.service';

@ApiTags('authentication')
@Controller('auth')
export class AuthController {
  private readonly logger: Logger = new Logger(AuthController.name);
  constructor(
    private readonly authService: AuthService,
    private readonly oauthService: OAuthService,
    private readonly tokenService: TokenService,
    private readonly auditService: AuditService,
    private readonly googleOAuthService: GoogleOAuthService,
    private readonly userService: UserService,
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

    // Validate credentials and generate tokens
    const tokenResult =
      await this.oauthService.validateCredentialsAndGenerateTokens(
        loginData.email,
        loginData.password,
        ip,
        userAgent,
      );

    // Set refresh token in HttpOnly cookie
    this.tokenService.setRefreshTokenCookie(res, tokenResult.refreshToken);

    // Generate CSRF token and set in cookie
    const csrfToken = req['csrfMiddleware'].generateToken(res);

    // Return access token in response body
    return {
      accessToken: tokenResult.accessToken,
      tokenType: tokenResult.tokenType,
      expiresIn: tokenResult.expiresIn,
      csrfToken: csrfToken, // Return CSRF token to client
    };
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

      // Set refresh token in HttpOnly cookie
      this.tokenService.setRefreshTokenCookie(res, tokenResult.refreshToken);

      // Remove refresh token from response body for security
      const { refreshToken, ...responseBody } = tokenResult;
      return responseBody;
    } else if (tokenData.grant_type === 'refresh_token') {
      // Handle refresh token grant
      // Extract refresh token from cookie or body
      const refreshToken =
        this.tokenService.extractRefreshToken(req) || tokenData.refresh_token;

      if (!refreshToken) {
        throw new UnauthorizedException('Refresh token is required');
      }

      const {
        user,
        accessToken,
        refreshToken: newRefreshToken,
      } = await this.tokenService.rotateRefreshToken(
        refreshToken,
        ip,
        userAgent,
      );

      // Set new refresh token in HttpOnly cookie
      this.tokenService.setRefreshTokenCookie(res, newRefreshToken);

      return {
        accessToken,
        tokenType: 'Bearer',
        expiresIn: parseInt(process.env.JWT_ACCESS_EXPIRATION || '900', 10), // 15 minutes in seconds
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
    const ip = this.getIpAddress(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Extract refresh token from cookie
    const refreshToken = this.tokenService.extractRefreshToken(req);

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is missing');
    }

    try {
      const {
        user,
        accessToken,
        refreshToken: newRefreshToken,
      } = await this.tokenService.rotateRefreshToken(
        refreshToken,
        ip,
        userAgent,
      );

      // Set new refresh token in HttpOnly cookie
      this.tokenService.setRefreshTokenCookie(res, newRefreshToken);

      // Generate new CSRF token
      const csrfToken = req['csrfMiddleware'].generateToken(res);

      return {
        accessToken,
        tokenType: 'Bearer',
        expiresIn: parseInt(process.env.JWT_ACCESS_EXPIRATION || '900', 10), // 15 minutes in seconds
        csrfToken: csrfToken, // Return new CSRF token
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
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

    // Clear refresh token cookie
    this.tokenService.clearRefreshTokenCookie(res);

    // Clear CSRF token cookie
    req['csrfMiddleware'].clearToken(res);

    // Revoke user's refresh tokens
    await this.tokenService.revokeUserRefreshTokens(req.user.userId, ip);

    // Add token to blacklist if JWT ID is available (only for JWT tokens)
    if (req.user.jti && req.user.exp) {
      const expiresAt = new Date(req.user.exp * 1000); // Convert to milliseconds
      await this.tokenService.blacklistToken(req.user.jti, expiresAt);
    }

    // Audit logout
    await this.auditService.logAction({
      userId: req.user.userId,
      action: AuditAction.LOGOUT,
      resource: 'auth',
      details: { ip },
    });

    return { message: 'Logout successful' };
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

  /**
   * Initiates Google OAuth authentication flow
   */
  @Public()
  @ApiOperation({ summary: 'Initiate Google OAuth authentication' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Google OAuth consent screen',
  })
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleOAuth() {
    // This method is handled by the GoogleOAuthStrategy
    // The guard will redirect to Google OAuth consent screen
  }

  /**
   * Handles Google OAuth callback
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
  @UseGuards(AuthGuard('google'))
  async googleOAuthCallback(
    @Req() req: IAuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
    @Query() query: GoogleOAuthCallbackDto,
  ) {
    try {
      const authenticatedUser = req.user;

      if (!authenticatedUser) {
        throw new UnauthorizedException('Google authentication failed');
      }

      // Get the full user object from database using the normalized user ID
      const user = await this.userService.findOne(authenticatedUser.userId);

      if (!user) {
        throw new UnauthorizedException('User not found after authentication');
      }

      const ip = this.getIpAddress(req);
      const userAgent = req.headers['user-agent'] || 'unknown';

      // Generate JWT tokens
      const { accessToken, refreshToken } =
        await this.googleOAuthService.generateAuthTokens(
          user, // Using the full User entity
          ip,
          userAgent,
        );

      // Set refresh token in HttpOnly cookie
      this.tokenService.setRefreshTokenCookie(res, refreshToken);

      // Generate CSRF token
      const csrfToken = req['csrfMiddleware'].generateToken(res);

      // Determine if this is a new user (created in the last 5 minutes)
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
        },
      });

      // Return authentication response
      const response: GoogleOAuthResponseDto = {
        accessToken,
        tokenType: 'Bearer',
        expiresIn: parseInt(process.env.JWT_ACCESS_EXPIRATION || '900', 10),
        csrfToken,
        isNewUser,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          surname: user.surname,
          roles: user.roles?.map((role) => role.name) || [],
          profilePictureUrl: user.profilePictureUrl,
        },
      };

      return response;
    } catch (error) {
      this.logger.error(
        `Google OAuth callback error: ${error.message}`,
        error.stack,
      );
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
  @UseGuards(AuthGuard('google'))
  async linkGoogleAccount(
    @Req() req: IAuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      // This endpoint would require the user to be already authenticated
      // and then go through Google OAuth to link their account
      const authenticatedUser = req.user;

      if (!authenticatedUser) {
        throw new UnauthorizedException(
          'User must be authenticated to link Google account',
        );
      }

      // The Google strategy would have populated req.user with Google data
      // We need to handle this differently - possibly by storing the linking intent
      // and then processing it after Google OAuth completion

      return { message: 'Google account linking initiated' };
    } catch (error) {
      this.logger.error(
        `Google account linking error: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to link Google account');
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

      return { message: 'Google account unlinked successfully' };
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
}
