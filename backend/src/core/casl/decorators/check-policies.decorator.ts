import { SetMetadata, applyDecorators, UseGuards } from '@nestjs/common';
import { PolicyHandler } from '../interfaces/policy-handler.interface';
import { PoliciesGuard } from '../guards/policies.guard';
import { AppAbility, Action } from '../types/ability.type';

export const CHECK_POLICIES_KEY = 'check_policy';

/**
 * CheckPolicies decorator for policy-based authorization
 * @param handlers The policy handlers to check
 */
export const CheckPolicies = (...handlers: PolicyHandler[]) =>
  SetMetadata(CHECK_POLICIES_KEY, handlers);

/**
 * RequirePermissions decorator that combines PoliciesGuard with CheckPolicies
 * A more convenient way to apply policy-based authorization
 *
 * @param handlers The policy handlers to check
 */
export const RequirePermissions = (...handlers: PolicyHandler[]) => {
  return applyDecorators(UseGuards(PoliciesGuard), CheckPolicies(...handlers));
};

/**
 * Helper function to create a simple policy handler for a specific action and subject
 *
 * @param action The action to check (Create, Read, Update, Delete, Manage)
 * @param subject The subject to check the action against
 */
export const createPolicyHandler = (action: Action, subject: any) => {
  return (ability: AppAbility) => ability.can(action, subject);
};
