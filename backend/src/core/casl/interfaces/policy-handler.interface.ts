import { AppAbility } from '../types/ability.type';

/**
 * Interface for policy handlers
 * Implement this to create custom policy handlers
 */
export interface IPolicyHandler {
  handle(ability: AppAbility): boolean | Promise<boolean>;
}

/**
 * Type definition for policy handler callback functions
 */
export type PolicyHandlerCallback = (
  ability: AppAbility,
) => boolean | Promise<boolean>;

/**
 * Union type for policy handlers
 * Can be either an implementation of IPolicyHandler or a callback function
 */
export type PolicyHandler = IPolicyHandler | PolicyHandlerCallback;
