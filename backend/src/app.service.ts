import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  healthCheck(): string {
    return 'The service is up and running.';
  }

  getServiceInfo() {
    return {
      name: 'Okay Mental Health API',
      version: '1.0.0',
      environment: this.configService.get<string>('NODE_ENV', 'development'),
      uptime: process.uptime(),
    };
  }
}
