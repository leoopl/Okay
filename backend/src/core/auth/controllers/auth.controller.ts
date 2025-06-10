import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Delete,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';
import { AccountLinkingService } from '../services/account-linking.service';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { JwtRefreshGuard } from '../guards/jwt-refresh.guard';
import { Public } from '../../../common/decorators/is-public.decorator';
import { LoginDto } from '../dto/login.dto';
import { LogoutDto } from '../dto/logout.dto';
import { TokenResponseDto } from '../dto/token-response.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { ConfigService } from '@nestjs/config';
import { CsrfMiddleware } from '../../../common/middleware/csrf.middleware';

/**
 * Authentication controller handling login, logout, and token management
 */
@ApiTags('authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly accountLinkingService: AccountLinkingService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Login with email and password
   */
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 5, ttl: 300 } })
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: TokenResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many login attempts' })
  async login(@Req() req: Request, @Res() res: Response) {
    const user = req.user as any;
    const deviceInfo = this.authService.extractDeviceInfoFromRequest(req);

    // Create auth session and get tokens
    const authResult = await this.authService.createAuthSession(
      user,
      deviceInfo,
      'local',
    );

    // Set refresh token in HTTP-only cookie
    this.setRefreshTokenCookie(res, authResult.tokens.refreshToken);

    // Generate CSRF token and set in cookie
    let csrfToken = authResult.csrfToken;

    // Use csrfMiddleware if available, otherwise use TokenService
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

    // Build and send response with the CSRF token
    const response = this.authService['buildAuthResponse'](user, authResult);
    response.csrfToken = csrfToken;

    return res.json(response);
  }

  /**
   * Refresh access token
   */
  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: TokenResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Req() req: Request, @Res() res: Response) {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not provided');
    }

    const deviceInfo = this.authService.extractDeviceInfoFromRequest(req);
    const authResponse = await this.authService.refreshAccessToken(
      refreshToken,
      deviceInfo,
    );

    // Set new refresh token in cookie
    this.setRefreshTokenCookie(res, authResponse['refreshToken']);

    // Update CSRF token
    const csrfMiddleware = req['csrfMiddleware'] as CsrfMiddleware;
    if (csrfMiddleware) {
      authResponse.csrfToken = csrfMiddleware.generateToken(res);
    }

    return res.json(authResponse);
  }

  /**
   * Logout current session or all sessions
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Logout user' })
  @ApiBody({ type: LogoutDto })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(
    @Req() req: Request,
    @Res() res: Response,
    @Body() logoutDto: LogoutDto,
  ) {
    const user = req.user as any;
    const refreshToken = req.cookies?.refreshToken;
    const deviceInfo = this.authService.extractDeviceInfoFromRequest(req);

    await this.authService.logout(
      user.userId,
      refreshToken,
      logoutDto.allDevices || false,
      deviceInfo,
    );

    // Clear cookies
    this.clearAuthCookies(res);

    // Clear CSRF token
    const csrfMiddleware = req['csrfMiddleware'] as CsrfMiddleware;
    if (csrfMiddleware) {
      csrfMiddleware.clearToken(res);
    }

    return res.json({ message: 'Logout successful' });
  }

  /**
   * Get current user sessions
   */
  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get active sessions for current user' })
  @ApiResponse({ status: 200, description: 'List of active sessions' })
  async getSessions(@Req() req: Request) {
    const user = req.user as any;
    return this.sessionService.getUserSessionStats(user.userId);
  }

  /**
   * Terminate a specific session
   */
  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Terminate a specific session' })
  @ApiResponse({ status: 204, description: 'Session terminated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async terminateSession(
    @Req() req: Request,
    @Param('sessionId') sessionId: string,
  ) {
    const user = req.user as any;
    await this.authService.terminateSession(
      user.userId,
      sessionId,
      user.userId,
    );
  }

  /**
   * Get account linking status
   */
  @UseGuards(JwtAuthGuard)
  @Get('account-linking')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get OAuth account linking status' })
  @ApiResponse({ status: 200, description: 'Account linking status' })
  async getAccountLinkingStatus(@Req() req: Request) {
    const user = req.user as any;
    return this.accountLinkingService.getAccountLinkingStatus(user.userId);
  }

  /**
   * Unlink OAuth provider
   */
  @UseGuards(JwtAuthGuard)
  @Delete('account-linking/:provider')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Unlink OAuth provider from account' })
  @ApiResponse({ status: 204, description: 'Provider unlinked' })
  @ApiResponse({ status: 400, description: 'Cannot unlink provider' })
  async unlinkProvider(
    @Req() req: Request,
    @Param('provider') provider: string,
  ) {
    const user = req.user as any;
    await this.accountLinkingService.unlinkProvider(
      user.userId,
      provider,
      user.userId,
    );
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

  /**
   * Clear authentication cookies
   */
  private clearAuthCookies(res: Response): void {
    const secure = this.configService.get<boolean>('SECURE_COOKIES', false);
    const domain = this.configService.get<string>('COOKIE_DOMAIN');

    // Clear refresh token
    res.cookie('refreshToken', '', {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      domain,
      path: '/',
      maxAge: 0,
    });

    // Clear access token if stored in cookie
    res.cookie('accessToken', '', {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      domain,
      path: '/',
      maxAge: 0,
    });
  }

  /**
   * Diagnostic endpoint to check auth strategies (Development only)
   */
  @Public()
  @Get('diagnostics')
  @ApiOperation({ summary: 'Check authentication strategies status' })
  @ApiResponse({ status: 200, description: 'Diagnostics information' })
  async getDiagnostics() {
    const passport = require('passport');
    const strategies = passport._strategies || {};

    return {
      registeredStrategies: Object.keys(strategies),
      totalStrategies: Object.keys(strategies).length,
      details: {
        hasLocal: 'local' in strategies,
        hasJwt: 'jwt' in strategies,
        hasJwtRefresh: 'jwt-refresh' in strategies,
        hasGoogleOAuth: 'google-oauth' in strategies,
      },
      environment: this.configService.get('NODE_ENV'),
      timestamp: new Date().toISOString(),
    };
  }
}
