/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { IUser } from 'src/user/interfaces/user.interface';
import { UserService } from 'src/user/user.service';
import { IAuthResult, IJwtPayload } from './interfaces/auth.interface';
import crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(createUserDto: CreateUserDto): Promise<IAuthResult> {
    // Check for existing user
    const existingUser = await this.userService.findByEmail(
      createUserDto.email,
    );
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    try {
      // Create the user
      const user = await this.userService.create(createUserDto);

      // Generate tokens but sanitize the user object first
      const { password, ...userWithoutPassword } = user;
      return this.generateTokens(userWithoutPassword);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Registration failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to register user');
    }
  }

  async validateUser(
    email: string,
    pass: string,
  ): Promise<Omit<IUser, 'password'>> {
    const user = await this.userService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password with argon2
    try {
      const isPasswordValid = await argon2.verify(user.password, pass);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Remove password before returning
      const { password, ...result } = user;
      return result;
    } catch (error) {
      this.logger.error(
        `User validation failed: ${error.message}`,
        error.stack,
      );
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  async signIn(user: Partial<IUser>): Promise<IAuthResult> {
    try {
      return this.generateTokens(user);
    } catch (error) {
      this.logger.error(`Login failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to sign in');
    }
  }

  // Inside AuthService class
  async findOrCreateOAuthUser(oauthData: any): Promise<any> {
    // Check if user exists by email
    let user = await this.userService.findByEmail(oauthData.email);

    if (!user) {
      // Create a new user with OAuth data
      user = await this.userService.createOAuthUser({
        email: oauthData.email,
        name: oauthData.firstName,
        surname: oauthData.lastName,
        // Generate a secure random password for OAuth users
        password: this.generateSecurePassword(),
        // Other required fields
        birthdate: new Date(),
      });
    }

    // Return tokens for this user
    return this.signIn(user);
  }

  private generateSecurePassword(): string {
    // Generate a secure random password for OAuth users
    return crypto.randomBytes(32).toString('hex');
  }

  async refresh(refreshToken: string): Promise<IAuthResult> {
    try {
      // Verify the refresh token
      const payload = await this.verifyRefreshToken(refreshToken);
      const user = await this.userService.findByEmail(payload.email);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Generate new tokens
      const { password, ...userWithoutPassword } = user;
      return this.generateTokens(userWithoutPassword);
    } catch (error) {
      this.logger.error(`Token refresh failed: ${error.message}`, error.stack);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // Verify refresh token
  private async verifyRefreshToken(token: string): Promise<IJwtPayload> {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.get<string>('jwtConstants.secret'),
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // Verify a password with argon2
  // private async verifyPassword(
  //   plainPassword: string,
  //   hashedPassword: string,
  // ): Promise<boolean> {
  //   try {
  //     return await argon2.verify(hashedPassword, plainPassword);
  //   } catch (error) {
  //     this.logger.error(
  //       `Password verification failed: ${error.message}`,
  //       error.stack,
  //     );
  //     return false;
  //   }
  // }

  // Helper method to generate both access and refresh tokens
  private generateTokens(user: Partial<IUser>) {
    const payload: IJwtPayload = { sub: user.id, email: user.email };

    return {
      access_token: this.jwtService.sign(payload, {
        expiresIn: '15m',
        secret: this.configService.get<string>('jwtConstants.secret'),
      }),
      refresh_token: this.jwtService.sign(payload, {
        expiresIn: '7d',
        secret: this.configService.get<string>('jwtConstants.secret'),
      }),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }
}
