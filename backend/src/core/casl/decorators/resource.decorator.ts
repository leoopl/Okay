import { SetMetadata } from '@nestjs/common';
import { Request } from 'express';

export const REQUEST_RESOURCE_KEY = 'request_resource';

/**
 * Resource decorator for providing context to policy handlers
 * @param resourceOrFactory The resource object or a factory function that produces it
 */
export const UseResource = (
  resourceOrFactory: any | ((request: Request) => any | Promise<any>),
) => SetMetadata(REQUEST_RESOURCE_KEY, resourceOrFactory);
