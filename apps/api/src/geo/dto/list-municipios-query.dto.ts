import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ListMunicipiosQueryDto {
  @ApiProperty({ example: 'SP' })
  @IsString()
  @Length(2, 2)
  uf!: string;
}
