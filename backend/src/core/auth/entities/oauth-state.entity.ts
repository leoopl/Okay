import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('oauth_states')
export class OAuthState {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index({ unique: true })
  state: string;

  @Column({ nullable: true })
  userId?: string;

  @Column({ nullable: true })
  redirectUrl?: string;

  @Column({ default: false })
  linkMode: boolean;

  @Column()
  @Index()
  expiresAt: Date;

  @Column()
  ipAddress: string;

  @Column()
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;
}
