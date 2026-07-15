import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { UsageService } from './usage.service';

@ApiTags('Usage')
@ApiBearerAuth()
@Controller('me/usage')
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get()
  @ApiOperation({ summary: 'Uso da API do usuário (quota e série)' })
  getUsage(
    @CurrentUser() user: User,
    @Query('days') days?: string,
  ) {
    const parsed = Number(days);
    const window = Number.isFinite(parsed)
      ? Math.min(Math.max(parsed, 1), 90)
      : 30;
    return this.usageService.getSummary(user.id, window);
  }
}
