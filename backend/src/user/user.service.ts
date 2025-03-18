import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeleteResult } from 'typeorm';
import { User } from './entities/user.entity';
import { IUser } from './interfaces/user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { EncryptionService } from 'src/common/encryption/encryption.service';
import { AuditService } from 'src/audit/audit.service';
import { AuditAction } from 'src/audit/entities/audit-log.entity';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly encryptionService: EncryptionService,
    private readonly auditService: AuditService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<IUser> {
    const user = this.usersRepository.create(createUserDto);
    await this.usersRepository.save(user);

    // Audit the creation
    await this.auditService.logAction({
      userId: user.id,
      action: AuditAction.CREATE,
      resource: 'user',
      resourceId: user.id,
      details: { email: user.email },
    });

    return user;
  }

  async findAll(): Promise<Omit<IUser, 'password'>[]> {
    const users = await this.usersRepository.find();
    return users.map((user) => this.sanitizeUser(user));
  }

  async findOne(id: string): Promise<Omit<IUser, 'password'>> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return this.sanitizeUser(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.usersRepository.findOne({ where: { email } });
  }

  async findByAuth0Id(auth0Id: string): Promise<User | null> {
    return await this.usersRepository.findOne({ where: { auth0Id } });
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    actorId?: string, // The ID of the user performing the update
  ): Promise<Omit<IUser, 'password'>> {
    await this.usersRepository.update(id, updateUserDto);
    const updatedUser = await this.findOne(id);

    // Audit the update
    await this.auditService.logAction({
      userId: actorId || id,
      action: AuditAction.UPDATE,
      resource: 'user',
      resourceId: id,
      details: {
        fields: Object.keys(updateUserDto).join(', '),
      },
    });

    return updatedUser;
  }

  async remove(id: string, actorId: string): Promise<DeleteResult> {
    // Audit the deletion
    await this.auditService.logAction({
      userId: actorId,
      action: AuditAction.DELETE,
      resource: 'user',
      resourceId: id,
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
              provicer: 'auth0',
              auth0Id: authData.auth0Id,
            },
          });

          return user;
        }
      }

      // If no user found, create a new one
      if (!user) {
        const newUser = this.usersRepository.create({
          email: authData.email,
          name: authData.name,
          auth0Id: authData.auth0Id,
          // Set a default birthdate (required field) - user should update this
          birthdate: new Date(),
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

  private sanitizeUser(user: User): Omit<IUser, 'password'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }
}
