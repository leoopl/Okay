// import {
//   Injectable,
//   CanActivate,
//   ExecutionContext,
//   UnauthorizedException,
// } from '@nestjs/common';
// import { Reflector } from '@nestjs/core';
// import { ConsentService } from '../consent.service';

// // modules/consent/guards/consent.guard.ts
// @Injectable()
// export class ConsentGuard implements CanActivate {
//   constructor(
//     private readonly consentService: ConsentService,
//     private readonly reflector: Reflector,
//   ) {}

//   async canActivate(context: ExecutionContext): Promise<boolean> {
//     const requiredConsents = this.reflector.get<string[]>(
//       'required-consents',
//       context.getHandler(),
//     );

//     if (!requiredConsents || requiredConsents.length === 0) {
//       return true;
//     }

//     const request = context.switchToHttp().getRequest();
//     const userId = request.user?.userId;

//     if (!userId) {
//       throw new UnauthorizedException('User not authenticated');
//     }

//     const hasConsent = await this.consentService.hasValidConsent(
//       userId,
//       requiredConsents,
//     );

//     if (!hasConsent) {
//       throw new ConsentRequiredException(requiredConsents);
//     }

//     return true;
//   }
// }
