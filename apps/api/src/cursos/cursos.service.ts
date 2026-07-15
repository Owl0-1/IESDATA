import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginateMeta } from '../common/pagination';
import { Ies } from '../ies/entities/ies.entity';
import {
  ListCursosByIesQueryDto,
  ListCursosQueryDto,
} from './dto/list-cursos-query.dto';
import { Curso } from './entities/curso.entity';

@Injectable()
export class CursosService {
  constructor(
    @InjectRepository(Curso)
    private readonly cursosRepo: Repository<Curso>,
    @InjectRepository(Ies)
    private readonly iesRepo: Repository<Ies>,
  ) {}

  async listByIes(coIes: number, query: ListCursosByIesQueryDto) {
    await this.ensureIes(coIes);
    return this.queryCursos(coIes, query.search, query.page, query.limit);
  }

  async list(query: ListCursosQueryDto) {
    await this.ensureIes(query.coIes);
    return this.queryCursos(
      query.coIes,
      query.search,
      query.page,
      query.limit,
    );
  }

  private async ensureIes(coIes: number) {
    const exists = await this.iesRepo.exist({ where: { coIes } });
    if (!exists) {
      throw new NotFoundException('IES não encontrada');
    }
  }

  private async queryCursos(
    coIes: number,
    search: string | undefined,
    page: number,
    limit: number,
  ) {
    const qb = this.cursosRepo
      .createQueryBuilder('curso')
      .where('curso.co_ies = :coIes', { coIes });

    if (search?.trim()) {
      qb.andWhere('curso.no_curso ILIKE :search', {
        search: `%${search.trim()}%`,
      });
    }

    qb.orderBy('curso.no_curso', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, ...paginateMeta(total, page, limit) };
  }
}
