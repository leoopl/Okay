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

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    private readonly auditService: AuditService,
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

      // Find the patient role and assign it
      const patientRole = await this.rolesRepository.findOne({
        where: { name: 'patient' },
      });

      if (!patientRole) {
        this.logger.error('Patient role not found');
        throw new Error('Required roles not configured');
      }

      user.roles = [patientRole];

      // Set consent values explicitly
      user.updateConsent({
        dataProcessing: createUserDto.consentToDataProcessing || false,
        research: createUserDto.consentToResearch || false,
        marketing: createUserDto.consentToMarketing || false,
      });

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

    // Handle consent fields separately to track consent updates
    if (
      updateUserDto.consentToDataProcessing !== undefined ||
      updateUserDto.consentToResearch !== undefined ||
      updateUserDto.consentToMarketing !== undefined
    ) {
      updatedUser.updateConsent({
        dataProcessing: updateUserDto.consentToDataProcessing,
        research: updateUserDto.consentToResearch,
        marketing: updateUserDto.consentToMarketing,
      });
    }

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

  async updateConsent(
    id: string,
    consentData: {
      dataProcessing?: boolean;
      research?: boolean;
      marketing?: boolean;
    },
    actorId: string,
  ): Promise<User> {
    const user = await this.findOne(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Update consent fields
    user.updateConsent({
      dataProcessing: consentData.dataProcessing,
      research: consentData.research,
      marketing: consentData.marketing,
    });

    await this.usersRepository.save(user);

    // Audit consent update specifically
    await this.auditService.logAction({
      userId: actorId,
      action: AuditAction.CONSENT_UPDATED,
      resource: 'user',
      resourceId: id,
      details: {
        consent: {
          dataProcessing: consentData.dataProcessing,
          research: consentData.research,
          marketing: consentData.marketing,
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
        // Find the patient role
        const patientRole = await this.rolesRepository.findOne({
          where: { name: 'patient' },
        });

        if (!patientRole) {
          this.logger.error('Patient role not found');
          throw new Error('Required roles not configured');
        }

        const newUser = this.usersRepository.create({
          email: authData.email,
          name: authData.name,
          auth0Id: authData.auth0Id,
          // Set a default birthdate (can be updated later)
          birthdate: new Date('2000-01-01'),
          roles: [patientRole],
          status: UserStatus.ACTIVE,
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

  async seedRoles(): Promise<void> {
    // Check if roles already exist
    const patientRoleExists = await this.rolesRepository.findOne({
      where: { name: 'patient' },
    });

    const adminRoleExists = await this.rolesRepository.findOne({
      where: { name: 'admin' },
    });

    // Create roles if they don't exist
    if (!patientRoleExists) {
      await this.rolesRepository.save({
        name: 'patient',
        description: 'Regular user role with limited access',
      });
    }

    if (!adminRoleExists) {
      await this.rolesRepository.save({
        name: 'admin',
        description: 'Administrator role with full access',
      });
    }
  }
}
