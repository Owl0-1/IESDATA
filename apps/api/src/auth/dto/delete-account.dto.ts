import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class DeleteAccountDto {
  @ApiProperty({ description: 'Senha atual para confirmar exclusão' })
  @IsString()
  @MinLength(8)
  currentPassword!: string;
}
