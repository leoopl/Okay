/* eslint-disable @typescript-eslint/no-unused-vars */
import { ValueTransformer } from 'typeorm';
import { EncryptionService, EncryptedData } from '../encryption.service';

/**
 * TypeORM transformer for automatically encrypting/decrypting entity fields
 * Use this to protect PHI in your database
 */
export class EncryptedFieldTransformer implements ValueTransformer {
  constructor(private encryptionService: EncryptionService) {}

  // When data is retrieved from database
  from(value: string | null): string | null {
    if (!value) return null;
    try {
      const encryptedData = JSON.parse(value) as EncryptedData;
      return this.encryptionService.decrypt(encryptedData);
    } catch (error) {
      // If the value isn't in the expected format, return as is
      // (helps with data migration scenarios)
      return value;
    }
  }

  // When data is saved to database
  to(value: string | null): string | null {
    if (!value) return null;
    const encryptedData = this.encryptionService.encrypt(value);
    return JSON.stringify(encryptedData);
  }
}

// Example usage in an entity:
/*
  @Entity('patient_records')
  export class PatientRecord {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column()
    patientId: string;
  
    // Regular non-sensitive field
    @Column()
    sessionDate: Date;
  
    // Sensitive field with encryption
    @Column({ type: 'text', transformer: new EncryptedFieldTransformer(encryptionService) })
    diagnosisNotes: string;
  
    // Another sensitive field with encryption
    @Column({ type: 'text', transformer: new EncryptedFieldTransformer(encryptionService) })
    treatmentPlan: string;
  }
  */
