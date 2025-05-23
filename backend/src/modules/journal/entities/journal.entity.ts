import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('journal_entries')
@Check('content_not_empty', "jsonb_array_length(content->'content') > 0")
@Index(['userId', 'createdAt'])
@Index(['userId', 'updatedAt'])
export class JournalEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  @Index()
  title: string;

  /**
   * TipTap editor content stored as JSONB
   * Can be encrypted for additional security of sensitive health data
   */
  @Column({
    type: 'jsonb',
    comment:
      'TipTap editor content in JSON format. May be encrypted for sensitive health data.',
  })
  content: object;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @ManyToOne(() => User, (user) => user.journalEntries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true, length: 50 })
  mood?: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Array of string tags for categorization',
  })
  tags: string[];

  /**
   * Indicates if the content is encrypted for additional security
   * Used for highly sensitive health data
   */
  @Column({ default: false })
  isContentEncrypted: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  @Index()
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  @Index()
  updatedAt: Date;

  // Helper method to check if content is valid TipTap JSON
  isValidTipTapContent(): boolean {
    if (!this.content) return false;

    try {
      const contentObj =
        typeof this.content === 'string'
          ? JSON.parse(this.content)
          : this.content;

      return (
        contentObj &&
        typeof contentObj === 'object' &&
        contentObj.type === 'doc' &&
        Array.isArray(contentObj.content)
      );
    } catch {
      return false;
    }
  }

  // Helper method to get content as string
  getContentAsString(): string {
    if (typeof this.content === 'string') {
      return this.content;
    }
    return JSON.stringify(this.content);
  }

  // Helper method to set content from string
  setContentFromString(content: string): void {
    try {
      this.content = JSON.parse(content);
    } catch {
      // If parsing fails, store as-is (might be encrypted)
      this.content = content as any;
    }
  }
}
