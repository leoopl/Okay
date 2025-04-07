import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('active_sessions')
export class ActiveSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  @Index()
  userId: string;

  @Column({ name: 'device_fingerprint' })
  @Index()
  deviceFingerprint: string;

  @Column({ nullable: true, name: 'device_ip' })
  deviceIp: string;

  @Column({ nullable: true, name: 'user_agent' })
  userAgent: string;

  @Column({ nullable: true })
  browser: string;

  @Column({ nullable: true })
  os: string;

  @Column({ nullable: true, name: 'device_type' })
  deviceType: string;

  @Column({ nullable: true })
  location: string;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    name: 'last_active_at',
  })
  lastActiveAt: Date;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    name: 'expires_at',
  })
  expiresAt: Date;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt: Date;
}
