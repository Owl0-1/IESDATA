import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { normalizeCnpj } from '../common/cnpj';
import { paginateMeta } from '../common/pagination';
import { ListIesQueryDto } from './dto/list-ies-query.dto';
import { Ies } from './entities/ies.entity';

@Injectable()
export class IesService {
  constructor(
    @InjectRepository(Ies)
    private readonly iesRepo: Repository<Ies>,
  ) {}

  async list(query: ListIesQueryDto) {
    const page = query.page;
    const limit = query.limit;
    const cnpj = normalizeCnpj(query.cnpj);
    if (query.cnpj?.trim() && !cnpj) {
      throw new BadRequestException('CNPJ inválido — informe 14 dígitos');
    }

    const qb = this.iesRepo.createQueryBuilder('ies');

    if (cnpj) {
      qb.where('ies.cnpj = :cnpj', { cnpj });
      if (query.uf?.trim()) {
        qb.andWhere('ies.sg_uf = :uf', { uf: query.uf.trim().toUpperCase() });
      }
      if (query.municipio?.trim()) {
        qb.andWhere('LOWER(ies.no_municipio) = LOWER(:municipio)', {
          municipio: query.municipio.trim(),
        });
      }
    } else {
      if (!query.uf?.trim() || !query.municipio?.trim()) {
        throw new BadRequestException(
          'Informe uf e municipio, ou busque por cnpj',
        );
      }
      qb.where('ies.sg_uf = :uf', { uf: query.uf.trim().toUpperCase() }).andWhere(
        'LOWER(ies.no_municipio) = LOWER(:municipio)',
        { municipio: query.municipio.trim() },
      );
    }

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere('(ies.no_ies ILIKE :search OR ies.sg_ies ILIKE :search)', {
        search,
      });
    }

    qb.orderBy('ies.no_ies', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, ...paginateMeta(total, page, limit) };
  }

  async getByCoIes(coIes: number) {
    const ies = await this.iesRepo.findOne({ where: { coIes } });
    if (!ies) {
      throw new NotFoundException('IES não encontrada');
    }
    return ies;
  }

  async getByCnpj(cnpjRaw: string) {
    const cnpj = normalizeCnpj(cnpjRaw);
    if (!cnpj) {
      throw new BadRequestException('CNPJ inválido — informe 14 dígitos');
    }
    const data = await this.iesRepo.find({
      where: { cnpj },
      order: { noIes: 'ASC' },
    });
    if (data.length === 0) {
      throw new NotFoundException('Nenhuma IES encontrada para este CNPJ');
    }
    return { data, total: data.length };
  }
}
