import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateJournalDto } from './create-journal.dto';
import { IsOptional, IsArray, IsString } from 'class-validator';

export class UpdateJournalDto extends PartialType(CreateJournalDto) {
  @ApiProperty({
    description: 'Tags associated with the entry',
    required: false,
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  readonly tags?: string[];
}
