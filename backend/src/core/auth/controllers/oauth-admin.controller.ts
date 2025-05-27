import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { OAuthAdminService } from '../services/oauth-admin.service';
import { AuditService } from '../../audit/audit.service';
import { UserService } from 'src/modules/user/user.service';

/**
 * Admin controller for OAuth management and testing
 * Provides endpoints for OAuth administration and smoke testing
 */
@ApiTags('oauth-admin')
@Controller('admin/oauth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth('JWT')
export class OAuthAdminController {
  constructor(
    private readonly oauthAdminService: OAuthAdminService,
    private readonly auditService: AuditService,
    private readonly userService: UserService,
  ) {}

  /**
   * OAuth system health check and smoke test
   */
  @ApiOperation({ summary: 'OAuth system health check and smoke test' })
  @ApiResponse({ status: 200, description: 'OAuth system status' })
  @Get('test')
  async testOAuthSystem() {
    return this.oauthAdminService.performSystemHealthCheck();
  }

  /**
   * Get OAuth configuration status
   */
  @ApiOperation({ summary: 'Get OAuth configuration status' })
  @ApiResponse({ status: 200, description: 'OAuth configuration details' })
  @Get('config')
  async getOAuthConfig() {
    return this.oauthAdminService.getConfigurationStatus();
  }

  /**
   * Get OAuth usage statistics
   */
  @ApiOperation({ summary: 'Get OAuth usage statistics' })
  @ApiResponse({ status: 200, description: 'OAuth usage statistics' })
  @Get('stats')
  async getOAuthStats(
    @Query('days') days: number = 30,
    @Query('provider') provider?: string,
  ) {
    return this.oauthAdminService.getUsageStatistics(days, provider);
  }

  /**
   * Get recent OAuth audit logs
   */
  @ApiOperation({ summary: 'Get recent OAuth audit logs' })
  @ApiResponse({ status: 200, description: 'OAuth audit logs' })
  @Get('audit-logs')
  async getOAuthAuditLogs(
    @Query('limit') limit: number = 100,
    @Query('offset') offset: number = 0,
    @Query('userId') userId?: string,
    @Query('provider') provider?: string,
  ) {
    return this.oauthAdminService.getAuditLogs({
      limit,
      offset,
      userId,
      provider,
    });
  }

  /**
   * Get users with OAuth accounts
   */
  @ApiOperation({ summary: 'Get users with OAuth accounts' })
  @ApiResponse({ status: 200, description: 'Users with OAuth accounts' })
  @Get('users')
  async getOAuthUsers(
    @Query('provider') provider?: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ) {
    return this.oauthAdminService.getOAuthUsers({
      provider,
      limit,
      offset,
    });
  }

  /**
   * Unlink OAuth account for a user (admin action)
   */
  @ApiOperation({ summary: 'Unlink OAuth account for a user (admin)' })
  @ApiResponse({ status: 200, description: 'OAuth account unlinked' })
  @Delete('users/:userId/providers/:provider')
  async unlinkUserOAuthAccount(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('provider') provider: string,
  ) {
    return this.oauthAdminService.unlinkUserOAuthAccount(userId, provider);
  }

  /**
   * Test OAuth provider connectivity
   */
  @ApiOperation({ summary: 'Test OAuth provider connectivity' })
  @ApiResponse({
    status: 200,
    description: 'Provider connectivity test results',
  })
  @Post('test/provider/:provider')
  async testProviderConnectivity(@Param('provider') provider: string) {
    return this.oauthAdminService.testProviderConnectivity(provider);
  }

  /**
   * Simulate OAuth flow for testing
   */
  @ApiOperation({ summary: 'Simulate OAuth flow for testing' })
  @ApiResponse({ status: 200, description: 'OAuth flow simulation results' })
  @Post('test/simulate')
  async simulateOAuthFlow(@Body() simulationData: any) {
    return this.oauthAdminService.simulateOAuthFlow(simulationData);
  }

  /**
   * Get OAuth error patterns and analytics
   */
  @ApiOperation({ summary: 'Get OAuth error patterns and analytics' })
  @ApiResponse({ status: 200, description: 'OAuth error analytics' })
  @Get('errors/analytics')
  async getErrorAnalytics(@Query('days') days: number = 7) {
    return this.oauthAdminService.getErrorAnalytics(days);
  }

  /**
   * Force refresh OAuth tokens for a user
   */
  @ApiOperation({ summary: 'Force refresh OAuth tokens for a user' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed successfully' })
  @Patch('users/:userId/refresh-tokens')
  async refreshUserTokens(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.oauthAdminService.refreshUserTokens(userId);
  }
}
