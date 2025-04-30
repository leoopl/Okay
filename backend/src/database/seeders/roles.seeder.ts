import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../modules/user/entities/role.entity';
import { Permission } from '../../modules/user/entities/permission.entity';
import {
  Permissions,
  RolePermissions,
  parsePermission,
} from '../../core/casl/constants/permission.constants';

/**
 * Seed script to create default roles and permissions
 */
async function bootstrap() {
  const logger = new Logger('RolesSeeder');
  logger.log('Starting roles and permissions seeding...');

  // Create a standalone NestJS application
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    // Get the repositories
    const roleRepository = app.get<Repository<Role>>(getRepositoryToken(Role));
    const permissionRepository = app.get<Repository<Permission>>(
      getRepositoryToken(Permission),
    );

    // Create all permissions from our constants
    logger.log('Creating permissions...');
    const permissionMap = new Map<string, Permission>();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [key, value] of Object.entries(Permissions)) {
      const { resource, action } = parsePermission(value);

      let permission = await permissionRepository.findOne({
        where: { name: value as string },
      });

      if (!permission) {
        permission = permissionRepository.create({
          name: value as string,
          description: `${action} ${resource}`,
          resource,
          action,
        });

        await permissionRepository.save(permission);
        logger.log(`Created permission: ${value}`);
      } else {
        logger.log(`Permission already exists: ${value}`);
      }

      permissionMap.set(value as string, permission);
    }

    // Define roles with their permissions
    const roles = [
      {
        name: 'admin',
        description: 'Administrator with full access',
        isDefault: false,
        isSystem: true,
        permissions: RolePermissions.ADMIN.map((p) => permissionMap.get(p)),
      },
      {
        name: 'patient',
        description: 'Regular patient role with limited access',
        isDefault: true, // Default role for new users
        isSystem: true,
        permissions: RolePermissions.PATIENT.map((p) => permissionMap.get(p)),
      },
    ];

    // Create roles with permissions
    logger.log('Creating roles...');
    for (const roleData of roles) {
      let existingRole = await roleRepository.findOne({
        where: { name: roleData.name },
      });

      if (!existingRole) {
        existingRole = roleRepository.create({
          name: roleData.name,
          description: roleData.description,
          isDefault: roleData.isDefault,
          isSystem: roleData.isSystem,
        });

        await roleRepository.save(existingRole);
        logger.log(`Created role: ${roleData.name}`);
      }

      // Update permissions for role
      existingRole.permissions = roleData.permissions.filter(Boolean); // Filter out any undefined permissions
      await roleRepository.save(existingRole);
      logger.log(
        `Updated permissions for role: ${roleData.name} with ${existingRole.permissions.length} permissions`,
      );
    }

    logger.log('Roles and permissions seeding completed successfully');
  } catch (error) {
    logger.error(`Error during seeding: ${error.message}`, error.stack);
  } finally {
    await app.close();
  }
}

bootstrap();
