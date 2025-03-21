import { IPolicyHandler } from '../interfaces/policy-handler.interface';
import { AppAbility, Action } from '../types/ability.type';
import { User } from '../../../modules/user/entities/user.entity';
import { JournalEntry } from '../../../modules/journal/entities/journal.entity';
import { Inventory } from '../../../modules/inventory/entities/inventory.entity';
import { InventoryResponse } from '../../../modules/inventory/entities/inventory-response.entity';

// User Policies
export class ReadUserPolicyHandler implements IPolicyHandler {
  constructor(private readonly targetUserId: string) {}

  handle(ability: AppAbility): boolean {
    const userSubject = { id: this.targetUserId } as User;
    return ability.can(Action.Read, userSubject);
  }
}

export class UpdateUserPolicyHandler implements IPolicyHandler {
  constructor(private readonly targetUserId: string) {}

  handle(ability: AppAbility): boolean {
    const userSubject = { id: this.targetUserId } as User;
    return ability.can(Action.Update, userSubject);
  }
}

// Journal Entry Policies
export class ReadJournalEntryPolicyHandler implements IPolicyHandler {
  constructor(private readonly journalEntry: JournalEntry) {}

  handle(ability: AppAbility): boolean {
    return ability.can(Action.Read, this.journalEntry);
  }
}

export class CreateJournalEntryPolicyHandler implements IPolicyHandler {
  handle(ability: AppAbility): boolean {
    return ability.can(Action.Create, JournalEntry);
  }
}

export class UpdateJournalEntryPolicyHandler implements IPolicyHandler {
  constructor(private readonly journalEntry: JournalEntry) {}

  handle(ability: AppAbility): boolean {
    return ability.can(Action.Update, this.journalEntry);
  }
}

export class DeleteJournalEntryPolicyHandler implements IPolicyHandler {
  constructor(private readonly journalEntry: JournalEntry) {}

  handle(ability: AppAbility): boolean {
    return ability.can(Action.Delete, this.journalEntry);
  }
}

// Inventory Policies
export class ReadInventoryPolicyHandler implements IPolicyHandler {
  handle(ability: AppAbility): boolean {
    return ability.can(Action.Read, Inventory);
  }
}

export class ManageInventoryPolicyHandler implements IPolicyHandler {
  handle(ability: AppAbility): boolean {
    return ability.can(Action.Manage, Inventory);
  }
}

// Inventory Response Policies
export class ReadInventoryResponsePolicyHandler implements IPolicyHandler {
  constructor(private readonly response: InventoryResponse) {}

  handle(ability: AppAbility): boolean {
    return ability.can(Action.Read, this.response);
  }
}

export class CreateInventoryResponsePolicyHandler implements IPolicyHandler {
  handle(ability: AppAbility): boolean {
    return ability.can(Action.Create, InventoryResponse);
  }
}
