import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';

const REFRESH_COOKIE = 'admin_refresh';

@ApiTags('auth')
@Controller('admin/auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto.email, dto.password, dto.totp);
    if ('totpRequired' in result && result.totpRequired) {
      return { totpRequired: true };
    }
    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, admin: result.admin };
  }

  @Public()
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    const { accessToken, refreshToken } = await this.auth.refresh(token);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Public()
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
    return { ok: true };
  }

  private setRefreshCookie(res: Response, token: string) {
    const secure = this.config.get<string>('ADMIN_COOKIE_SECURE') === 'true';
    const maxAge = Number(this.config.get('ADMIN_REFRESH_TTL') ?? 2592000) * 1000;
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure,
      // Cross-site (console on a different origin) needs SameSite=None + Secure.
      sameSite: secure ? 'none' : 'lax',
      path: '/',
      maxAge,
    });
  }
}
