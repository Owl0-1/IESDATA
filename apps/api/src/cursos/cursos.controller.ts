import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiKeyRoute } from '../api-keys/decorators/api-key-route.decorator';
import { OPENAPI_EXAMPLES } from '../common/openapi-examples';
import { CursosService } from './cursos.service';
import {
  ListCursosByIesQueryDto,
  ListCursosQueryDto,
} from './dto/list-cursos-query.dto';

@ApiTags('v1 / Cursos')
@ApiSecurity('api-key')
@ApiKeyRoute()
@Throttle({ default: { limit: 120, ttl: 60000 } })
@Controller('v1')
export class CursosController {
  constructor(private readonly cursosService: CursosService) {}

  @Get('ies/:coIes/cursos')
  @ApiOperation({ summary: 'Listar cursos de uma IES' })
  @ApiOkResponse({
    description: 'Lista paginada de cursos',
    schema: { example: OPENAPI_EXAMPLES.cursosPage },
  })
  listByIes(
    @Param('coIes', ParseIntPipe) coIes: number,
    @Query() query: ListCursosByIesQueryDto,
  ) {
    return this.cursosService.listByIes(coIes, query);
  }

  @Get('cursos')
  @ApiOperation({ summary: 'Listar cursos (exige coIes)' })
  @ApiOkResponse({
    description: 'Lista paginada de cursos',
    schema: { example: OPENAPI_EXAMPLES.cursosPage },
  })
  list(@Query() query: ListCursosQueryDto) {
    return this.cursosService.list(query);
  }
}
