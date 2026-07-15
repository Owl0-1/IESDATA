import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH ?? '../../.env' });

import { DataSource, Repository } from 'typeorm';
import { Curso } from '../cursos/entities/curso.entity';
import { Ies } from '../ies/entities/ies.entity';
import {
  TP_CATEGORIA_ADMINISTRATIVA,
  TP_GRAU_ACADEMICO,
  TP_MODALIDADE_ENSINO,
  TP_ORGANIZACAO_ACADEMICA,
  TP_REDE,
  decodeLabel,
} from './censup.constants';

const ANO = Number(process.env.CENSUP_ANO ?? 2024);
const UPSERT_CHUNK = 500;

function resolveDataDir(): string {
  const fromEnv = process.env.CENSUP_DATA_DIR?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  return path.resolve(__dirname, '../../../../data');
}

function resolveCsvPath(envVar: string, candidates: string[]): string {
  const fromEnv = process.env[envVar]?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  const dir = resolveDataDir();
  for (const name of candidates) {
    const full = path.join(dir, name);
    if (fs.existsSync(full)) return full;
  }
  return path.join(dir, candidates[0]);
}

function toInt(value: string | undefined): number | null {
  const v = (value ?? '').trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function clean(value: string | undefined, max?: number): string | null {
  const v = (value ?? '').trim();
  if (!v) return null;
  return max && v.length > max ? v.slice(0, max) : v;
}

function buildIndex(headerLine: string): Record<string, number> {
  const cols = headerLine.split(';');
  const index: Record<string, number> = {};
  cols.forEach((c, i) => {
    index[c.trim().replace(/^\ufeff/, '')] = i;
  });
  return index;
}

async function readCsvLines(
  filePath: string,
  onHeader: (idx: Record<string, number>) => void,
  onRow: (cols: string[], idx: Record<string, number>) => Promise<void> | void,
): Promise<void> {
  const stream = fs.createReadStream(filePath, { encoding: 'latin1' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let idx: Record<string, number> | null = null;
  for await (const line of rl) {
    if (!line) continue;
    if (idx === null) {
      idx = buildIndex(line);
      onHeader(idx);
      continue;
    }
    await onRow(line.split(';'), idx);
  }
}

async function flushIes(
  repo: Repository<Ies>,
  batch: Partial<Ies>[],
): Promise<number> {
  if (batch.length === 0) return 0;
  await repo.upsert(batch as Ies[], { conflictPaths: ['coIes'] });
  const n = batch.length;
  batch.length = 0;
  return n;
}

async function flushCursos(
  repo: Repository<Curso>,
  batch: Partial<Curso>[],
): Promise<number> {
  if (batch.length === 0) return 0;
  await repo.upsert(batch as Curso[], {
    conflictPaths: ['coCurso', 'coMunicipio', 'anoCenso'],
  });
  const n = batch.length;
  batch.length = 0;
  return n;
}

async function ingestIes(repo: Repository<Ies>, filePath: string) {
  let count = 0;
  const batch: Partial<Ies>[] = [];
  let idx: Record<string, number> = {};

  await readCsvLines(
    filePath,
    (i) => {
      idx = i;
    },
    async (cols) => {
      const get = (name: string) => cols[idx[name]];
      const coIes = toInt(get('CO_IES'));
      const sgUf = clean(get('SG_UF_IES'), 2);
      if (coIes === null || !sgUf) return;

      const tpOrg = toInt(get('TP_ORGANIZACAO_ACADEMICA'));
      const tpRede = toInt(get('TP_REDE'));
      const tpCat = toInt(get('TP_CATEGORIA_ADMINISTRATIVA'));

      batch.push({
        anoCenso: toInt(get('NU_ANO_CENSO')) ?? ANO,
        coIes,
        noIes: clean(get('NO_IES'), 400) ?? '',
        sgIes: clean(get('SG_IES'), 60),
        organizacaoAcademica: decodeLabel(TP_ORGANIZACAO_ACADEMICA, tpOrg),
        rede: decodeLabel(TP_REDE, tpRede),
        categoriaAdministrativa: decodeLabel(
          TP_CATEGORIA_ADMINISTRATIVA,
          tpCat,
        ),
        sgUf,
        noMunicipio: clean(get('NO_MUNICIPIO_IES'), 120),
        coMunicipio: toInt(get('CO_MUNICIPIO_IES')),
        noMantenedora: clean(get('NO_MANTENEDORA'), 400),
      });

      if (batch.length >= UPSERT_CHUNK) {
        count += await flushIes(repo, batch);
        if (count % 2000 === 0) console.log(`   IES upsert: ${count}`);
      }
    },
  );

  count += await flushIes(repo, batch);
  return count;
}

async function ingestCursos(repo: Repository<Curso>, filePath: string) {
  let count = 0;
  const batch: Partial<Curso>[] = [];
  let idx: Record<string, number> = {};

  await readCsvLines(
    filePath,
    (i) => {
      idx = i;
    },
    async (cols) => {
      const get = (name: string) => cols[idx[name]];
      const coIes = toInt(get('CO_IES'));
      const coCurso = toInt(get('CO_CURSO'));
      const coMunicipio = toInt(get('CO_MUNICIPIO'));
      const sgUf = clean(get('SG_UF'), 2);
      if (coIes === null || coCurso === null || coMunicipio === null || !sgUf) {
        return;
      }

      const tpGrau = toInt(get('TP_GRAU_ACADEMICO'));
      const tpMod = toInt(get('TP_MODALIDADE_ENSINO'));

      batch.push({
        anoCenso: toInt(get('NU_ANO_CENSO')) ?? ANO,
        coCurso,
        coIes,
        noCurso: clean(get('NO_CURSO'), 400) ?? '',
        grau: decodeLabel(TP_GRAU_ACADEMICO, tpGrau),
        modalidade: decodeLabel(TP_MODALIDADE_ENSINO, tpMod),
        sgUf,
        noMunicipio: clean(get('NO_MUNICIPIO'), 120),
        coMunicipio,
      });

      if (batch.length >= UPSERT_CHUNK) {
        count += await flushCursos(repo, batch);
        if (count % 5000 === 0) console.log(`   Cursos upsert: ${count}`);
      }
    },
  );

  count += await flushCursos(repo, batch);
  return count;
}

async function seedCensup() {
  const iesPath = resolveCsvPath('CENSUP_IES_CSV_PATH', [
    `MICRODADOS_CADASTRO_IES_${ANO}.CSV`,
    `MICRODADOS_ED_SUP_IES_${ANO}.CSV`,
    `microdados_cadastro_ies_${ANO}.csv`,
  ]);
  const cursosPath = resolveCsvPath('CENSUP_CURSOS_CSV_PATH', [
    `MICRODADOS_CADASTRO_CURSOS_${ANO}.CSV`,
    `microdados_cadastro_cursos_${ANO}.csv`,
  ]);

  for (const [label, p] of [
    ['IES', iesPath],
    ['Cursos', cursosPath],
  ] as const) {
    if (!fs.existsSync(p)) {
      throw new Error(
        `Arquivo de ${label} não encontrado: ${p}\nBaixe o ZIP do INEP e extraia os CSVs em ${resolveDataDir()}`,
      );
    }
  }

  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [Ies, Curso],
    synchronize: true,
  });

  await dataSource.initialize();
  const iesRepo = dataSource.getRepository(Ies);
  const cursoRepo = dataSource.getRepository(Curso);

  console.log(`[seed:censup] Ano=${ANO} (Brasil inteiro)`);
  console.log(`   IES:    ${iesPath}`);
  console.log(`   Cursos: ${cursosPath}`);

  const iesCount = await ingestIes(iesRepo, iesPath);
  console.log(`✅ IES importadas: ${iesCount}`);

  const cursosCount = await ingestCursos(cursoRepo, cursosPath);
  console.log(`✅ Cursos importados: ${cursosCount}`);

  await dataSource.destroy();
}

seedCensup().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
