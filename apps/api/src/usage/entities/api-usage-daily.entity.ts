import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ApiKey } from '../../api-keys/entities/api-key.entity';
import { User } from '../../users/entities/user.entity';

@Entity('api_usage_daily')
@Unique('UQ_api_usage_daily_user_key_day', ['userId', 'apiKeyId', 'day'])
export class ApiUsageDaily {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('IDX_api_usage_daily_user_id')
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Index('IDX_api_usage_daily_api_key_id')
  @Column({ name: 'api_key_id', type: 'uuid' })
  apiKeyId!: string;

  @ManyToOne(() => ApiKey, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'api_key_id' })
  apiKey!: ApiKey;

  @Column({ type: 'date' })
  day!: string;

  @Column({ name: 'request_count', type: 'int', default: 0 })
  requestCount!: number;
}
