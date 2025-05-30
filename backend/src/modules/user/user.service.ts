import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeleteResult } from 'typeorm';
import { User, UserStatus } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuditService } from '../../core/audit/audit.service';
import { AuditAction } from '../../core/audit/entities/audit-log.entity';
import { Role } from './entities/role.entity';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { StorageService } from 'src/common/storage/services/storage.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      // Check if user already exists
      const existingUser = await this.findByEmail(createUserDto.email);
      if (existingUser) {
        throw new ConflictException('Email already exists');
      }

      // Create new user
      const user = this.usersRepository.create({
        ...createUserDto,
        status: UserStatus.ACTIVE, // Set as active for direct registrations
      });

      // Assign default role (patient by default)
      const defaultRoleName =
        this.configService.get<string>('DEFAULT_USER_ROLE');
      const defaultRole = await this.rolesRepository.findOne({
        where: { name: defaultRoleName },
      });

      if (!defaultRole) {
        this.logger.error(`Default role '${defaultRoleName}' not found`);
        throw new Error('Required roles not configured');
      }

      user.roles = [defaultRole];

      const savedUser = await this.usersRepository.save(user);

      // Audit user creation
      await this.auditService.logAction({
        userId: savedUser.id,
        action: AuditAction.CREATE,
        resource: 'user',
        resourceId: savedUser.id,
        details: { email: savedUser.email },
      });

      return savedUser;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Error creating user: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(): Promise<User[]> {
    return await this.usersRepository.find({
      relations: ['roles'],
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.usersRepository.findOne({
      where: { email },
      relations: ['roles'],
    });
  }

  async findByAuth0Id(auth0Id: string): Promise<User | null> {
    return await this.usersRepository.findOne({
      where: { auth0Id },
      relations: ['roles'],
    });
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    actorId: string,
  ): Promise<User> {
    const user = await this.findOne(id);

    // Check if user exists
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Update user properties
    const updatedUser = this.usersRepository.merge(user, updateUserDto);

    await this.usersRepository.save(updatedUser);

    // Audit the update
    await this.auditService.logAction({
      userId: actorId,
      action: AuditAction.UPDATE,
      resource: 'user',
      resourceId: id,
      details: {
        fields: Object.keys(updateUserDto).join(', '),
        consentUpdated:
          updateUserDto.consentToDataProcessing !== undefined ||
          updateUserDto.consentToResearch !== undefined ||
          updateUserDto.consentToMarketing !== undefined,
      },
    });

    return this.findOne(id);
  }

  async uploadProfilePicture(
    userId: string,
    file: Express.Multer.File,
    actorId: string,
  ): Promise<User> {
    const user = await this.findOne(userId);

    try {
      // Delete old profile picture if exists
      if (user.profilePictureKey) {
        await this.storageService.deleteFile(user.profilePictureKey);
      }

      // Upload new profile picture
      const uploadResult = await this.storageService.uploadFile(
        file,
        `profile-pictures/${userId}`,
      );

      // IMPORTANT: Only update profile picture fields, don't modify password-related fields
      const updateData = {
        profilePictureKey: uploadResult.key,
        profilePictureUrl: uploadResult.url,
        profilePictureProvider: uploadResult.provider,
        profilePictureMimeType: uploadResult.mimetype,
        profilePictureSize: uploadResult.size,
        profilePictureUpdatedAt: new Date(),
      };

      // Use a more targeted update to avoid triggering password hashing
      await this.usersRepository.update(userId, updateData);

      // Audit the upload
      await this.auditService.logAction({
        userId: actorId,
        action: AuditAction.UPDATE,
        resource: 'user',
        resourceId: userId,
        details: {
          action: 'profile_picture_uploaded',
          fileSize: uploadResult.size,
          mimeType: uploadResult.mimetype,
        },
      });

      // Return fresh user data
      return this.findOne(userId);
    } catch (error) {
      this.logger.error(
        `Failed to upload profile picture: ${error.message}`,
        error.stack,
      );
      throw new Error('Failed to upload profile picture');
    }
  }

  // Also update deleteProfilePicture method
  async deleteProfilePicture(userId: string, actorId: string): Promise<User> {
    const user = await this.findOne(userId);

    if (!user.profilePictureKey) {
      return user; // No profile picture to delete
    }

    try {
      // Delete file from storage
      await this.storageService.deleteFile(user.profilePictureKey);

      // Use targeted update to clear profile picture fields
      const updateData = {
        profilePictureKey: null,
        profilePictureUrl: null,
        profilePictureProvider: null,
        profilePictureMimeType: null,
        profilePictureSize: null,
        profilePictureUpdatedAt: null,
      };

      await this.usersRepository.update(userId, updateData);

      // Audit the deletion
      await this.auditService.logAction({
        userId: actorId,
        action: AuditAction.UPDATE,
        resource: 'user',
        resourceId: userId,
        details: {
          action: 'profile_picture_deleted',
        },
      });

      // Return fresh user data
      return this.findOne(userId);
    } catch (error) {
      this.logger.error(
        `Failed to delete profile picture: ${error.message}`,
        error.stack,
      );
      throw new Error('Failed to delete profile picture');
    }
  }

  /**
   * Validate user credentials for authentication
   */
  async validateUserCredentials(
    email: string,
    password: string,
  ): Promise<User | null> {
    try {
      const user = await this.findByEmail(email);

      if (!user || !user.password) {
        return null;
      }

      // Verify password using argon2
      const validPassword = await argon2.verify(user.password, password);

      if (validPassword) {
        return user;
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Error validating user credentials: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Validate password for a specific user ID
   */
  async validatePassword(userId: string, password: string): Promise<boolean> {
    try {
      const user = await this.findOne(userId);

      if (!user || !user.password) {
        return false;
      }

      // Verify password using argon2
      const validPassword = await argon2.verify(user.password, password);
      return validPassword;
    } catch (error) {
      this.logger.error(
        `Error validating password: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Get user profile with roles and permissions for token generation
   */
  async getUserForTokenGeneration(userId: string): Promise<{
    user: User;
    roles: string[];
    permissions: string[];
  } | null> {
    try {
      const user = await this.findOne(userId);
      if (!user) return null;

      const roles = user.roles?.map((role) => role.name) || [];

      // Collect all permissions from all roles
      const permissionSet = new Set<string>();
      user.roles?.forEach((role) => {
        role.permissions?.forEach((permission) => {
          permissionSet.add(permission.name);
        });
      });

      return {
        user,
        roles,
        permissions: Array.from(permissionSet),
      };
    } catch (error) {
      this.logger.error(
        `Error getting user for token generation: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  async updateConsent(id: string, actorId: string): Promise<User> {
    const user = await this.findOne(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Update consent fields
    user.updateConsent();

    await this.usersRepository.save(user);

    // Audit consent update specifically
    await this.auditService.logAction({
      userId: actorId,
      action: AuditAction.CONSENT_UPDATED,
      resource: 'user',
      resourceId: id,
      details: {
        consent: {
          dataProcessing: user.consentToDataProcessing,
          research: user.consentToResearch,
          marketing: user.consentToMarketing,
        },
      },
    });

    return this.findOne(id);
  }

  async remove(id: string, actorId: string): Promise<DeleteResult> {
    const user = await this.findOne(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Audit the deletion
    await this.auditService.logAction({
      userId: actorId,
      action: AuditAction.DELETE,
      resource: 'user',
      resourceId: id,
      details: { email: user.email },
    });

    return await this.usersRepository.delete(id);
  }

  // Find or create a user from Auth0 authentication
  async findOrCreateAuth0User(authData: {
    auth0Id: string;
    email: string;
    name: string;
  }): Promise<User> {
    try {
      // First try to find by Auth0 ID
      let user = await this.findByAuth0Id(authData.auth0Id);

      // If not found by Auth0 ID, try by email (for migrated users)
      if (!user) {
        user = await this.findByEmail(authData.email);

        // If found by email but no Auth0 ID, update the user with Auth0 ID
        if (user) {
          user.auth0Id = authData.auth0Id;
          await this.usersRepository.save(user);

          // Audit the link
          await this.auditService.logAction({
            userId: user.id,
            action: 'ACCOUNT_LINKED' as any,
            resource: 'user',
            resourceId: user.id,
            details: {
              provider: 'auth0',
              auth0Id: authData.auth0Id,
            },
          });

          return user;
        }
      }

      // If no user found, create a new one
      if (!user) {
        // Find the default role (usually patient)
        const defaultRoleName = this.configService.get<string>(
          'DEFAULT_ROLE',
          'patient',
        );
        const defaultRole = await this.rolesRepository.findOne({
          where: { name: defaultRoleName },
        });

        if (!defaultRole) {
          this.logger.error(`Default role '${defaultRoleName}' not found`);
          throw new Error('Required roles not configured');
        }

        const newUser = this.usersRepository.create({
          email: authData.email,
          name: authData.name,
          auth0Id: authData.auth0Id,
          // Set a default birthdate (can be updated later)
          birthdate: new Date('2000-01-01'),
          roles: [defaultRole],
          status: UserStatus.ACTIVE,
          // Set initial consent values
          consentToDataProcessing: false,
          consentToResearch: false,
          consentToMarketing: false,
        });

        user = await this.usersRepository.save(newUser);

        // Audit the creation
        await this.auditService.logAction({
          userId: user.id,
          action: AuditAction.CREATE,
          resource: 'user',
          resourceId: user.id,
          details: {
            provider: 'auth0',
            auth0Id: authData.auth0Id,
            email: authData.email,
          },
        });
      }

      return user;
    } catch (error) {
      this.logger.error(
        `Error finding/creating Auth0 user: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Update user password securely
   */
  async updatePassword(userId: string, newPassword: string): Promise<User> {
    // Find user
    const user = await this.findOne(userId);

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Use the safe setPassword method instead of directly setting password
    user.setPassword(newPassword);

    // Save user
    const updatedUser = await this.usersRepository.save(user);

    // Audit password update
    await this.auditService.logAction({
      userId: userId,
      action: AuditAction.PASSWORD_UPDATED,
      resource: 'user',
      resourceId: userId,
      details: {
        // Don't log the actual password!
        timestamp: new Date(),
      },
    });

    return updatedUser;
  }

  async addRole(
    userId: string,
    roleName: string,
    actorId: string,
  ): Promise<User> {
    const user = await this.findOne(userId);
    const role = await this.rolesRepository.findOne({
      where: { name: roleName },
    });

    if (!role) {
      throw new NotFoundException(`Role ${roleName} not found`);
    }

    // Check if user already has this role
    if (user.roles.some((r) => r.id === role.id)) {
      return user; // User already has this role
    }

    // Add the role
    user.roles.push(role);
    await this.usersRepository.save(user);

    // Audit role assignment
    await this.auditService.logAction({
      userId: actorId,
      action: 'ROLE_ASSIGNED' as any,
      resource: 'user',
      resourceId: userId,
      details: { roleName },
    });

    return this.findOne(userId);
  }

  async removeRole(
    userId: string,
    roleName: string,
    actorId: string,
  ): Promise<User> {
    const user = await this.findOne(userId);

    // Find the role index
    const roleIndex = user.roles.findIndex((r) => r.name === roleName);

    if (roleIndex === -1) {
      return user; // User doesn't have this role
    }

    // Remove the role
    user.roles.splice(roleIndex, 1);
    await this.usersRepository.save(user);

    // Audit role removal
    await this.auditService.logAction({
      userId: actorId,
      action: 'ROLE_REMOVED' as any,
      resource: 'user',
      resourceId: userId,
      details: { roleName },
    });

    return this.findOne(userId);
  }

  async setUserRole(
    userId: string,
    roleName: string,
    actorId: string,
  ): Promise<User> {
    // This method replaces all existing roles with just the specified role
    const user = await this.findOne(userId);
    const role = await this.rolesRepository.findOne({
      where: { name: roleName },
    });

    if (!role) {
      throw new NotFoundException(`Role ${roleName} not found`);
    }

    // Set the role as the only role for this user
    user.roles = [role];
    await this.usersRepository.save(user);

    // Audit role assignment
    await this.auditService.logAction({
      userId: actorId,
      action: 'ROLE_ASSIGNED' as any,
      resource: 'user',
      resourceId: userId,
      details: { roleName, isExclusive: true },
    });

    return this.findOne(userId);
  }

  async hasRole(userId: string, roleName: string): Promise<boolean> {
    const user = await this.findOne(userId);
    return user.roles.some((role) => role.name === roleName);
  }

  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const user = await this.findOne(userId);

    // Check each role for the permission
    for (const role of user.roles) {
      for (const perm of role.permissions) {
        if (perm.name === permission) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Validate user credentials
   */
  async validateCredentials(
    email: string,
    password: string,
  ): Promise<User | null> {
    try {
      const user = await this.findByEmail(email);

      if (!user || !user.password) {
        return null;
      }

      // Verify password using argon2
      const validPassword = await argon2.verify(user.password, password);

      if (validPassword) {
        return user;
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Error validating credentials: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  async seedRoles(): Promise<void> {
    // This is now handled by the roles.seeder.ts file
    // We keep this method for compatibility, but it's a no-op
    this.logger.log('Role seeding is now handled by the dedicated seeder');
  }

  /**
   * Find user by Google ID
   */
  async findByGoogleId(googleId: string): Promise<User | null> {
    return await this.usersRepository.findOne({
      where: { googleId },
      relations: ['roles'],
    });
  }

  /**
   * Create a new user from Google OAuth data
   */
  async createGoogleUser(googleUserData: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
    picture?: string;
    emailVerified: boolean;
  }): Promise<User> {
    try {
      // Check if user already exists by email
      const existingUser = await this.findByEmail(googleUserData.email);
      if (existingUser) {
        throw new ConflictException('Email already exists');
      }

      // Create new user from Google data
      const user = this.usersRepository.create({
        email: googleUserData.email,
        name: googleUserData.firstName,
        surname: googleUserData.lastName,
        googleId: googleUserData.googleId,
        status: googleUserData.emailVerified
          ? UserStatus.ACTIVE
          : UserStatus.PENDING_VERIFICATION,
        profilePictureUrl: googleUserData.picture,
        profilePictureProvider: googleUserData.picture ? 'google' : null,
        profilePictureUpdatedAt: googleUserData.picture ? new Date() : null,
        // Set initial consent values - user will need to explicitly consent
        consentToDataProcessing: false,
        consentToResearch: false,
        consentToMarketing: false,
      });

      // Assign default role
      const defaultRoleName = this.configService.get<string>(
        'DEFAULT_USER_ROLE',
        'patient',
      );
      const defaultRole = await this.rolesRepository.findOne({
        where: { name: defaultRoleName },
      });

      if (!defaultRole) {
        this.logger.error(`Default role '${defaultRoleName}' not found`);
        throw new Error('Required roles not configured');
      }

      user.roles = [defaultRole];

      const savedUser = await this.usersRepository.save(user);

      // Audit user creation
      await this.auditService.logAction({
        userId: savedUser.id,
        action: AuditAction.CREATE,
        resource: 'user',
        resourceId: savedUser.id,
        details: {
          email: savedUser.email,
          provider: 'google',
          googleId: googleUserData.googleId,
        },
      });

      return savedUser;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(
        `Error creating Google user: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Update user with partial data (for Google linking)
   */
  async updateUser(id: string, updateData: Partial<User>): Promise<User> {
    const user = await this.findOne(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Use a targeted update to avoid triggering password hashing
    await this.usersRepository.update(id, updateData);

    return this.findOne(id);
  }

  /**
   * Link Google account to existing user
   */
  async linkGoogleAccount(
    userId: string,
    googleId: string,
    googleData: {
      picture?: string;
      accessToken?: string;
      refreshToken?: string;
      tokenExpiresAt?: Date;
    },
    actorId: string,
  ): Promise<User> {
    const user = await this.findOne(userId);

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Check if Google ID is already linked to another user
    const existingGoogleUser = await this.findByGoogleId(googleId);
    if (existingGoogleUser && existingGoogleUser.id !== userId) {
      throw new ConflictException(
        'Google account is already linked to another user',
      );
    }

    const updateData: Partial<User> = {
      googleId,
      googleAccessToken: googleData.accessToken,
      googleRefreshToken: googleData.refreshToken,
      googleTokenExpiresAt: googleData.tokenExpiresAt,
    };

    // Update profile picture if user doesn't have one and Google provides one
    if (!user.profilePictureUrl && googleData.picture) {
      updateData.profilePictureUrl = googleData.picture;
      updateData.profilePictureProvider = 'google';
      updateData.profilePictureUpdatedAt = new Date();
    }

    await this.usersRepository.update(userId, updateData);

    // Audit the linking
    await this.auditService.logAction({
      userId: actorId,
      action: AuditAction.UPDATE,
      resource: 'user',
      resourceId: userId,
      details: {
        action: 'google_account_linked',
        googleId,
      },
    });

    return this.findOne(userId);
  }

  /**
   * Unlink Google account from user
   */
  async unlinkGoogleAccount(userId: string, actorId: string): Promise<User> {
    const user = await this.findOne(userId);

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (!user.googleId) {
      throw new ConflictException('User does not have a Google account linked');
    }

    // Ensure user has password set before unlinking OAuth
    if (!user.password) {
      throw new ConflictException(
        'Cannot unlink Google account: user must set a password first',
      );
    }

    const updateData: Partial<User> = {
      googleId: null,
      googleAccessToken: null,
      googleRefreshToken: null,
      googleTokenExpiresAt: null,
    };

    // Remove Google profile picture if it was the source
    if (user.profilePictureProvider === 'google') {
      updateData.profilePictureUrl = null;
      updateData.profilePictureProvider = null;
      updateData.profilePictureUpdatedAt = null;
    }

    await this.usersRepository.update(userId, updateData);

    // Audit the unlinking
    await this.auditService.logAction({
      userId: actorId,
      action: AuditAction.UPDATE,
      resource: 'user',
      resourceId: userId,
      details: {
        action: 'google_account_unlinked',
      },
    });

    return this.findOne(userId);
  }

  /**
   * Check if user can unlink their OAuth account
   */
  async canUnlinkOAuthAccount(userId: string): Promise<boolean> {
    const user = await this.findOne(userId);

    if (!user) {
      return false;
    }

    // User can unlink OAuth if they have a password set
    return !!user.password;
  }
}
