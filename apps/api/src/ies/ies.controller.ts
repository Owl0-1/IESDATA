import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiKeyRoute } from '../api-keys/decorators/api-key-route.decorator';
import { OPENAPI_EXAMPLES } from '../common/openapi-examples';
import { ListIesQueryDto } from './dto/list-ies-query.dto';
import { IesService } from './ies.service';

@ApiTags('v1 / IES')
@ApiSecurity('api-key')
@ApiKeyRoute()
@Throttle({ default: { limit: 120, ttl: 60000 } })
@Controller('v1/ies')
export class IesController {
  constructor(private readonly iesService: IesService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar IES',
    description:
      'Filtre por UF+município (obrigatórios) ou por CNPJ da mantenedora (opcional; com CNPJ, UF/município passam a ser opcionais).',
  })
  @ApiOkResponse({
    description: 'Lista paginada de IES',
    schema: { example: OPENAPI_EXAMPLES.iesPage },
  })
  list(@Query() query: ListIesQueryDto) {
    return this.iesService.list(query);
  }

  @Get('by-cnpj/:cnpj')
  @ApiOperation({ summary: 'Buscar IES pelo CNPJ da mantenedora' })
  @ApiParam({
    name: 'cnpj',
    example: '30831606000130',
    description: 'CNPJ com ou sem máscara',
  })
  @ApiOkResponse({
    description: 'IES vinculadas ao CNPJ da mantenedora',
    schema: { example: OPENAPI_EXAMPLES.iesByCnpj },
  })
  getByCnpj(@Param('cnpj') cnpj: string) {
    return this.iesService.getByCnpj(cnpj);
  }

  @Get(':coIes')
  @ApiOperation({ summary: 'Detalhe de IES por CO_IES' })
  @ApiOkResponse({
    description: 'Detalhe da IES',
    schema: { example: OPENAPI_EXAMPLES.iesDetail },
  })
  get(@Param('coIes', ParseIntPipe) coIes: number) {
    return this.iesService.getByCoIes(coIes);
  }
}
