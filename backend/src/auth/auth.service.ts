import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { IUser } from 'src/user/interfaces/user.interface';
import { UserService } from 'src/user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    const existingUser = await this.userService.findByEmail(
      createUserDto.email,
    );
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }
    const user = await this.userService.create(createUserDto);
    return this.signIn(user);
  }

  async validateUser(
    email: string,
    pass: string,
  ): Promise<Omit<IUser, 'password'>> {
    const user = await this.userService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await argon2.verify(user.password, pass);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  async signIn(user: Partial<IUser>) {
    const payload = { sub: user.id, email: user.email };
    const access_token = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refresh_token = this.jwtService.sign(payload, { expiresIn: '7d' });
    return { access_token, refresh_token };
  }

  async refresh(refresh_token: string) {
    try {
      const payload = this.jwtService.verify(refresh_token);
      const user = await this.userService.findByEmail(payload.email);
      if (!user) {
        throw new UnauthorizedException();
      }

      return this.signIn(user);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
