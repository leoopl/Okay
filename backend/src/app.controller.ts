import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './common/decorators/is-public.decorator';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public() // Mark this endpoint as public
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is running' })
  @Get('/health')
  healthCheck(): string {
    return this.appService.healthCheck();
  }

  @Public() // Mark this endpoint as public
  @ApiOperation({ summary: 'Service information' })
  @ApiResponse({ status: 200, description: 'Service information' })
  @Get('/info')
  getInfo() {
    return this.appService.getServiceInfo();
  }
}
