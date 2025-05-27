import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { Response } from 'express';
import { AuditService } from 'src/core/audit/audit.service';
import { User } from 'src/modules/user/entities/user.entity';
import { GoogleOAuthService } from '../services/google-oauth.service';
import { TokenService } from '../services/token.service';

describe('AuthController - Google OAuth', () => {
  let controller: AuthController;
  let googleOAuthService: jest.Mocked<GoogleOAuthService>;
  let tokenService: jest.Mocked<TokenService>;

  const mockUser: User = {
    id: 'user123',
    email: 'test@example.com',
    name: 'John',
    surname: 'Doe',
    roles: [{ name: 'patient' }],
    createdAt: new Date(),
  } as User;

  beforeEach(async () => {
    const mockGoogleOAuthService = {
      generateAuthTokens: jest.fn(),
    };

    const mockTokenService = {
      setRefreshTokenCookie: jest.fn(),
    };

    const mockAuditService = {
      logAction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: GoogleOAuthService, useValue: mockGoogleOAuthService },
        { provide: TokenService, useValue: mockTokenService },
        { provide: AuditService, useValue: mockAuditService },
        // Add other required providers...
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    googleOAuthService = module.get(GoogleOAuthService);
    tokenService = module.get(TokenService);
  });

  describe('googleOAuthCallback', () => {
    it('should handle successful Google OAuth callback', async () => {
      // Arrange
      const mockRequest = {
        user: mockUser,
        headers: { 'user-agent': 'Mozilla/5.0' },
        ip: '192.168.1.1',
        csrfMiddleware: {
          generateToken: jest.fn().mockReturnValue('csrf-token'),
        },
      } as any;

      const mockResponse = {} as Response;
      const mockQuery = { code: 'auth-code', state: 'state-123' };

      googleOAuthService.generateAuthTokens.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      // Act
      const result = await controller.googleOAuthCallback(
        mockRequest,
        mockResponse,
        mockQuery,
      );

      // Assert
      expect(result).toEqual({
        accessToken: 'access-token',
        tokenType: 'Bearer',
        expiresIn: 900,
        csrfToken: 'csrf-token',
        isNewUser: false,
        user: {
          id: 'user123',
          email: 'test@example.com',
          name: 'John',
          surname: 'Doe',
          roles: ['patient'],
          profilePictureUrl: undefined,
        },
      });

      expect(tokenService.setRefreshTokenCookie).toHaveBeenCalledWith(
        mockResponse,
        'refresh-token',
      );
    });
  });
});
