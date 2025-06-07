import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';
import { IAuthenticatedRequest } from '../../core/auth/interfaces/auth-request.interface';

/**
 * Middleware to set PostgreSQL row security context based on authenticated user
 * This enforces row-level security policies defined in the database
 */
@Injectable()
export class DataIsolationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(DataIsolationMiddleware.name);

  constructor(private readonly dataSource: DataSource) {}

  async use(req: IAuthenticatedRequest, res: Response, next: NextFunction) {
    // Skip if no authenticated user
    if (!req.user) {
      return next();
    }

    try {
      const userId = req.user.userId;
      const role =
        req.user.roles && req.user.roles.length > 0
          ? req.user.roles[0]
          : 'patient';

      // Create a queryRunner to execute raw SQL
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      // Set user context in PostgreSQL session
      await queryRunner.query(`SET app.current_user_id = '${userId}'`);
      await queryRunner.query(`SET app.current_user_role = '${role}'`);
      await queryRunner.query(`SELECT set_user_context()`);

      // Release query runner
      await queryRunner.release();

      this.logger.debug(
        `Set database context for user ${userId} with role ${role}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to set database user context: ${error.message}`,
        error.stack,
      );
      // Continue even if setting context fails, but log the error
    }

    next();
  }
}
