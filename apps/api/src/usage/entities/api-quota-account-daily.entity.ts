import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('api_quota_account_daily')
@Unique('UQ_api_quota_account_daily_user_day', ['userId', 'day'])
export class ApiQuotaAccountDaily {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('IDX_api_quota_account_daily_user_id')
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'date' })
  day!: string;

  @Column({ name: 'request_count', type: 'int', default: 0 })
  requestCount!: number;
}
