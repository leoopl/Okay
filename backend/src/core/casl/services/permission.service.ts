import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../../../modules/user/entities/permission.entity';
import { Role } from '../../../modules/user/entities/role.entity';
import {
  Permissions,
  parsePermission,
  RolePermissions,
} from '../constants/permission.constants';
import { AuditService } from '../../audit/audit.service';

/**
 * Service for managing permissions and roles
 * Provides methods for creating, assigning, and checking permissions
 */
@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Find a permission by its name
   */
  async findPermissionByName(name: string): Promise<Permission> {
    return this.permissionRepository.findOne({ where: { name } });
  }

  /**
   * Create a new permission
   */
  async createPermission(
    name: string,
    description?: string,
  ): Promise<Permission> {
    const { resource, action } = parsePermission(name);

    const existingPermission = await this.findPermissionByName(name);
    if (existingPermission) {
      return existingPermission;
    }

    const permission = this.permissionRepository.create({
      name,
      description: description || `${action} ${resource}`,
      resource,
      action,
    });

    return this.permissionRepository.save(permission);
  }

  /**
   * Find a role by its name
   */
  async findRoleByName(name: string): Promise<Role> {
    return this.roleRepository.findOne({
      where: { name },
      relations: ['permissions'],
    });
  }

  /**
   * Create a new role with the given permissions
   */
  async createRole(
    name: string,
    description: string,
    isDefault: boolean = false,
    isSystem: boolean = false,
    permissionNames: string[] = [],
  ): Promise<Role> {
    // Check if role already exists
    const existingRole = await this.findRoleByName(name);
    if (existingRole) {
      return existingRole;
    }

    // Create the role
    const role = this.roleRepository.create({
      name,
      description,
      isDefault,
      isSystem,
    });

    // Find or create permissions and assign them to the role
    if (permissionNames.length > 0) {
      const permissions: Permission[] = [];

      for (const permName of permissionNames) {
        let permission = await this.findPermissionByName(permName);

        if (!permission) {
          permission = await this.createPermission(permName);
        }

        permissions.push(permission);
      }

      role.permissions = permissions;
    }

    return this.roleRepository.save(role);
  }

  /**
   * Add permissions to a role
   */
  async addPermissionsToRole(
    roleName: string,
    permissionNames: string[],
    actorId: string,
  ): Promise<Role> {
    const role = await this.findRoleByName(roleName);

    if (!role) {
      throw new Error(`Role ${roleName} not found`);
    }

    const currentPermissions = role.permissions || [];
    const currentPermissionNames = currentPermissions.map((p) => p.name);

    for (const permName of permissionNames) {
      // Skip if role already has this permission
      if (currentPermissionNames.includes(permName)) {
        continue;
      }

      let permission = await this.findPermissionByName(permName);

      if (!permission) {
        permission = await this.createPermission(permName);
      }

      currentPermissions.push(permission);
    }

    role.permissions = currentPermissions;
    const updatedRole = await this.roleRepository.save(role);

    // Audit the permission change
    await this.auditService.logAction({
      userId: actorId,
      action: 'ROLE_PERMISSIONS_UPDATED' as any,
      resource: 'role',
      resourceId: role.id,
      details: {
        roleName,
        addedPermissions: permissionNames,
      },
    });

    return updatedRole;
  }

  /**
   * Remove permissions from a role
   */
  async removePermissionsFromRole(
    roleName: string,
    permissionNames: string[],
    actorId: string,
  ): Promise<Role> {
    const role = await this.findRoleByName(roleName);

    if (!role) {
      throw new Error(`Role ${roleName} not found`);
    }

    // Filter out permissions that should be removed
    role.permissions = role.permissions.filter(
      (permission) => !permissionNames.includes(permission.name),
    );

    const updatedRole = await this.roleRepository.save(role);

    // Audit the permission change
    await this.auditService.logAction({
      userId: actorId,
      action: 'ROLE_PERMISSIONS_UPDATED' as any,
      resource: 'role',
      resourceId: role.id,
      details: {
        roleName,
        removedPermissions: permissionNames,
      },
    });

    return updatedRole;
  }

  /**
   * Set the permissions for a role (replaces all existing permissions)
   */
  async setRolePermissions(
    roleName: string,
    permissionNames: string[],
    actorId: string,
  ): Promise<Role> {
    const role = await this.findRoleByName(roleName);

    if (!role) {
      throw new Error(`Role ${roleName} not found`);
    }

    const permissions: Permission[] = [];

    for (const permName of permissionNames) {
      let permission = await this.findPermissionByName(permName);

      if (!permission) {
        permission = await this.createPermission(permName);
      }

      permissions.push(permission);
    }

    // Get previous permissions for audit
    const previousPermissions = role.permissions.map((p) => p.name);

    role.permissions = permissions;
    const updatedRole = await this.roleRepository.save(role);

    // Audit the permission change
    await this.auditService.logAction({
      userId: actorId,
      action: 'ROLE_PERMISSIONS_UPDATED' as any,
      resource: 'role',
      resourceId: role.id,
      details: {
        roleName,
        previousPermissions,
        newPermissions: permissionNames,
      },
    });

    return updatedRole;
  }

  /**
   * Get all roles
   */
  async getAllRoles(): Promise<Role[]> {
    return this.roleRepository.find({
      relations: ['permissions'],
    });
  }

  /**
   * Get all permissions
   */
  async getAllPermissions(): Promise<Permission[]> {
    return this.permissionRepository.find();
  }

  /**
   * Initialize the basic permission and role structure
   * This should be called during application bootstrap
   */
  async initializePermissionsAndRoles(): Promise<void> {
    try {
      this.logger.log('Initializing permissions and roles');

      // Create all permissions from the constants
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for (const [key, value] of Object.entries(Permissions)) {
        await this.createPermission(value);
      }

      // Create the standard roles
      await this.createRole(
        'admin',
        'Administrator with full access',
        false,
        true,
        RolePermissions.ADMIN,
      );

      await this.createRole(
        'patient',
        'Regular patient role with limited access',
        true,
        true,
        RolePermissions.PATIENT,
      );

      this.logger.log('Finished initializing permissions and roles');
    } catch (error) {
      this.logger.error(
        `Error initializing permissions and roles: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Check if a role has a specific permission
   */
  async roleHasPermission(
    roleName: string,
    permissionName: string,
  ): Promise<boolean> {
    const role = await this.findRoleByName(roleName);

    if (!role) {
      return false;
    }

    return role.permissions.some((p) => p.name === permissionName);
  }
}
