import { Injectable, Logger } from '@nestjs/common';
import { AbilityBuilder } from '@casl/ability';
import { User } from '../../modules/user/entities/user.entity';
import { JournalEntry } from '../../modules/journal/entities/journal.entity';
import { Inventory } from '../../modules/inventory/entities/inventory.entity';
import { InventoryResponse } from '../../modules/inventory/entities/inventory-response.entity';
import { Action, AppAbility, ABILITY_FACTORY } from './types/ability.type';
import { parsePermission } from './constants/permission.constants';

@Injectable()
export class CaslAbilityFactory {
  private readonly logger = new Logger(CaslAbilityFactory.name);

  createForUser(user: User): AppAbility {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { can, cannot, build } = new AbilityBuilder(ABILITY_FACTORY());

    if (!user.roles || user.roles.length === 0) {
      this.logger.warn(`User ${user.id} has no roles assigned`);
      return build();
    }

    // Process all permissions from all roles
    for (const role of user.roles) {
      if (!role.permissions) {
        continue;
      }

      for (const permission of role.permissions) {
        try {
          const { resource, action } = parsePermission(permission.name);

          // Handle wildcard permissions
          if (resource === 'all' && action === 'manage') {
            can(Action.Manage, 'all');
            continue;
          }

          // Convert string action to enum Action
          const actionEnum = this.mapActionStringToEnum(action);

          // Apply permissions based on resource type
          this.applyResourceSpecificPermission(can, actionEnum, resource, user);
        } catch (error) {
          this.logger.error(
            `Error processing permission ${permission.name}: ${error.message}`,
            error.stack,
          );
        }
      }
    }

    return build();
  }

  private mapActionStringToEnum(action: string): Action {
    switch (action.toLowerCase()) {
      case 'create':
        return Action.Create;
      case 'read':
        return Action.Read;
      case 'update':
        return Action.Update;
      case 'delete':
        return Action.Delete;
      case 'manage':
        return Action.Manage;
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private applyResourceSpecificPermission(
    can: AbilityBuilder<AppAbility>['can'],
    action: Action,
    resource: string,
    user: User,
  ) {
    switch (resource) {
      case 'user':
        if (action === Action.Manage) {
          can(Action.Manage, User);
        } else if (action === Action.Read || action === Action.Update) {
          // Users can always read/update their own profile
          can(action, User, { id: user.id });
        } else {
          can(action, User);
        }
        break;

      case 'journal':
        if (action === Action.Manage) {
          can(Action.Manage, JournalEntry);
        } else {
          // Regular users can only manage their own journal entries
          can(action, JournalEntry, { userId: user.id });
        }
        break;

      case 'inventory':
        if (action === Action.Manage) {
          can(Action.Manage, Inventory);
        } else {
          can(action, Inventory);
        }
        break;

      case 'inventory-response':
        if (action === Action.Manage) {
          can(Action.Manage, InventoryResponse);
        } else {
          // Regular users can only manage their own inventory responses
          can(action, InventoryResponse, { userId: user.id });
        }
        break;

      default:
        this.logger.warn(`Unknown resource type: ${resource}`);
        break;
    }
  }
}
