import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ies')
export class Ies {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'ano_censo', type: 'int' })
  anoCenso!: number;

  @Index('IDX_ies_co_ies', { unique: true })
  @Column({ name: 'co_ies', type: 'int' })
  coIes!: number;

  @Index('IDX_ies_no_ies')
  @Column({ name: 'no_ies', type: 'varchar', length: 400 })
  noIes!: string;

  @Column({ name: 'sg_ies', type: 'varchar', length: 60, nullable: true })
  sgIes!: string | null;

  @Column({
    name: 'organizacao_academica',
    type: 'varchar',
    length: 80,
    nullable: true,
  })
  organizacaoAcademica!: string | null;

  @Column({ name: 'rede', type: 'varchar', length: 20, nullable: true })
  rede!: string | null;

  @Column({
    name: 'categoria_administrativa',
    type: 'varchar',
    length: 60,
    nullable: true,
  })
  categoriaAdministrativa!: string | null;

  @Index('IDX_ies_uf')
  @Column({ name: 'sg_uf', type: 'varchar', length: 2 })
  sgUf!: string;

  @Index('IDX_ies_municipio')
  @Column({ name: 'no_municipio', type: 'varchar', length: 120, nullable: true })
  noMunicipio!: string | null;

  @Column({ name: 'co_municipio', type: 'int', nullable: true })
  coMunicipio!: number | null;

  @Column({
    name: 'no_mantenedora',
    type: 'varchar',
    length: 400,
    nullable: true,
  })
  noMantenedora!: string | null;

  /** CNPJ da mantenedora (apenas dígitos). Fonte: e-MEC / enriquecimento. */
  @Index('IDX_ies_cnpj')
  @Column({ name: 'cnpj', type: 'varchar', length: 14, nullable: true })
  cnpj!: string | null;
}
