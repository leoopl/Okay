import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('authorization_codes')
export class AuthorizationCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  @Index()
  code: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @Column()
  clientId: string;

  @Column()
  redirectUri: string;

  @Column({ nullable: true })
  scope: string;

  @Column()
  codeChallenge: string;

  @Column()
  codeChallengeMethod: string;

  @Column({ type: 'timestamp with time zone' })
  @Index()
  expiresAt: Date;

  @Column({ default: false })
  used: boolean;

  @Column({ nullable: true })
  usedByIp: string;

  @Column({ nullable: true })
  createdByIp: string;

  @Column({ nullable: true })
  userAgent: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
