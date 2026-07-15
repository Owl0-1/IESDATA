import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiKeyRoute } from '../api-keys/decorators/api-key-route.decorator';
import { OPENAPI_EXAMPLES } from '../common/openapi-examples';
import { ListMunicipiosQueryDto } from './dto/list-municipios-query.dto';
import { GeoService } from './geo.service';

@ApiTags('v1 / Geo')
@ApiSecurity('api-key')
@ApiKeyRoute()
@Throttle({ default: { limit: 120, ttl: 60000 } })
@Controller('v1')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Get('ufs')
  @ApiOperation({ summary: 'Listar UFs presentes nos dados' })
  @ApiOkResponse({
    description: 'Lista de siglas de UF',
    schema: { example: OPENAPI_EXAMPLES.ufs },
  })
  listUfs() {
    return this.geoService.listUfs();
  }

  @Get('municipios')
  @ApiOperation({ summary: 'Listar municípios por UF' })
  @ApiOkResponse({
    description: 'Lista de nomes de município',
    schema: { example: OPENAPI_EXAMPLES.municipios },
  })
  listMunicipios(@Query() query: ListMunicipiosQueryDto) {
    return this.geoService.listMunicipios(query.uf);
  }
}
