import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ies } from '../ies/entities/ies.entity';

@Injectable()
export class GeoService {
  constructor(
    @InjectRepository(Ies)
    private readonly iesRepo: Repository<Ies>,
  ) {}

  async listUfs() {
    const rows = await this.iesRepo
      .createQueryBuilder('ies')
      .select('DISTINCT ies.sg_uf', 'uf')
      .orderBy('ies.sg_uf', 'ASC')
      .getRawMany<{ uf: string }>();
    return rows.map((r) => r.uf).filter(Boolean);
  }

  async listMunicipios(uf: string) {
    const rows = await this.iesRepo
      .createQueryBuilder('ies')
      .select('DISTINCT ies.no_municipio', 'municipio')
      .where('ies.sg_uf = :uf', { uf: uf.toUpperCase() })
      .andWhere('ies.no_municipio IS NOT NULL')
      .orderBy('ies.no_municipio', 'ASC')
      .getRawMany<{ municipio: string }>();
    return rows.map((r) => r.municipio).filter(Boolean);
  }
}
