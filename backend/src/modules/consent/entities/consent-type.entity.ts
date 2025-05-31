// import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from "typeorm";

// export class Consent {}
// @Entity('consent_types')
// export class ConsentType {
//   @PrimaryGeneratedColumn('uuid')
//   id: string;

//   @Column({ unique: true })
//   @Index()
//   code: string; // 'inventory_access', 'journal_access', etc.

//   @Column()
//   name: string;

//   @Column('text')
//   description: string;

//   @Column('text')
//   legalText: string;

//   @Column()
//   category: ConsentCategory; // 'data_access', 'processing', 'sharing'

//   @Column()
//   dataRetentionDays: number;

//   @Column({ default: true })
//   isActive: boolean;

//   @Column()
//   version: number;

//   @CreateDateColumn()
//   createdAt: Date;
// }
