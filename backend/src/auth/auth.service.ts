import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { IUser } from 'src/user/interfaces/user.interface';
import { UserService } from 'src/user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async register(
    createUSerDto: CreateUserDto,
  ): Promise<{ access_token: string }> {
    const existingUSer = await this.userService.findByEmail(
      createUSerDto.email,
    );
    if (existingUSer) {
      throw new ConflictException('Email already exists');
    }
    const user = await this.userService.create(createUSerDto);
    return this.signIn(user);
  }

  async validateUser(email: string, password: string): Promise<IUser | null> {
    const user = await this.userService.findByEmail(email);

    bcrypt.compare(password, user.password, function (err, result) {
      if (!result) {
        throw new UnauthorizedException('Invalid credentials');
      }
    });
    return user;
  }

  async signIn(user: IUser) {
    const playload = { sub: user.id, email: user.email };
    return { access_token: await this.jwtService.sign(playload) };
  }
}
