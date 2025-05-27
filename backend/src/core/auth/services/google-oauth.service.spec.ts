import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GoogleOAuthService } from './google-oauth.service';
import { UserService } from '../../../modules/user/user.service';
import { TokenService } from './token.service';
import { AuditService } from '../../audit/audit.service';
import { User, UserStatus } from '../../../modules/user/entities/user.entity';
import { GoogleUser } from '../strategies/google-oauth.strategy';

describe('GoogleOAuthService', () => {
  let service: GoogleOAuthService;
  let userService: jest.Mocked<UserService>;
  let tokenService: jest.Mocked<TokenService>;
  let auditService: jest.Mocked<AuditService>;

  const mockGoogleUser: GoogleUser = {
    googleId: 'google123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    picture: 'https://example.com/picture.jpg',
    emailVerified: true,
  };

  const mockUser: User = {
    id: 'user123',
    email: 'test@example.com',
    name: 'John',
    surname: 'Doe',
    googleId: 'google123',
    status: UserStatus.ACTIVE,
    roles: [],
  } as User;

  beforeEach(async () => {
    const mockUserService = {
      findByGoogleId: jest.fn(),
      findByEmail: jest.fn(),
      createGoogleUser: jest.fn(),
      updateUser: jest.fn(),
    };

    const mockTokenService = {
      generateAccessToken: jest.fn(),
      generateRefreshToken: jest.fn(),
    };

    const mockAuditService = {
      logAction: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleOAuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: TokenService, useValue: mockTokenService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<GoogleOAuthService>(GoogleOAuthService);
    userService = module.get(UserService);
    tokenService = module.get(TokenService);
    auditService = module.get(AuditService);
  });

  describe('validateGoogleUser', () => {
    it('should create new user when Google user not found', async () => {
      // Arrange
      userService.findByGoogleId.mockResolvedValue(null);
      userService.findByEmail.mockResolvedValue(null);
      userService.createGoogleUser.mockResolvedValue(mockUser);

      // Act
      const result = await service.validateGoogleUser(
        mockGoogleUser,
        'access_token',
        'refresh_token',
      );

      // Assert
      expect(result).toBe(mockUser);
      expect(userService.findByGoogleId).toHaveBeenCalledWith('google123');
      expect(userService.createGoogleUser).toHaveBeenCalledWith({
        googleId: 'google123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        picture: 'https://example.com/picture.jpg',
        emailVerified: true,
      });
      expect(auditService.logAction).toHaveBeenCalled();
    });

    it('should return existing user when found by Google ID', async () => {
      // Arrange
      userService.findByGoogleId.mockResolvedValue(mockUser);

      // Act
      const result = await service.validateGoogleUser(
        mockGoogleUser,
        'access_token',
      );

      // Assert
      expect(result).toBe(mockUser);
      expect(userService.findByGoogleId).toHaveBeenCalledWith('google123');
      expect(userService.createGoogleUser).not.toHaveBeenCalled();
    });

    it('should link Google account to existing user found by email', async () => {
      // Arrange
      const createMockUser = (overrides: Partial<User> = {}): User => {
        const mockUser = new User();
        Object.assign(mockUser, {
          id: 'user123',
          email: 'test@example.com',
          name: 'John',
          surname: 'Doe',
          password: 'hashedPassword',
          googleId: null,
          auth0Id: null,
          gender: null,
          birthdate: new Date('1990-01-01'),
          status: UserStatus.ACTIVE,
          consentToDataProcessing: true,
          consentToResearch: false,
          consentToMarketing: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          roles: [],
          journalEntries: [],
          inventoryResponses: [],
          medications: [],
          profilePictureUrl: null,
          profilePictureKey: null,
          profilePictureProvider: null,
          profilePictureMimeType: null,
          profilePictureSize: null,
          profilePictureUpdatedAt: null,
          consentUpdatedAt: null,
          googleAccessToken: null,
          googleRefreshToken: null,
          googleTokenExpiresAt: null,
          setPassword: jest.fn(),
          updateConsent: jest.fn(),
          hasOAuthProvider: jest.fn().mockReturnValue(false),
          isOAuthOnlyUser: jest.fn().mockReturnValue(false),
          getPrimaryOAuthProvider: jest.fn().mockReturnValue(null),
          hashPasswordOnInsert: jest.fn(),
          hashPasswordOnUpdate: jest.fn(),
          ...overrides,
        });
        return mockUser;
      };
      const existingUser = createMockUser({ googleId: null });
      userService.findByGoogleId.mockResolvedValue(null);
      userService.findByEmail.mockResolvedValue(existingUser);
      userService.updateUser.mockResolvedValue(mockUser);

      // Act
      const result = await service.validateGoogleUser(
        mockGoogleUser,
        'access_token',
      );

      // Assert
      expect(result).toBe(mockUser);
      expect(userService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(userService.updateUser).toHaveBeenCalled();
    });

    it('should throw error when Google user data is invalid', async () => {
      // Arrange
      const invalidGoogleUser = { ...mockGoogleUser, googleId: '' };

      // Act & Assert
      await expect(
        service.validateGoogleUser(invalidGoogleUser, 'access_token'),
      ).rejects.toThrow('Google ID is required');
    });
  });

  describe('generateAuthTokens', () => {
    it('should generate access and refresh tokens', async () => {
      // Arrange
      const expectedAccessToken = 'access_token_123';
      const expectedRefreshToken = 'refresh_token_123';

      tokenService.generateAccessToken.mockResolvedValue(expectedAccessToken);
      tokenService.generateRefreshToken.mockResolvedValue(expectedRefreshToken);

      // Act
      const result = await service.generateAuthTokens(
        mockUser,
        '192.168.1.1',
        'Mozilla/5.0',
      );

      // Assert
      expect(result).toEqual({
        accessToken: expectedAccessToken,
        refreshToken: expectedRefreshToken,
      });
      expect(tokenService.generateAccessToken).toHaveBeenCalledWith(mockUser);
      expect(tokenService.generateRefreshToken).toHaveBeenCalledWith(
        'user123',
        '192.168.1.1',
        'Mozilla/5.0',
      );
    });
  });
});
