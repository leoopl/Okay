import { Injectable, Logger, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';

export interface OIDCConfiguration {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
  scopes_supported: string[];
  response_types_supported: string[];
  grant_types_supported: string[];
  id_token_signing_alg_values_supported: string[];
  claims_supported: string[];
  expiresAt?: Date;
}

export interface OIDCClaims {
  iss: string;
  sub: string;
  aud: string | string[];
  exp: number;
  iat: number;
  nonce?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
  hd?: string; // Hosted domain for Google Workspace
}

@Injectable()
export class OIDCDiscoveryService {
  private readonly logger = new Logger(OIDCDiscoveryService.name);
  private readonly discoveryCache = new Map<string, OIDCConfiguration>();
  private jwksClients = new Map<string, jwksClient.JwksClient>();

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get OpenID Connect configuration
   */
  async getConfiguration(issuer: string): Promise<OIDCConfiguration> {
    const cached = this.discoveryCache.get(issuer);
    if (cached && cached.expiresAt && cached.expiresAt > new Date()) {
      return cached;
    }

    try {
      const discoveryUrl = `${issuer}/.well-known/openid-configuration`;
      const response = await firstValueFrom(
        this.httpService.get<OIDCConfiguration>(discoveryUrl),
      );

      const config: OIDCConfiguration = {
        ...response.data,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      };

      this.discoveryCache.set(issuer, config);
      this.logger.log(`Fetched OIDC configuration for ${issuer}`);

      // Initialize JWKS client
      this.initializeJwksClient(issuer, config.jwks_uri);

      return config;
    } catch (error) {
      this.logger.error(`Failed to fetch OIDC configuration: ${error.message}`);
      throw new HttpException('Failed to fetch OIDC configuration', 500);
    }
  }

  /**
   * Initialize JWKS client for the issuer
   */
  private initializeJwksClient(issuer: string, jwksUri: string): void {
    if (!this.jwksClients.has(issuer)) {
      const client = jwksClient({
        jwksUri,
        cache: true,
        cacheMaxEntries: 5,
        cacheMaxAge: 10 * 60 * 60 * 1000, // 10 hours
        rateLimit: true,
        jwksRequestsPerMinute: 10,
      });

      this.jwksClients.set(issuer, client);
    }
  }

  /**
   * Validate ID token according to OpenID Connect spec
   */
  async validateIDToken(
    idToken: string,
    expectedNonce?: string,
  ): Promise<OIDCClaims> {
    try {
      // Decode token to get issuer
      const decoded = jwt.decode(idToken, { complete: true }) as any;
      if (!decoded || !decoded.payload) {
        throw new Error('Invalid ID token format');
      }

      const issuer = decoded.payload.iss;
      const kid = decoded.header.kid;

      // Get JWKS client
      const client = this.jwksClients.get(issuer);
      if (!client) {
        await this.getConfiguration(issuer);
        const updatedClient = this.jwksClients.get(issuer);
        if (!updatedClient) {
          throw new Error('Failed to initialize JWKS client');
        }
      }

      // Get signing key
      const key = await this.getSigningKey(issuer, kid);

      // Verify token
      const verified = jwt.verify(idToken, key, {
        algorithms: ['RS256'],
        issuer,
        audience: this.configService.get('GOOGLE_CLIENT_ID'),
      }) as OIDCClaims;

      // Additional OpenID Connect validations
      this.validateOIDCClaims(verified, expectedNonce);

      return verified;
    } catch (error) {
      this.logger.error(`ID token validation failed: ${error.message}`);
      throw new Error('Invalid ID token');
    }
  }

  /**
   * Get signing key from JWKS
   */
  private async getSigningKey(issuer: string, kid: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const client = this.jwksClients.get(issuer);
      if (!client) {
        reject(new Error('JWKS client not initialized'));
        return;
      }

      client.getSigningKey(kid, (err, key) => {
        if (err) {
          reject(err);
        } else {
          resolve(key.getPublicKey());
        }
      });
    });
  }

  /**
   * Validate OpenID Connect specific claims
   */
  private validateOIDCClaims(claims: OIDCClaims, expectedNonce?: string): void {
    // Validate nonce if provided
    if (expectedNonce && claims.nonce !== expectedNonce) {
      throw new Error('Nonce mismatch');
    }

    // Validate token is not expired
    const now = Math.floor(Date.now() / 1000);
    if (claims.exp < now) {
      throw new Error('ID token expired');
    }

    // Validate issued at time is not in the future
    if (claims.iat > now + 60) {
      // Allow 1 minute clock skew
      throw new Error('ID token issued in the future');
    }

    // For Google, validate hosted domain if configured
    const allowedDomain = this.configService.get('GOOGLE_ALLOWED_DOMAIN');
    if (allowedDomain && claims.hd !== allowedDomain) {
      throw new Error('User not from allowed domain');
    }
  }

  /**
   * Get user info from userinfo endpoint
   */
  async getUserInfo(accessToken: string, issuer: string): Promise<any> {
    try {
      const config = await this.getConfiguration(issuer);
      const response = await firstValueFrom(
        this.httpService.get(config.userinfo_endpoint, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch user info: ${error.message}`);
      throw new Error('Failed to fetch user info');
    }
  }
}
