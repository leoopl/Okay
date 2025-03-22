import { Injectable, Logger } from '@nestjs/common';
import { IPolicyHandler } from '../interfaces/policy-handler.interface';
import { AppAbility, Action } from '../types/ability.type';
import { User } from '../../../modules/user/entities/user.entity';
import { JournalEntry } from '../../../modules/journal/entities/journal.entity';
import { Inventory } from '../../../modules/inventory/entities/inventory.entity';
import { InventoryResponse } from '../../../modules/inventory/entities/inventory-response.entity';

/**
 * Factory for creating policy handlers
 * This provides a centralized way to create policy handlers for different resources
 */
@Injectable()
export class PolicyHandlerFactory {
  private readonly logger = new Logger(PolicyHandlerFactory.name);

  // User policy handlers
  createUserPolicyHandler(
    action: Action,
    targetUserId: string,
  ): IPolicyHandler {
    return {
      handle: (ability: AppAbility): boolean => {
        const userSubject = { id: targetUserId } as User;
        return ability.can(action, userSubject);
      },
    };
  }

  // Journal policy handlers
  createJournalEntryPolicyHandler(
    action: Action,
    journalEntry?: JournalEntry,
  ): IPolicyHandler {
    return {
      handle: (ability: AppAbility): boolean => {
        if (journalEntry) {
          return ability.can(action, journalEntry);
        }
        // If no specific journal entry, check general permission
        return ability.can(action, JournalEntry);
      },
    };
  }

  // Inventory policy handlers
  createInventoryPolicyHandler(
    action: Action,
    inventory?: Inventory,
  ): IPolicyHandler {
    return {
      handle: (ability: AppAbility): boolean => {
        if (inventory) {
          return ability.can(action, inventory);
        }
        // If no specific inventory, check general permission
        return ability.can(action, Inventory);
      },
    };
  }

  // Inventory response policy handlers
  createInventoryResponsePolicyHandler(
    action: Action,
    response?: InventoryResponse,
  ): IPolicyHandler {
    return {
      handle: (ability: AppAbility): boolean => {
        if (response) {
          return ability.can(action, response);
        }
        // If no specific response, check general permission
        return ability.can(action, InventoryResponse);
      },
    };
  }

  // Generic resource policy handler
  createResourcePolicyHandler(
    action: Action,
    resource: any,
    targetId?: string,
  ): IPolicyHandler {
    return {
      handle: (ability: AppAbility): boolean => {
        if (targetId) {
          const target = { id: targetId } as any;
          return ability.can(action, target);
        }
        return ability.can(action, resource);
      },
    };
  }

  // Factory method to create a policy handler for any action on any resource
  createPolicyHandler(
    action: Action,
    resourceType: string,
    resource?: any,
  ): IPolicyHandler {
    try {
      switch (resourceType.toLowerCase()) {
        case 'user':
          return this.createUserPolicyHandler(action, resource?.id);

        case 'journal':
          return this.createJournalEntryPolicyHandler(action, resource);

        case 'inventory':
          return this.createInventoryPolicyHandler(action, resource);

        case 'inventory-response':
          return this.createInventoryResponsePolicyHandler(action, resource);

        default:
          // For other resource types or generic usage
          return this.createResourcePolicyHandler(
            action,
            resourceType,
            resource?.id,
          );
      }
    } catch (error) {
      this.logger.error(
        `Error creating policy handler for ${resourceType}: ${error.message}`,
        error.stack,
      );

      // Return a default policy that denies access
      return {
        handle: () => false,
      };
    }
  }
}
