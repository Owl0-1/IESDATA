import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { Ies } from '../ies/entities/ies.entity';
import { GeoController } from './geo.controller';
import { GeoService } from './geo.service';

@Module({
  imports: [TypeOrmModule.forFeature([Ies]), ApiKeysModule],
  controllers: [GeoController],
  providers: [GeoService],
})
export class GeoModule {}
