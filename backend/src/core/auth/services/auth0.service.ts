import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class Auth0Service {
  private readonly logger = new Logger(Auth0Service.name);
  private managementApiToken: string;
  private tokenExpiresAt: number;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  /**
   * Get an access token for the Auth0 Management API
   */
  async getManagementApiToken(): Promise<string> {
    // Check if we have a valid token
    const now = Date.now();
    if (this.managementApiToken && this.tokenExpiresAt > now) {
      return this.managementApiToken;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          this.configService.get<string>('auth0.tokenEndpoint'),
          {
            client_id: this.configService.get<string>('auth0.clientId'),
            client_secret: this.configService.get<string>('auth0.clientSecret'),
            audience: this.configService.get<string>(
              'auth0.managementAudience',
            ),
            grant_type: 'client_credentials',
          },
          {
            headers: { 'content-type': 'application/json' },
          },
        ),
      );

      this.managementApiToken = response.data.access_token;
      // Set expiry time with a safety margin
      this.tokenExpiresAt = now + response.data.expires_in * 1000 - 60000; // Expire 1 minute early
      return this.managementApiToken;
    } catch (error) {
      this.logger.error(
        `Failed to get Auth0 management token: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get user profile from Auth0
   */
  async getUserProfile(auth0Id: string): Promise<any> {
    try {
      const token = await this.getManagementApiToken();
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.configService.get<string>('auth0.managementAudience')}users/${auth0Id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get user profile: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update user metadata in Auth0
   * Use this for storing non-sensitive user preferences
   */
  async updateUserMetadata(auth0Id: string, metadata: any): Promise<any> {
    try {
      const token = await this.getManagementApiToken();
      const response = await firstValueFrom(
        this.httpService.patch(
          `${this.configService.get<string>('auth0.managementAudience')}users/${auth0Id}`,
          {
            user_metadata: metadata,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to update user metadata: ${error.message}`);
      throw error;
    }
  }
}
