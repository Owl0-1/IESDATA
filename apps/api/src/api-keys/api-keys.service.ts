import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { ApiKey } from './entities/api-key.entity';

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly keysRepo: Repository<ApiKey>,
  ) {}

  async create(user: User, name: string) {
    const secret = `ies_live_${randomBytes(24).toString('hex')}`;
    const keyPrefix = secret.slice(0, 16);
    const keyHash = createHash('sha256').update(secret).digest('hex');

    const row = this.keysRepo.create({
      userId: user.id,
      name: name.trim(),
      keyPrefix,
      keySecret: secret,
      keyHash,
      lastUsedAt: null,
      revokedAt: null,
    });
    await this.keysRepo.save(row);

    return {
      id: row.id,
      name: row.name,
      keyPrefix: row.keyPrefix,
      key: secret,
      createdAt: row.createdAt,
      lastUsedAt: row.lastUsedAt,
      revokedAt: row.revokedAt,
    };
  }

  async list(userId: string) {
    const rows = await this.keysRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      keyPrefix: row.keyPrefix,
      key: row.keySecret,
      createdAt: row.createdAt,
      lastUsedAt: row.lastUsedAt,
      revokedAt: row.revokedAt,
    }));
  }

  async revoke(userId: string, id: string) {
    const row = await this.keysRepo.findOne({ where: { id, userId } });
    if (!row) {
      throw new NotFoundException('API Key não encontrada');
    }
    if (!row.revokedAt) {
      row.revokedAt = new Date();
      await this.keysRepo.save(row);
    }
    return { id: row.id, revokedAt: row.revokedAt };
  }

  findActiveByHash(keyHash: string) {
    return this.keysRepo.findOne({
      where: { keyHash, revokedAt: IsNull() },
    });
  }

  async touchLastUsed(id: string) {
    await this.keysRepo.update({ id }, { lastUsedAt: new Date() });
  }
}
