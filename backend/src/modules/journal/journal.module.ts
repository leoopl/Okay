import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JournalController } from './journal.controller';
import { JournalService } from './journal.service';
import { JournalEntry } from './entities/journal.entity';
import { AuditModule } from '../../core/audit/audit.module';
import { CaslModule } from '../../core/casl/casl.module';
import { UserModule } from '../user/user.module';
import { EncryptionModule } from '../../common/encryption/encryption.module';

@Module({
  imports: [
    // Register the JournalEntry entity
    TypeOrmModule.forFeature([JournalEntry]),

    // Configuration module for accessing environment variables
    ConfigModule,

    // Audit module for logging all journal operations
    AuditModule,

    // Encryption module for securing sensitive health data
    EncryptionModule,

    // CASL module for authorization policies
    forwardRef(() => CaslModule),

    // User module for user relationships
    forwardRef(() => UserModule),
  ],
  controllers: [JournalController],
  providers: [JournalService],
  exports: [
    JournalService,
    TypeOrmModule, // Export for other modules that might need journal repository
  ],
})
export class JournalModule {}

/**
 * Configuration for journal-specific settings
 * Add this to your main configuration or create a separate config file
 */
export const journalConfig = () => ({
  journal: {
    // Enable content encryption for highly sensitive health data
    encryptionEnabled: process.env.JOURNAL_ENCRYPTION_ENABLED === 'true',

    // Maximum entries per user (set to 0 for unlimited)
    maxEntriesPerUser:
      parseInt(process.env.JOURNAL_MAX_ENTRIES_PER_USER, 10) || 0,

    // Maximum content size in bytes (1MB default)
    maxContentSize:
      parseInt(process.env.JOURNAL_MAX_CONTENT_SIZE, 10) || 1024 * 1024,

    // Auto-cleanup settings
    autoCleanup: {
      enabled: process.env.JOURNAL_AUTO_CLEANUP_ENABLED === 'true',
      retentionDays: parseInt(process.env.JOURNAL_RETENTION_DAYS, 10) || 0, // 0 = never delete
    },

    // Search and indexing settings
    search: {
      enabled: process.env.JOURNAL_SEARCH_ENABLED !== 'false',
      indexContent: process.env.JOURNAL_INDEX_CONTENT !== 'false',
    },

    // Rate limiting for journal operations
    rateLimit: {
      createPerHour: parseInt(process.env.JOURNAL_CREATE_RATE_LIMIT, 10) || 100,
      updatePerHour: parseInt(process.env.JOURNAL_UPDATE_RATE_LIMIT, 10) || 200,
    },
  },
});
