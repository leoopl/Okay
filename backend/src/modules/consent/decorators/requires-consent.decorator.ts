// import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
// import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
// import { ConsentGuard } from '../guards/consent.guard';

// export const RequiresConsent = (...consentTypes: string[]) => {
//   return applyDecorators(
//     SetMetadata('required-consents', consentTypes),
//     UseGuards(JwtAuthGuard, ConsentGuard),
//   );
// };
