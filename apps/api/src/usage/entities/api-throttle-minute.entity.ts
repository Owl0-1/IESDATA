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

@Entity('api_throttle_minute')
@Unique('UQ_api_throttle_minute_key_bucket', ['apiKeyId', 'minuteBucket'])
export class ApiThrottleMinute {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('IDX_api_throttle_minute_api_key_id')
  @Column({ name: 'api_key_id', type: 'uuid' })
  apiKeyId!: string;

  @ManyToOne(() => ApiKey, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'api_key_id' })
  apiKey!: ApiKey;

  /** UTC minute floor, e.g. 2026-07-15T14:03:00.000Z */
  @Column({ name: 'minute_bucket', type: 'timestamptz' })
  minuteBucket!: Date;

  @Column({ name: 'request_count', type: 'int', default: 0 })
  requestCount!: number;
}
