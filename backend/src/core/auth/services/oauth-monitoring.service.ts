import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuditLog, AuditAction } from '../../audit/entities/audit-log.entity';
import { User } from '../../../modules/user/entities/user.entity';

export interface OAuthAlert {
  type: 'security' | 'performance' | 'error' | 'usage';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  data: Record<string, any>;
  timestamp: Date;
}

export interface OAuthMetrics {
  authenticationRate: number;
  errorRate: number;
  responseTime: number;
  uniqueUsers: number;
  failedAttempts: number;
  successRate: number;
}

/**
 * Service for monitoring OAuth system health and generating alerts
 */
@Injectable()
export class OAuthMonitoringService {
  private readonly logger = new Logger(OAuthMonitoringService.name);
  private readonly alerts: OAuthAlert[] = [];
  private readonly maxAlerts = 1000;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Monitors OAuth system every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async monitorOAuthSystem(): Promise<void> {
    try {
      await this.checkAuthenticationRates();
      await this.checkErrorRates();
      await this.checkSuspiciousActivity();
      await this.checkSystemHealth();

      this.logger.debug('OAuth monitoring check completed');
    } catch (error) {
      this.logger.error('OAuth monitoring failed', error.stack);
      await this.generateAlert({
        type: 'error',
        severity: 'high',
        message: 'OAuth monitoring system failure',
        data: { error: error.message },
        timestamp: new Date(),
      });
    }
  }

  /**
   * Daily OAuth analytics report
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async generateDailyReport(): Promise<void> {
    try {
      const metrics = await this.calculateDailyMetrics();
      const report = await this.buildDailyReport(metrics);

      this.logger.log('Daily OAuth report generated', report);

      // Send report to monitoring system or email
      await this.sendReport(report);
    } catch (error) {
      this.logger.error('Failed to generate daily report', error.stack);
    }
  }

  /**
   * Checks authentication rates for anomalies
   */
  private async checkAuthenticationRates(): Promise<void> {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const authAttempts = await this.auditRepository.count({
      where: {
        action: AuditAction.LOGIN,
        timestamp: MoreThan(last24Hours as any),
      },
    });

    const normalRate = this.configService.get<number>('NORMAL_AUTH_RATE', 100);
    const alertThreshold = normalRate * 3; // 300% of normal

    if (authAttempts > alertThreshold) {
      await this.generateAlert({
        type: 'security',
        severity: 'high',
        message: 'Unusually high authentication rate detected',
        data: {
          attempts: authAttempts,
          threshold: alertThreshold,
          timeframe: '24 hours',
        },
        timestamp: new Date(),
      });
    }
  }

  /**
   * Checks error rates for system issues
   */
  private async checkErrorRates(): Promise<void> {
    const last1Hour = new Date(Date.now() - 60 * 60 * 1000);

    const totalAttempts = await this.auditRepository.count({
      where: {
        resource: 'auth',
        timestamp: MoreThan(last1Hour as any),
      },
    });

    const failedAttempts = await this.auditRepository.count({
      where: {
        action: AuditAction.FAILED_LOGIN,
        timestamp: MoreThan(last1Hour as any),
      },
    });

    if (totalAttempts > 0) {
      const errorRate = (failedAttempts / totalAttempts) * 100;
      const errorThreshold = this.configService.get<number>(
        'ERROR_RATE_THRESHOLD',
        25,
      );

      if (errorRate > errorThreshold) {
        await this.generateAlert({
          type: 'error',
          severity: errorRate > 50 ? 'critical' : 'high',
          message: 'High OAuth error rate detected',
          data: {
            errorRate: Math.round(errorRate * 100) / 100,
            threshold: errorThreshold,
            failedAttempts,
            totalAttempts,
          },
          timestamp: new Date(),
        });
      }
    }
  }

