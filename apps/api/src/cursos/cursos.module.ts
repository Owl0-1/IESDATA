import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { Ies } from '../ies/entities/ies.entity';
import { CursosController } from './cursos.controller';
import { CursosService } from './cursos.service';
import { Curso } from './entities/curso.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Curso, Ies]), ApiKeysModule],
  controllers: [CursosController],
  providers: [CursosService],
})
export class CursosModule {}
