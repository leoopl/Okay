import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for journal entries
 * Excludes sensitive internal fields
 */
export class JournalEntryResponseDto {
  @ApiProperty({ description: 'Journal entry ID' })
  readonly id: string;

  @ApiProperty({ description: 'Journal entry title' })
  readonly title: string;

  @ApiProperty({ description: 'Journal entry content as JSON string' })
  readonly content: string;

  @ApiProperty({ description: 'User ID who owns this entry' })
  readonly userId: string;

  @ApiProperty({
    description: 'Mood associated with the entry',
    required: false,
  })
  readonly mood?: string;

  @ApiProperty({ description: 'Tags for categorization', type: [String] })
  readonly tags: string[];

  @ApiProperty({ description: 'Creation timestamp' })
  readonly createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  readonly updatedAt: Date;

  constructor(journalEntry: any) {
    this.id = journalEntry.id;
    this.title = journalEntry.title;
    // Convert content object back to string for frontend
    this.content =
      typeof journalEntry.content === 'string'
        ? journalEntry.content
        : JSON.stringify(journalEntry.content);
    this.userId = journalEntry.userId;
    this.mood = journalEntry.mood;
    this.tags = journalEntry.tags || [];
    this.createdAt = journalEntry.createdAt;
    this.updatedAt = journalEntry.updatedAt;
  }
}
