// src/database/seeders/roles.seeder.ts
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../modules/user/entities/role.entity';
import { Permission } from '../../modules/user/entities/permission.entity';

/**
 * Seed script to create default roles and permissions
 * Run with: yarn seed:roles
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

    // Define permissions
    const permissions = [
      // User permissions
      {
        name: 'user:read',
        description: 'Read user data',
        resource: 'user',
        action: 'read',
      },
      {
        name: 'user:create',
        description: 'Create users',
        resource: 'user',
        action: 'create',
      },
      {
        name: 'user:update',
        description: 'Update user data',
        resource: 'user',
        action: 'update',
      },
      {
        name: 'user:delete',
        description: 'Delete users',
        resource: 'user',
        action: 'delete',
      },

      // Journal permissions
      {
        name: 'journal:read',
        description: 'Read journal entries',
        resource: 'journal',
        action: 'read',
      },
      {
        name: 'journal:create',
        description: 'Create journal entries',
        resource: 'journal',
        action: 'create',
      },
      {
        name: 'journal:update',
        description: 'Update journal entries',
        resource: 'journal',
        action: 'update',
      },
      {
        name: 'journal:delete',
        description: 'Delete journal entries',
        resource: 'journal',
        action: 'delete',
      },

      // Inventory permissions
      {
        name: 'inventory:read',
        description: 'Read inventories',
        resource: 'inventory',
        action: 'read',
      },
      {
        name: 'inventory:create',
        description: 'Create inventories',
        resource: 'inventory',
        action: 'create',
      },
      {
        name: 'inventory:update',
        description: 'Update inventories',
        resource: 'inventory',
        action: 'update',
      },
      {
        name: 'inventory:delete',
        description: 'Delete inventories',
        resource: 'inventory',
        action: 'delete',
      },

      // Inventory response permissions
      {
        name: 'inventory-response:read',
        description: 'Read inventory responses',
        resource: 'inventory-response',
        action: 'read',
      },
      {
        name: 'inventory-response:create',
        description: 'Submit inventory responses',
        resource: 'inventory-response',
        action: 'create',
      },
    ];

    // Create permissions
    logger.log('Creating permissions...');
    for (const permission of permissions) {
      const existingPermission = await permissionRepository.findOne({
        where: { name: permission.name },
      });

      if (!existingPermission) {
        await permissionRepository.save(permission);
        logger.log(`Created permission: ${permission.name}`);
      } else {
        logger.log(`Permission already exists: ${permission.name}`);
      }
    }

    // Get all permissions from database
    const allPermissions = await permissionRepository.find();

    // Define roles with their permissions
    const roles = [
      {
        name: 'admin',
        description: 'Administrator with full access',
        permissions: allPermissions, // All permissions
      },
      {
        name: 'patient',
        description: 'Regular user role',
        permissions: allPermissions.filter(
          (p) =>
            p.name === 'user:read' ||
            p.name === 'user:update' ||
            p.name.startsWith('journal:') ||
            p.name === 'inventory:read' ||
            p.name === 'inventory-response:create' ||
            p.name === 'inventory-response:read',
        ),
      },
    ];

    // Create roles with permissions
    logger.log('Creating roles...');
    for (const roleData of roles) {
      const existingRole = await roleRepository.findOne({
        where: { name: roleData.name },
      });

      if (!existingRole) {
        await roleRepository.save(roleData);
        logger.log(
          `Created role: ${roleData.name} with ${roleData.permissions.length} permissions`,
        );
      } else {
        // Update permissions for existing role
        existingRole.permissions = roleData.permissions;
        await roleRepository.save(existingRole);
        logger.log(`Updated permissions for role: ${roleData.name}`);
      }
    }

    logger.log('Roles and permissions seeding completed successfully');
  } catch (error) {
    logger.error(`Error during seeding: ${error.message}`, error.stack);
  } finally {
    await app.close();
  }
}

bootstrap();
