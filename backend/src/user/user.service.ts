import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeleteResult } from 'typeorm';
import { User } from './entities/user.entity';
import { IUser } from './interfaces/user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<IUser> {
    const user = this.usersRepository.create(createUserDto);
    await this.usersRepository.save(user);
    return user;
  }

  async findAll(): Promise<Omit<IUser, 'password'>[]> {
    const users = await this.usersRepository.find();
    return users.map((user) => this.sanitizeUser(user));
  }

  async findOne(id: string): Promise<Omit<IUser, 'password'>> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return this.sanitizeUser(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.usersRepository.findOne({ where: { email } });
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<Omit<IUser, 'password'>> {
    await this.usersRepository.update(id, updateUserDto);
    const updatedUser = await this.findOne(id);
    return updatedUser;
  }

  async remove(id: string): Promise<DeleteResult> {
    return await this.usersRepository.delete(id);
  }

  private sanitizeUser(user: User): Omit<IUser, 'password'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }
}
