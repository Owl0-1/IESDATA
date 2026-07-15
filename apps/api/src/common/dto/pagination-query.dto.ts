import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  LIST_DEFAULT_LIMIT,
  LIST_DEFAULT_PAGE,
  LIST_MAX_LIMIT,
} from '../pagination';

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: LIST_DEFAULT_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = LIST_DEFAULT_PAGE;

  @ApiPropertyOptional({ default: LIST_DEFAULT_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(LIST_MAX_LIMIT)
  limit: number = LIST_DEFAULT_LIMIT;
}
