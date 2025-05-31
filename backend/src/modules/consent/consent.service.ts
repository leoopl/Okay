// import { Injectable } from "@nestjs/common";
// import { InjectRepository } from "@nestjs/typeorm";
// import { Result } from "glob/dist/commonjs/walker";
// import { EncryptionService } from "src/common/encryption/encryption.service";
// import { AuditService } from "src/core/audit/audit.service";
// import { AuditAction } from "src/core/audit/entities/audit-log.entity";
// import { Repository, In } from "typeorm";
// import { ConsentType } from "./entities/consent-type.entity";
// import { UserConsent } from "./entities/user-consent.entity";

// @Injectable()
// export class ConsentService {
//   constructor(
//     @InjectRepository(UserConsent)
//     private readonly consentRepository: Repository<UserConsent>,
//     @InjectRepository(ConsentType)
//     private readonly consentTypeRepository: Repository<ConsentType>,
//     private readonly auditService: AuditService,
//     private readonly encryptionService: EncryptionService,
//   ) {}

//   async grantConsent(
//     userId: string,
//     consentTypeCode: string,
//     metadata: ConsentRequestMetadata,
//   ): Promise<Result<UserConsent>> {
//     const consentType = await this.consentTypeRepository.findOne({
//       where: { code: consentTypeCode, isActive: true },
//     });

//     if (!consentType) {
//       return {
//         success: false,
//         error: new Error(`Invalid consent type: ${consentTypeCode}`),
//       };
//     }

//     // Check for existing consent
//     const existing = await this.consentRepository.findOne({
//       where: {
//         user: { id: userId },
//         consentType: { id: consentType.id },
//       },
//     });

//     if (existing && existing.status === ConsentStatus.GRANTED) {
//       return { success: true, data: existing };
//     }

//     // Create new consent record
//     const consent = this.consentRepository.create({
//       user: { id: userId },
//       consentType,
//       status: ConsentStatus.GRANTED,
//       grantedAt: new Date(),
//       ipAddress: metadata.ipAddress,
//       userAgent: metadata.userAgent,
//       metadata: {
//         consentVersion: consentType.version,
//         presentedText: consentType.legalText,
//         collectionMethod: metadata.collectionMethod,
//         parentConsentId: existing?.id,
//       },
//     });

//     const saved = await this.consentRepository.save(consent);

//     // Audit consent grant
//     await this.auditService.logAction({
//       userId,
//       action: AuditAction.CONSENT_UPDATED,
//       resource: 'consent',
//       resourceId: saved.id,
//       details: {
//         consentType: consentTypeCode,
//         action: 'granted',
//         version: consentType.version,
//       },
//     });

//     return { success: true, data: saved };
//   }

//   async withdrawConsent(
//     userId: string,
//     consentTypeCode: string,
//     reason: string,
//     metadata: ConsentRequestMetadata,
//   ): Promise<Result<UserConsent>> {
//     const consent = await this.consentRepository.findOne({
//       where: {
//         user: { id: userId },
//         consentType: { code: consentTypeCode },
//         status: ConsentStatus.GRANTED,
//       },
//       relations: ['consentType'],
//     });

//     if (!consent) {
//       return {
//         success: false,
//         error: new Error('No active consent found'),
//       };
//     }

//     // Update consent status
//     consent.status = ConsentStatus.WITHDRAWN;
//     consent.withdrawnAt = new Date();
//     consent.withdrawalReason = reason;

//     const updated = await this.consentRepository.save(consent);

//     // Audit consent withdrawal
//     await this.auditService.logAction({
//       userId,
//       action: AuditAction.CONSENT_UPDATED,
//       resource: 'consent',
//       resourceId: updated.id,
//       details: {
//         consentType: consentTypeCode,
//         action: 'withdrawn',
//         reason,
//       },
//     });

//     // Trigger data deletion workflow if required
//     if (consent.consentType.category === ConsentCategory.DATA_ACCESS) {
//       await this.triggerDataDeletion(userId, consentTypeCode);
//     }

//     return { success: true, data: updated };
//   }

//   async hasValidConsent(
//     userId: string,
//     consentTypeCodes: string[],
//   ): Promise<boolean> {
//     const count = await this.consentRepository.count({
//       where: {
//         user: { id: userId },
//         consentType: { code: In(consentTypeCodes) },
//         status: ConsentStatus.GRANTED,
//       },
//     });

//     return count === consentTypeCodes.length;
//   }

//   async getConsentStatus(userId: string): Promise<ConsentStatusReport> {
//     const consents = await this.consentRepository.find({
//       where: { user: { id: userId } },
//       relations: ['consentType'],
//       order: { createdAt: 'DESC' },
//     });

//     const consentTypes = await this.consentTypeRepository.find({
//       where: { isActive: true },
//     });

//     return {
//       userId,
//       consents: consentTypes.map((type) => {
//         const userConsent = consents.find(
//           (c) =>
//             c.consentType.id === type.id && c.status === ConsentStatus.GRANTED,
//         );

//         return {
//           type: type.code,
//           name: type.name,
//           category: type.category,
//           status: userConsent ? ConsentStatus.GRANTED : ConsentStatus.DENIED,
//           grantedAt: userConsent?.grantedAt,
//           version: type.version,
//           userConsentVersion: userConsent?.metadata?.consentVersion,
//           needsUpdate: userConsent
//             ? userConsent.metadata?.consentVersion < type.version
//             : false,
//         };
//       }),
//       lastUpdated: consents[0]?.updatedAt || null,
//     };
//   }
// }
