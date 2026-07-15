import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@ApiTags('API Keys')
@ApiBearerAuth()
@Controller('me/api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Get()
  @ApiOperation({ summary: 'Listar API keys do usuário' })
  list(@CurrentUser() user: User) {
    return this.apiKeysService.list(user.id);
  }

  @Post()
  @ApiOperation({
    summary: 'Criar API key',
    description: 'Retorna a key completa; ela também fica disponível na listagem.',
  })
  create(@CurrentUser() user: User, @Body() dto: CreateApiKeyDto) {
    return this.apiKeysService.create(user, dto.name);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revogar API key' })
  revoke(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.apiKeysService.revoke(user.id, id);
  }
}
