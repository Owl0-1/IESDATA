import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class ChangeEmailDto {
  @ApiProperty({ example: 'novo@email.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Senha atual para confirmar' })
  @IsString()
  @MinLength(8)
  currentPassword!: string;
}
