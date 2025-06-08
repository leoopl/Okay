import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  private readonly logger = new Logger(LocalAuthGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    this.logger.log('🛡️ LocalAuthGuard.canActivate called');

    const request = context.switchToHttp().getRequest();
    this.logger.log(`📝 Request body: ${JSON.stringify(request.body)}`);

    try {
      const result = await super.canActivate(context);
      this.logger.log(`✅ LocalAuthGuard result: ${result}`);
      this.logger.log(
        `👤 User after validation: ${JSON.stringify(request.user)}`,
      );
      return result as boolean;
    } catch (error) {
      this.logger.error(`❌ LocalAuthGuard error: ${error.message}`);
      throw error;
    }
  }
}
