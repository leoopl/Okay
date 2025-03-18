import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import * as argon2 from 'argon2';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 30 })
  name: string;

  @Column({ length: 30, nullable: true })
  surname?: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password: string; // nullable since Auth0 will handle many auth scenarios

  @Column({ nullable: true })
  gender?: string;

  @Column({ type: 'date' })
  birthdate: Date;

  @Column({ nullable: true, unique: true })
  auth0Id: string; // field to link with Auth0 users

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password) {
      this.password = await argon2.hash(this.password, {
        type: argon2.argon2id,
      });
    }
  }
}
