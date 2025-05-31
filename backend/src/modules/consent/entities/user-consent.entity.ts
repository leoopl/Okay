// import { User } from "src/modules/user/entities/user.entity";
// import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
// import { ConsentType } from "./consent-type.entity";

// @Entity('user_consents')
// export class UserConsent {
//   @PrimaryGeneratedColumn('uuid')
//   id: string;

//   @ManyToOne(() => User)
//   @JoinColumn({ name: 'user_id' })
//   user: User;

//   @ManyToOne(() => ConsentType)
//   @JoinColumn({ name: 'consent_type_id' })
//   consentType: ConsentType;

//   @Column()
//   status: ConsentStatus; // 'granted', 'denied', 'withdrawn'

//   @Column({ nullable: true })
//   grantedAt?: Date;

//   @Column({ nullable: true })
//   withdrawnAt?: Date;

//   @Column('text', { nullable: true })
//   withdrawalReason?: string;

//   @Column()
//   ipAddress: string;

//   @Column()
//   userAgent: string;

//   @Column('jsonb', { nullable: true })
//   metadata?: ConsentMetadata;

//   @CreateDateColumn()
//   createdAt: Date;

//   @UpdateDateColumn()
//   updatedAt: Date;
// }
