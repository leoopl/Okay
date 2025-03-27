import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @Column({ type: 'text' })
  token: string;

  @Column({ type: 'timestamp with time zone' })
  @Index()
  expiresAt: Date;

  @Column({ default: false })
  revoked: boolean;

  @Column({ nullable: true })
  revokedByIp: string;

  @Column({ nullable: true })
  replacedByToken: string;

  @Column({ nullable: true })
  createdByIp: string;

  @Column({ nullable: true })
  userAgent: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
