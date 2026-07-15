import { Body, Controller, Delete, Get, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { ChangeEmailDto } from './dto/change-email.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { User } from '../users/entities/user.entity';

@ApiTags('Auth')
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('auth/register')
  @ApiOperation({ summary: 'Registrar desenvolvedor' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('auth/login')
  @ApiOperation({ summary: 'Login' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('auth/refresh')
  @ApiOperation({ summary: 'Renovar access token' })
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Perfil do usuário autenticado' })
  me(@CurrentUser() user: User) {
    return this.authService.me(user);
  }

  @ApiBearerAuth()
  @Patch('me/email')
  @ApiOperation({ summary: 'Alterar e-mail da conta' })
  changeEmail(@CurrentUser() user: User, @Body() dto: ChangeEmailDto) {
    return this.authService.changeEmail(user, dto);
  }

  @ApiBearerAuth()
  @Patch('me/password')
  @ApiOperation({ summary: 'Alterar senha da conta' })
  changePassword(@CurrentUser() user: User, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user, dto);
  }

  @ApiBearerAuth()
  @Delete('me')
  @ApiOperation({ summary: 'Excluir conta permanentemente' })
  deleteAccount(@CurrentUser() user: User, @Body() dto: DeleteAccountDto) {
    return this.authService.deleteAccount(user, dto.currentPassword);
  }
}