  /**
   * Checks for suspicious authentication activity
   */
  private async checkSuspiciousActivity(): Promise<void> {
    const last1Hour = new Date(Date.now() - 60 * 60 * 1000);

    // Check for rapid failed attempts from same IP
    const suspiciousIPs = await this.auditRepository
      .createQueryBuilder('audit')
      .select('audit.details')
      .where('audit.action = :action', { action: AuditAction.FAILED_LOGIN })
      .andWhere('audit.timestamp > :timestamp', { timestamp: last1Hour })
      .groupBy('audit.details')
      .having('COUNT(*) > :threshold', { threshold: 10 })
      .getRawMany();

    if (suspiciousIPs.length > 0) {
      await this.generateAlert({
        type: 'security',
        severity: 'critical',
        message: 'Potential brute force attack detected',
        data: {
          suspiciousIPs: suspiciousIPs.length,
          timeframe: '1 hour',
        },
        timestamp: new Date(),
      });
    }

    // Check for unusual geographic patterns
    await this.checkGeographicAnomalies();
  }

  /**
   * Checks system health indicators
   */
  private async checkSystemHealth(): Promise<void> {
    try {
      // Check database connectivity
      await this.userRepository.count();

      // Check Google OAuth configuration
      const googleClientId = this.configService.get('GOOGLE_CLIENT_ID');
      if (!googleClientId) {
        await this.generateAlert({
          type: 'error',
          severity: 'critical',
          message: 'Google OAuth configuration missing',
          data: { component: 'google_oauth' },
          timestamp: new Date(),
        });
      }

      // Check JWT configuration
      const jwtSecret = this.configService.get('JWT_SECRET');
      if (!jwtSecret) {
        await this.generateAlert({
          type: 'error',
          severity: 'critical',
          message: 'JWT configuration missing',
          data: { component: 'jwt' },
          timestamp: new Date(),
        });
      }
    } catch (error) {
      await this.generateAlert({
        type: 'error',
        severity: 'critical',
        message: 'System health check failed',
        data: { error: error.message },
        timestamp: new Date(),
      });
    }
  }

  /**
   * Checks for geographic authentication anomalies
   */
  private async checkGeographicAnomalies(): Promise<void> {
    // This would integrate with IP geolocation service
    // For now, we'll check for unusual patterns in IP addresses

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentLogins = await this.auditRepository.find({
      where: {
        action: AuditAction.LOGIN,
        timestamp: MoreThan(last24Hours as any),
      },
      order: { timestamp: 'DESC' },
      take: 1000,
    });

    // Simple check for too many different IP addresses for same user
    const userIpMap = new Map<string, Set<string>>();

    recentLogins.forEach((login) => {
      const userId = login.userId;
      const ip = login.details?.ip;

      if (userId && ip) {
        if (!userIpMap.has(userId)) {
          userIpMap.set(userId, new Set());
        }
        userIpMap.get(userId).add(ip);
      }
    });

    // Alert if user has too many different IPs in 24 hours
    for (const [userId, ips] of userIpMap.entries()) {
      if (ips.size > 5) {
        // More than 5 different IPs
        await this.generateAlert({
          type: 'security',
          severity: 'medium',
          message: 'User authentication from multiple locations',
          data: {
            userId,
            uniqueIPs: ips.size,
            timeframe: '24 hours',
          },
          timestamp: new Date(),
        });
      }
    }
  }

  /**
   * Calculates daily OAuth metrics
   */
  private async calculateDailyMetrics(): Promise<OAuthMetrics> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalAttempts = await this.auditRepository.count({
      where: {
        resource: 'auth',
        timestamp: MoreThan(yesterday as any),
      },
    });

    const successfulLogins = await this.auditRepository.count({
      where: {
        action: AuditAction.LOGIN,
        timestamp: MoreThan(yesterday as any),
      },
    });

    const failedAttempts = await this.auditRepository.count({
      where: {
        action: AuditAction.FAILED_LOGIN,
        timestamp: MoreThan(yesterday as any),
      },
    });

    const uniqueUsers = await this.auditRepository
      .createQueryBuilder('audit')
      .select('COUNT(DISTINCT audit.userId)', 'count')
      .where('audit.action = :action', { action: AuditAction.LOGIN })
      .andWhere('audit.timestamp > :timestamp', { timestamp: yesterday })
      .getRawOne();

