import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  Length,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListIesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'SP',
    description: 'Obrigatório se CNPJ não for informado',
  })
  @ValidateIf((o: ListIesQueryDto) => !o.cnpj?.trim())
  @IsString()
  @Length(2, 2)
  uf?: string;

  @ApiPropertyOptional({
    example: 'São Paulo',
    description: 'Obrigatório se CNPJ não for informado',
  })
  @ValidateIf((o: ListIesQueryDto) => !o.cnpj?.trim())
  @IsString()
  @MinLength(2)
  municipio?: string;

  @ApiPropertyOptional({ description: 'Busca por nome ou sigla' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: '30831606000130',
    description:
      'CNPJ da mantenedora (com ou sem máscara). Quando informado, UF/município são opcionais.',
  })
  @IsOptional()
  @IsString()
  cnpj?: string;
}
