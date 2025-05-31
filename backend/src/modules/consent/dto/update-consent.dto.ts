import { PartialType } from '@nestjs/swagger';
import { CreateConsentDto } from './create-consent.dto';

export class UpdateConsentDto extends PartialType(CreateConsentDto) {}
