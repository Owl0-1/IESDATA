/**
 * Enriquece ies.cnpj a partir de CSV e-MEC (Código IES + CNPJ).
 * Arquivo padrão: data/ies_cnpj_emec.csv
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { DataSource } from 'typeorm';
import { normalizeCnpj } from '../common/cnpj';
import { Ies } from '../ies/entities/ies.entity';

function resolveCsvPath(): string {
  const fromEnv = process.env.CENSUP_CNPJ_CSV_PATH?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  const dataDir = process.env.CENSUP_DATA_DIR?.trim()
    ? path.resolve(process.env.CENSUP_DATA_DIR)
    : path.resolve(__dirname, '../../../../data');
  return path.join(dataDir, 'ies_cnpj_emec.csv');
}

async function main() {
  const csvPath = resolveCsvPath();
  if (!fs.existsSync(csvPath)) {
    throw new Error(
      `CSV CNPJ não encontrado: ${csvPath}\nBaixe um arquivo com colunas "Código IES" e "CNPJ".`,
    );
  }

  const ds = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [Ies],
    synchronize: true,
  });
  await ds.initialize();
  const repo = ds.getRepository(Ies);

  const stream = fs.createReadStream(csvPath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let header: string[] | null = null;
  let coIdx = -1;
  let cnpjIdx = -1;
  let updated = 0;
  let skipped = 0;
  const batch: { coIes: number; cnpj: string }[] = [];

  const flush = async () => {
    for (const row of batch) {
      const result = await repo.update(
        { coIes: row.coIes },
        { cnpj: row.cnpj },
      );
      if ((result.affected ?? 0) > 0) updated += 1;
      else skipped += 1;
    }
    batch.length = 0;
  };

  for await (const line of rl) {
    if (!line.trim()) continue;
    if (!header) {
      header = line.split(';').map((c) => c.trim().replace(/^\ufeff/, ''));
      coIdx = header.findIndex(
        (c) =>
          c.toLowerCase() === 'código ies' ||
          c.toLowerCase() === 'codigo ies' ||
          c === 'CO_IES',
      );
      cnpjIdx = header.findIndex((c) => c.toUpperCase() === 'CNPJ');
      if (coIdx < 0 || cnpjIdx < 0) {
        throw new Error(
          `Colunas "Código IES" e "CNPJ" não encontradas. Header: ${header.join(' | ')}`,
        );
      }
      continue;
    }

    const cols = line.split(';');
    const coIes = Number((cols[coIdx] ?? '').trim());
    const cnpj = normalizeCnpj(cols[cnpjIdx]);
    if (!Number.isFinite(coIes) || !cnpj) {
      skipped += 1;
      continue;
    }
    batch.push({ coIes: Math.trunc(coIes), cnpj });
    if (batch.length >= 200) await flush();
  }

  await flush();
  const withCnpj = await repo
    .createQueryBuilder('ies')
    .where('ies.cnpj IS NOT NULL')
    .getCount();

  console.log(
    `[seed:enrich-cnpj] updated=${updated} skipped=${skipped} ies_com_cnpj=${withCnpj}`,
  );
  await ds.destroy();
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
