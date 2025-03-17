/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UseGuards,
  HttpException,
  HttpStatus,
  ConflictException,
  UnauthorizedException,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Request, Response } from 'express';
import { JwtAuthGuard } from './guards/jwt-guard';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CookieOptions } from 'express';

interface AuthenticatedRequest extends Request {
  user?: any;
}

@ApiTags('authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 400, description: 'Registration failed' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto, @Res() res: Response) {
    try {
      const result = await this.authService.register(createUserDto);

      // Set authentication cookies
      this.setAuthCookies(res, result.access_token, result.refresh_token);

      // Return user data without sensitive information
      return res.status(HttpStatus.CREATED).json({
        message: 'Registration successful',
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
        },
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new HttpException(
        'Registration failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({ summary: 'Sign in a user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Login failed' })
  @UseGuards(LocalAuthGuard)
  @Post('signin')
  async signin(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    try {
      const result = await this.authService.signIn(req.user);

      // Set authentication cookies
      this.setAuthCookies(res, result.access_token, result.refresh_token);

      // Return success with user data
      return res.status(HttpStatus.OK).json({
        message: 'Logged in successfully',
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
        },
      });
    } catch (error) {
      throw new HttpException('Login failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  @Post('refresh')
  async refresh(@Req() req: Request, @Res() res: Response) {
    try {
      const refresh_token = req.cookies['refresh_token'];

      if (!refresh_token) {
        throw new UnauthorizedException('Refresh token not found');
      }

      const result = await this.authService.refresh(refresh_token);

      // Set new authentication cookies
      this.setAuthCookies(res, result.access_token, result.refresh_token);

      // Return success
      return res.status(HttpStatus.OK).json({
        message: 'Token refreshed successfully',
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
        },
      });
    } catch (error) {
      res.clearCookie('access_token');
      res.clearCookie('refresh_token');
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Res() res: Response) {
    // Clear authentication cookies
    res.clearCookie('access_token', this.getCookieOptions());
    res.clearCookie('refresh_token', this.getCookieOptions());

    // Return success
    return res.status(HttpStatus.OK).json({
      message: 'Logged out successfully',
    });
  }

  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Returns the current user profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Req() req: AuthenticatedRequest) {
    return {
      user: req.user,
    };
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // This route initiates the Google OAuth flow
    // The guard redirects to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    try {
      // The user has been authenticated and is available in req.user
      const { access_token, refresh_token } = req.user;

      // Set cookies
      this.setAuthCookies(res, access_token, refresh_token);

      // Redirect to frontend app
      return res.redirect(process.env.FRONTEND_URL);
    } catch (error) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth/error`);
    }
  }

  // Helper method to set authentication cookies
  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    const cookieOptions = this.getCookieOptions();

    // Set access token cookie (short-lived)
    res.cookie('access_token', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    // Set refresh token cookie (long-lived)
    res.cookie('refresh_token', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  // Common cookie options
  private getCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'development',
      sameSite: 'strict', // Adjust based on your frontend setup
      path: '/',
    };
  }
}
