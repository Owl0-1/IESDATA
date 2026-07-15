import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('IDX_api_keys_user_id')
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (user) => user.apiKeys, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ name: 'key_prefix', type: 'varchar', length: 32 })
  keyPrefix!: string;

  // # ponytail: plaintext at rest so Show can reveal; encrypt if threat model requires
  @Column({ name: 'key_secret', type: 'varchar', length: 80, nullable: true })
  keySecret!: string | null;

  @Index('IDX_api_keys_key_hash', { unique: true })
  @Column({ name: 'key_hash', type: 'varchar', length: 64 })
  keyHash!: string;

  @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
  lastUsedAt!: Date | null;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
