/**
 * Permission constants for the application
 * These constants define all possible permissions that can be assigned to roles
 */

// Resource types
export enum Resource {
  USER = 'user',
  JOURNAL = 'journal',
  INVENTORY = 'inventory',
  INVENTORY_RESPONSE = 'inventory-response',
  ALL = 'all',
}

// Actions that can be performed on resources
export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage', // Shorthand for full control
}

// Format: resource:action
export const Permissions = {
  // User permissions
  USER_CREATE: `${Resource.USER}:${PermissionAction.CREATE}`,
  USER_READ: `${Resource.USER}:${PermissionAction.READ}`,
  USER_UPDATE: `${Resource.USER}:${PermissionAction.UPDATE}`,
  USER_DELETE: `${Resource.USER}:${PermissionAction.DELETE}`,
  USER_MANAGE: `${Resource.USER}:${PermissionAction.MANAGE}`,

  // Journal permissions
  JOURNAL_CREATE: `${Resource.JOURNAL}:${PermissionAction.CREATE}`,
  JOURNAL_READ: `${Resource.JOURNAL}:${PermissionAction.READ}`,
  JOURNAL_UPDATE: `${Resource.JOURNAL}:${PermissionAction.UPDATE}`,
  JOURNAL_DELETE: `${Resource.JOURNAL}:${PermissionAction.DELETE}`,
  JOURNAL_MANAGE: `${Resource.JOURNAL}:${PermissionAction.MANAGE}`,

  // Inventory permissions
  INVENTORY_CREATE: `${Resource.INVENTORY}:${PermissionAction.CREATE}`,
  INVENTORY_READ: `${Resource.INVENTORY}:${PermissionAction.READ}`,
  INVENTORY_UPDATE: `${Resource.INVENTORY}:${PermissionAction.UPDATE}`,
  INVENTORY_DELETE: `${Resource.INVENTORY}:${PermissionAction.DELETE}`,
  INVENTORY_MANAGE: `${Resource.INVENTORY}:${PermissionAction.MANAGE}`,

  // Inventory response permissions
  INVENTORY_RESPONSE_CREATE: `${Resource.INVENTORY_RESPONSE}:${PermissionAction.CREATE}`,
  INVENTORY_RESPONSE_READ: `${Resource.INVENTORY_RESPONSE}:${PermissionAction.READ}`,
  INVENTORY_RESPONSE_UPDATE: `${Resource.INVENTORY_RESPONSE}:${PermissionAction.UPDATE}`,
  INVENTORY_RESPONSE_DELETE: `${Resource.INVENTORY_RESPONSE}:${PermissionAction.DELETE}`,
  INVENTORY_RESPONSE_MANAGE: `${Resource.INVENTORY_RESPONSE}:${PermissionAction.MANAGE}`,

  // Special permissions
  MANAGE_ALL: `${Resource.ALL}:${PermissionAction.MANAGE}`,
};

// Role definitions with their default permissions
export const RolePermissions = {
  ADMIN: [Permissions.MANAGE_ALL],

  PATIENT: [
    // User self-management
    Permissions.USER_READ,
    Permissions.USER_UPDATE,

    // Journal management (own entries)
    Permissions.JOURNAL_CREATE,
    Permissions.JOURNAL_READ,
    Permissions.JOURNAL_UPDATE,
    Permissions.JOURNAL_DELETE,

    // Inventory access
    Permissions.INVENTORY_READ,

    // Inventory response
    Permissions.INVENTORY_RESPONSE_CREATE,
    Permissions.INVENTORY_RESPONSE_READ,
  ],
};

// Parse a permission string into resource and action
export function parsePermission(permission: string): {
  resource: string;
  action: string;
} {
  const [resource, action] = permission.split(':');
  return { resource, action };
}