    return {
      authenticationRate: totalAttempts,
      errorRate: totalAttempts > 0 ? (failedAttempts / totalAttempts) * 100 : 0,
      responseTime: 0, // Would need to implement response time tracking
      uniqueUsers: parseInt(uniqueUsers?.count || '0'),
      failedAttempts,
      successRate:
        totalAttempts > 0 ? (successfulLogins / totalAttempts) * 100 : 0,
    };
  }

  /**
   * Builds daily report from metrics
   */
  private async buildDailyReport(metrics: OAuthMetrics): Promise<any> {
    const reportDate = new Date();
    reportDate.setDate(reportDate.getDate() - 1);

    return {
      date: reportDate.toISOString().split('T')[0],
      summary: {
        totalAuthentications: metrics.authenticationRate,
        successRate: Math.round(metrics.successRate * 100) / 100,
        errorRate: Math.round(metrics.errorRate * 100) / 100,
        uniqueUsers: metrics.uniqueUsers,
        failedAttempts: metrics.failedAttempts,
      },
      alerts: this.getRecentAlerts(24), // Last 24 hours
      recommendations: this.generateRecommendations(metrics),
    };
  }

  /**
   * Generates alert and stores it
   */
  private async generateAlert(alert: OAuthAlert): Promise<void> {
    this.alerts.unshift(alert);

    // Keep only recent alerts
    if (this.alerts.length > this.maxAlerts) {
      this.alerts.splice(this.maxAlerts);
    }

    this.logger.warn(
      `OAuth Alert [${alert.severity}]: ${alert.message}`,
      alert.data,
    );

    // In production, this would integrate with:
    // - Email alerts
    // - Slack notifications
    // - External monitoring systems (DataDog, New Relic, etc.)
    // - SMS alerts for critical issues

    if (alert.severity === 'critical') {
      await this.sendCriticalAlert(alert);
    }
  }

  /**
   * Gets recent alerts within specified hours
   */
  private getRecentAlerts(hours: number): OAuthAlert[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.alerts.filter((alert) => alert.timestamp > cutoff);
  }

  /**
   * Generates recommendations based on metrics
   */
  private generateRecommendations(metrics: OAuthMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.errorRate > 20) {
      recommendations.push(
        'High error rate detected. Review OAuth configuration and error logs.',
      );
    }

    if (metrics.authenticationRate < 10) {
      recommendations.push(
        'Low authentication activity. Consider promoting OAuth login option.',
      );
    }

    if (metrics.successRate < 80) {
      recommendations.push(
        'Low success rate. Check for user experience issues in OAuth flow.',
      );
    }

    return recommendations;
  }

  /**
   * Sends critical alerts via multiple channels
   */
  private async sendCriticalAlert(alert: OAuthAlert): Promise<void> {
    // Implementation would send alerts via:
    // - Email to admin team
    // - SMS to on-call engineer
    // - Slack/Teams notification
    // - External monitoring system webhook

    this.logger.error(`CRITICAL OAUTH ALERT: ${alert.message}`, alert.data);
  }

  /**
   * Sends daily report
   */
  private async sendReport(report: any): Promise<void> {
    // Implementation would send report via:
    // - Email to stakeholders
    // - Dashboard update
    // - Analytics system

    this.logger.log('Daily OAuth report ready for distribution', {
      date: report.date,
      summary: report.summary,
    });
  }

  /**
   * Gets current system metrics (for API endpoint)
   */
  async getCurrentMetrics(): Promise<OAuthMetrics> {
    return this.calculateDailyMetrics();
  }

  /**
   * Gets recent alerts (for API endpoint)
   */
  getAlerts(hours: number = 24): OAuthAlert[] {
    return this.getRecentAlerts(hours);
  }

  /**
   * Clears alerts (for admin use)
   */
  clearAlerts(): void {
    this.alerts.length = 0;
    this.logger.log('OAuth alerts cleared by admin');
  }
}
