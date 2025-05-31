// import {
//   Controller,
//   UseGuards,
//   Get,
//   Req,
//   Post,
//   Body,
//   BadRequestException,
//   Param,
// } from '@nestjs/common';
// import { IAuthenticatedRequest } from 'src/common/interfaces/auth-request.interface';
// import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
// import { ConsentService } from './consent.service';

// @Controller('consent')
// @UseGuards(JwtAuthGuard)
// export class ConsentController {
//   constructor(
//     private readonly consentService: ConsentService,
//     private readonly consentFlowService: ConsentFlowService,
//   ) {}

//   @Get('status')
//   async getConsentStatus(@Req() req: IAuthenticatedRequest) {
//     return this.consentService.getConsentStatus(req.user.userId);
//   }

//   @Post('grant')
//   async grantConsent(
//     @Body() dto: GrantConsentDto,
//     @Req() req: IAuthenticatedRequest,
//   ) {
//     const metadata: ConsentRequestMetadata = {
//       ipAddress: this.getIpAddress(req),
//       userAgent: req.headers['user-agent'],
//       collectionMethod: 'web_form',
//     };

//     const results = await Promise.all(
//       dto.consentTypes.map((type) =>
//         this.consentService.grantConsent(req.user.userId, type, metadata),
//       ),
//     );

//     const failed = results.filter((r) => !r.success);
//     if (failed.length > 0) {
//       throw new BadRequestException('Some consents failed to process');
//     }

//     return {
//       success: true,
//       granted: dto.consentTypes,
//       timestamp: new Date(),
//     };
//   }

//   @Post('withdraw/:consentType')
//   async withdrawConsent(
//     @Param('consentType') consentType: string,
//     @Body() dto: WithdrawConsentDto,
//     @Req() req: IAuthenticatedRequest,
//   ) {
//     const metadata: ConsentRequestMetadata = {
//       ipAddress: this.getIpAddress(req),
//       userAgent: req.headers['user-agent'],
//       collectionMethod: 'web_form',
//     };

//     const result = await this.consentService.withdrawConsent(
//       req.user.userId,
//       consentType,
//       dto.reason,
//       metadata,
//     );

//     if (!result.success) {
//       throw new BadRequestException(result.error.message);
//     }

//     return {
//       success: true,
//       withdrawn: consentType,
//       timestamp: new Date(),
//     };
//   }

//   @Get('required')
//   async getRequiredConsents(@Req() req: IAuthenticatedRequest) {
//     return this.consentFlowService.getRequiredConsents(req.user.userId);
//   }

//   /**
//    * Helper method to get client IP address
//    */
//   private getIpAddress(req: IAuthenticatedRequest): string {
//     const forwarded = req.headers['x-forwarded-for'];
//     if (forwarded) {
//       return Array.isArray(forwarded)
//         ? forwarded[0]
//         : forwarded.split(',')[0].trim();
//     }
//     return req.ip || 'unknown';
//   }
// }
