import { Injectable, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    const count = await this.usersRepository.count();
    if (count === 0) {
      const defaultEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@ayratech.app.br';
      const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
      const existing = await this.usersRepository.findOne({ where: { email: defaultEmail } });
      if (!existing) {
        await this.create({ email: defaultEmail, password: defaultPassword, status: 'active' });
        // No logs
      }
    }
  }

  async findOne(email: string): Promise<User | undefined> {
    return this.usersRepository.findOne({ 
      where: { email },
      relations: ['role', 'employee']
    });
  }

  async findById(id: string): Promise<User | undefined> {
    return this.usersRepository.findOne({ 
      where: { id },
      relations: ['role', 'employee']
    });
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({ relations: ['role', 'employee'] });
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(createUserDto.password || '123456', salt);
    const newUser = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });
    try {
      return await this.usersRepository.save(newUser);
    } catch (err: any) {
      if (err?.code === '23505') {
        throw new BadRequestException('Email já cadastrado');
      }
      throw err;
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<any> {
    if (updateUserDto.password) {
      const salt = await bcrypt.genSalt();
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, salt);
    }
    return this.usersRepository.update(id, updateUserDto);
  }

  async remove(id: string): Promise<any> {
    return this.usersRepository.delete(id);
  }
}
