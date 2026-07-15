import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { ChangeEmailDto } from './dto/change-email.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import {
  AccessTokenPayload,
  RefreshTokenPayload,
} from './jwt-payload';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.usersRepo.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const user = this.usersRepo.create({
      name: dto.name.trim(),
      email,
      passwordHash: await bcrypt.hash(dto.password, 12),
    });
    await this.usersRepo.save(user);
    return this.issueTokens(user);
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.usersRepo.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string) {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }
    if (payload.typ !== 'refresh') {
      throw new UnauthorizedException('Refresh token inválido');
    }
    const user = await this.usersRepo.findOne({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }
    return this.issueTokens(user);
  }

  me(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  async changeEmail(user: User, dto: ChangeEmailDto) {
    await this.assertPassword(user, dto.currentPassword);
    const email = dto.email.trim().toLowerCase();
    if (email === user.email) {
      throw new BadRequestException('O novo e-mail é igual ao atual');
    }
    const existing = await this.usersRepo.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('E-mail já cadastrado');
    }
    user.email = email;
    await this.usersRepo.save(user);
    return this.issueTokens(user);
  }

  async changePassword(user: User, dto: ChangePasswordDto) {
    await this.assertPassword(user, dto.currentPassword);
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('A nova senha deve ser diferente da atual');
    }
    user.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.usersRepo.save(user);
    return this.issueTokens(user);
  }

  async deleteAccount(user: User, currentPassword: string) {
    await this.assertPassword(user, currentPassword);
    await this.usersRepo.remove(user);
    return { deleted: true as const };
  }

  private async assertPassword(user: User, password: string) {
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Senha atual inválida');
    }
  }

  private async issueTokens(user: User) {
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      typ: 'access',
    };
    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      typ: 'refresh',
    };

    const accessTtl = this.config.get<string>('JWT_ACCESS_TTL', '1h');
    const refreshTtl = this.config.get<string>('JWT_REFRESH_TTL', '30d');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(accessPayload, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: accessTtl as `${number}${'s' | 'm' | 'h' | 'd'}`,
      }),
      this.jwt.signAsync(refreshPayload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshTtl as `${number}${'s' | 'm' | 'h' | 'd'}`,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      user: this.me(user),
    };
  }
}
