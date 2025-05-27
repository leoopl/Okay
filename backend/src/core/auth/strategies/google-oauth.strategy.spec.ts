import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GoogleOAuthStrategy, GoogleProfile } from './google-oauth.strategy';
import { GoogleOAuthService } from '../services/google-oauth.service';
import { AuditService } from '../../audit/audit.service';
import { UnauthorizedException } from '@nestjs/common';

describe('GoogleOAuthStrategy', () => {
  let strategy: GoogleOAuthStrategy;
  let googleOAuthService: jest.Mocked<GoogleOAuthService>;
  let auditService: jest.Mocked<AuditService>;

  const mockProfile: GoogleProfile = {
    id: 'google123',
    displayName: 'John Doe',
    name: {
      familyName: 'Doe',
      givenName: 'John',
    },
    emails: [
      {
        value: 'test@example.com',
        verified: true,
      },
    ],
    photos: [
      {
        value: 'https://example.com/picture.jpg',
      },
    ],
    provider: 'google',
  };

  beforeEach(async () => {
    const mockGoogleOAuthService = {
      validateGoogleUser: jest.fn(),
    };

    const mockAuditService = {
      logAction: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        callbackUrl: 'http://localhost:3001/api/auth/google/callback',
        scope: ['openid', 'profile', 'email'],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleOAuthStrategy,
        { provide: GoogleOAuthService, useValue: mockGoogleOAuthService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<GoogleOAuthStrategy>(GoogleOAuthStrategy);
    googleOAuthService = module.get(GoogleOAuthService);
    auditService = module.get(AuditService);
  });

  describe('validate', () => {
    it('should validate and return user on successful authentication', async () => {
      // Arrange
      const mockUser = { id: 'user123', email: 'test@example.com' };
      const done = jest.fn();

      googleOAuthService.validateGoogleUser.mockResolvedValue(mockUser as any);

      // Act
      await strategy.validate(
        'access_token',
        'refresh_token',
        mockProfile,
        done,
      );

      // Assert
      expect(googleOAuthService.validateGoogleUser).toHaveBeenCalledWith(
        {
          googleId: 'google123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          picture: 'https://example.com/picture.jpg',
          emailVerified: true,
        },
        'access_token',
        'refresh_token',
      );
      expect(done).toHaveBeenCalledWith(null, mockUser);
      expect(auditService.logAction).toHaveBeenCalled();
    });

    it('should handle authentication failure', async () => {
      // Arrange
      const done = jest.fn();
      const error = new Error('Authentication failed');

      googleOAuthService.validateGoogleUser.mockRejectedValue(error);

      // Act
      await strategy.validate(
        'access_token',
        'refresh_token',
        mockProfile,
        done,
      );

      // Assert
      expect(done).toHaveBeenCalledWith(
        expect.any(UnauthorizedException),
        null,
      );
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'FAILED_LOGIN',
        }),
      );
    });

    it('should throw error when profile has no emails', async () => {
      // Arrange
      const profileWithoutEmails = { ...mockProfile, emails: [] };
      const done = jest.fn();

      // Act
      await strategy.validate(
        'access_token',
        'refresh_token',
        profileWithoutEmails,
        done,
      );

      // Assert
      expect(done).toHaveBeenCalledWith(
        expect.any(UnauthorizedException),
        null,
      );
    });
  });
});
