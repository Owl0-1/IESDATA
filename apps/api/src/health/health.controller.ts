import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'Healthcheck da API' })
  check() {
    return {
      status: 'ok',
      service: 'iesdata-api',
      timestamp: new Date().toISOString(),
    };
  }
}
