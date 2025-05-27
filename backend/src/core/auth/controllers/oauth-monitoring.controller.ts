import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { OAuthMonitoringService } from '../services/oauth-monitoring.service';

/**
 * Controller for OAuth monitoring and alerting
 */
@ApiTags('oauth-monitoring')
@Controller('admin/oauth/monitoring')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth('JWT')
export class OAuthMonitoringController {
  constructor(private readonly monitoringService: OAuthMonitoringService) {}

  /**
   * Get current OAuth system metrics
   */
  @ApiOperation({ summary: 'Get current OAuth system metrics' })
  @ApiResponse({ status: 200, description: 'Current OAuth metrics' })
  @Get('metrics')
  async getCurrentMetrics() {
    return this.monitoringService.getCurrentMetrics();
  }

  /**
   * Get recent OAuth alerts
   */
  @ApiOperation({ summary: 'Get recent OAuth alerts' })
  @ApiResponse({ status: 200, description: 'Recent OAuth alerts' })
  @Get('alerts')
  async getAlerts(@Query('hours') hours: number = 24) {
    return {
      alerts: this.monitoringService.getAlerts(hours),
      timeframe: `${hours} hours`,
    };
  }

  /**
   * Clear all OAuth alerts
   */
  @ApiOperation({ summary: 'Clear all OAuth alerts' })
  @ApiResponse({ status: 200, description: 'Alerts cleared successfully' })
  @Post('alerts/clear')
  @HttpCode(HttpStatus.OK)
  async clearAlerts() {
    this.monitoringService.clearAlerts();
    return { message: 'OAuth alerts cleared successfully' };
  }

  /**
   * Trigger manual monitoring check
   */
  @ApiOperation({ summary: 'Trigger manual monitoring check' })
  @ApiResponse({ status: 200, description: 'Monitoring check completed' })
  @Post('check')
  @HttpCode(HttpStatus.OK)
  async triggerMonitoringCheck() {
    await this.monitoringService.monitorOAuthSystem();
    return { message: 'Monitoring check completed' };
  }
}
