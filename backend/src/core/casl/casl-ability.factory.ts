import { Injectable } from '@nestjs/common';
import { AbilityBuilder } from '@casl/ability';
import { User } from '../../modules/user/entities/user.entity';
import { JournalEntry } from '../../modules/journal/entities/journal.entity';
import { Inventory } from '../../modules/inventory/entities/inventory.entity';
import { InventoryResponse } from '../../modules/inventory/entities/inventory-response.entity';
import { Action, AppAbility, ABILITY_FACTORY } from './types/ability.type';

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: User): AppAbility {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { can, cannot, build } = new AbilityBuilder(ABILITY_FACTORY());

    if (user.roles?.some((role) => role.name === 'admin')) {
      // Admins can do anything
      can(Action.Manage, 'all');
    } else {
      // Regular users (patients) permissions

      // User permissions - users can read and update their own profile
      can(Action.Read, User, { id: user.id });
      can(Action.Update, User, { id: user.id });

      // Journal permissions - users can manage their own journal entries
      can(Action.Create, JournalEntry);
      can(Action.Read, JournalEntry, { userId: user.id });
      can(Action.Update, JournalEntry, { userId: user.id });
      can(Action.Delete, JournalEntry, { userId: user.id });

      // Inventory permissions - users can read all inventories but can't modify them
      can(Action.Read, Inventory);

      // Inventory response permissions - users can create responses and read their own
      can(Action.Create, InventoryResponse);
      can(Action.Read, InventoryResponse, { userId: user.id });
    }

    return build();
  }
}
