import { InferSubjects, AbilityClass, PureAbility } from '@casl/ability';
import { User } from '../../../modules/user/entities/user.entity';
import { JournalEntry } from '../../../modules/journal/entities/journal.entity';
import { Inventory } from '../../../modules/inventory/entities/inventory.entity';
import { InventoryResponse } from '../../../modules/inventory/entities/inventory-response.entity';

// Define possible actions
export enum Action {
  Manage = 'manage', // wildcard for any action
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
}

// Define possible subjects
export type Subjects =
  | InferSubjects<
      | typeof User
      | typeof JournalEntry
      | typeof Inventory
      | typeof InventoryResponse
    >
  | 'all';

// Define the AppAbility type which combines actions and subjects
export type AppAbility = PureAbility<[Action, Subjects]>;

// Export the AbilityFactory type for use in our factory
export const ABILITY_FACTORY = () => PureAbility as AbilityClass<AppAbility>;
