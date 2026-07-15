import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { Ies } from './entities/ies.entity';
import { IesController } from './ies.controller';
import { IesService } from './ies.service';

@Module({
  imports: [TypeOrmModule.forFeature([Ies]), ApiKeysModule],
  controllers: [IesController],
  providers: [IesService],
  exports: [IesService, TypeOrmModule],
})
export class IesModule {}
