import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request } from 'express';
import { Auth0Guard } from './guards/auth0.guard';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Auth0Service } from './services/auth0.service';
import { AuditService } from '../audit/audit.service';
import { ConfigService } from '@nestjs/config';
import { AuditAction } from 'src/audit/entities/audit-log.entity';

interface AuthenticatedRequest extends Request {
  user?: any;
}

@ApiTags('authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auth0Service: Auth0Service,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  @ApiOperation({ summary: 'Get Auth0 configuration for frontend' })
  @ApiResponse({ status: 200, description: 'Auth0 configuration' })
  @Get('config')
  getConfig() {
    return {
      domain: this.configService.get<string>('auth0.domain'),
      clientId: this.configService.get<string>('auth0.clientId'),
      audience: this.configService.get<string>('auth0.audience'),
      redirectUri: `${this.configService.get<string>('FRONTEND_URL')}/callback`,
    };
  }

  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Returns the current user profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(Auth0Guard)
  @Get('profile')
  async getProfile(@Req() req: AuthenticatedRequest) {
    // Log the access for audit trail
    await this.auditService.logAction({
      userId: req.user.userId,
      action: AuditAction.PROFILE_ACCESS,
      resource: 'user',
      resourceId: req.user.userId,
      details: { message: 'User accessed their profile' },
    });

    // Enhanced profile with user data from Auth0
    const auth0Profile = await this.auth0Service.getUserProfile(
      req.user.auth0Id,
    );

    return {
      user: {
        ...req.user,
        picture: auth0Profile.picture,
        // Include any other relevant fields but exclude sensitive information
      },
    };
  }

  @ApiOperation({ summary: 'Log user action for audit' })
  @ApiResponse({ status: 200, description: 'Action logged successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(Auth0Guard)
  @Post('log-action')
  async logAction(@Req() req: AuthenticatedRequest, @Body() actionData: any) {
    await this.auditService.logAction({
      userId: req.user.userId,
      action: actionData.action,
      resource: actionData.resource,
      resourceId: actionData.resourceId,
      details: actionData.details,
    });

    return { success: true };
  }
}
