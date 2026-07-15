/**
 * Seed mínimo para desenvolvimento local (sem CSV do MEC).
 */
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { ApiKey } from '../api-keys/entities/api-key.entity';
import { Curso } from '../cursos/entities/curso.entity';
import { Ies } from '../ies/entities/ies.entity';
import { User } from '../users/entities/user.entity';

async function main() {
  const ds = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [User, ApiKey, Ies, Curso],
    synchronize: true,
  });
  await ds.initialize();

  const iesRepo = ds.getRepository(Ies);
  const cursoRepo = ds.getRepository(Curso);

  const iesCount = await iesRepo.count();
  if (iesCount === 0) {
    await iesRepo.save([
      {
        anoCenso: 2024,
        coIes: 1,
        noIes: 'Universidade Demo de São Paulo',
        sgIes: 'UDSP',
        organizacaoAcademica: 'Universidade',
        rede: 'Pública',
        categoriaAdministrativa: 'Federal',
        sgUf: 'SP',
        noMunicipio: 'São Paulo',
        coMunicipio: 3550308,
        noMantenedora: 'Mantenedora Demo',
      },
      {
        anoCenso: 2024,
        coIes: 2,
        noIes: 'Faculdade Demo Centro',
        sgIes: 'FDC',
        organizacaoAcademica: 'Faculdade',
        rede: 'Privada',
        categoriaAdministrativa: 'Privada',
        sgUf: 'SP',
        noMunicipio: 'São Paulo',
        coMunicipio: 3550308,
        noMantenedora: null,
      },
      {
        anoCenso: 2024,
        coIes: 3,
        noIes: 'Instituto Demo Rio',
        sgIes: 'IDR',
        organizacaoAcademica: 'Centro Universitário',
        rede: 'Privada',
        categoriaAdministrativa: 'Privada',
        sgUf: 'RJ',
        noMunicipio: 'Rio de Janeiro',
        coMunicipio: 3304557,
        noMantenedora: null,
      },
    ]);

    await cursoRepo.save([
      {
        anoCenso: 2024,
        coCurso: 101,
        coIes: 1,
        noCurso: 'Ciência da Computação',
        grau: 'Bacharelado',
        modalidade: 'Presencial',
        sgUf: 'SP',
        noMunicipio: 'São Paulo',
        coMunicipio: 3550308,
      },
      {
        anoCenso: 2024,
        coCurso: 102,
        coIes: 1,
        noCurso: 'Engenharia de Software',
        grau: 'Bacharelado',
        modalidade: 'Presencial',
        sgUf: 'SP',
        noMunicipio: 'São Paulo',
        coMunicipio: 3550308,
      },
      {
        anoCenso: 2024,
        coCurso: 201,
        coIes: 2,
        noCurso: 'Administração',
        grau: 'Bacharelado',
        modalidade: 'EAD',
        sgUf: 'SP',
        noMunicipio: 'São Paulo',
        coMunicipio: 3550308,
      },
      {
        anoCenso: 2024,
        coCurso: 301,
        coIes: 3,
        noCurso: 'Direito',
        grau: 'Bacharelado',
        modalidade: 'Presencial',
        sgUf: 'RJ',
        noMunicipio: 'Rio de Janeiro',
        coMunicipio: 3304557,
      },
    ]);
    console.log('[seed:demo] IES e cursos de exemplo inseridos.');
  } else {
    console.log(`[seed:demo] Já existem ${iesCount} IES — nada a fazer.`);
  }

  await ds.destroy();
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
