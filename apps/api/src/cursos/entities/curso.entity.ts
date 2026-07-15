import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('cursos')
@Index('IDX_cursos_natural', ['coCurso', 'coMunicipio', 'anoCenso'], {
  unique: true,
})
export class Curso {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'ano_censo', type: 'int' })
  anoCenso!: number;

  @Column({ name: 'co_curso', type: 'int' })
  coCurso!: number;

  @Index('IDX_cursos_co_ies')
  @Column({ name: 'co_ies', type: 'int' })
  coIes!: number;

  @Index('IDX_cursos_no_curso')
  @Column({ name: 'no_curso', type: 'varchar', length: 400 })
  noCurso!: string;

  @Column({ name: 'grau', type: 'varchar', length: 40, nullable: true })
  grau!: string | null;

  @Column({ name: 'modalidade', type: 'varchar', length: 20, nullable: true })
  modalidade!: string | null;

  @Column({ name: 'sg_uf', type: 'varchar', length: 2 })
  sgUf!: string;

  @Column({ name: 'no_municipio', type: 'varchar', length: 120, nullable: true })
  noMunicipio!: string | null;

  @Column({ name: 'co_municipio', type: 'int' })
  coMunicipio!: number;
}
