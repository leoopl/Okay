import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Request, Response } from 'express';
import { JwtAuthGuard } from './guards/jwt-guard';

interface AuthenticatedRequest extends Request {
  user?: any; // or a more specific type for `user`
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() CreateUserDto: CreateUserDto) {
    return this.authService.register(CreateUserDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('signin')
  async signin(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    const { access_token, refresh_token } = await this.authService.signIn(
      req.user,
    );
    res
      .cookie('access_token', access_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 1000 * 60 * 15,
      })
      .cookie('refresh_token', refresh_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 1000 * 60 * 60 * 24 * 7,
      })
      .send({ message: 'Logged in successfully' });
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res() res: Response) {
    const refresh_token = req.cookies['refresh_token'];
    const { access_token, refresh_token: newRefresh_token } =
      await this.authService.refresh(refresh_token);
    res
      .cookie('access_token', access_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 1000 * 60 * 60 * 15,
      })
      .cookie('refresh_token', newRefresh_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 1000 * 60 * 60 * 24 * 7,
      })
      .send({ message: 'Token refreshed successfully' });
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Res() res: Response) {
    res
      .clearCookie('access_token', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
      })
      .clearCookie('refresh_token', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
      })
      .send({ message: 'Logged out successfully' });
  }
}
