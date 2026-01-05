import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

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
    return this.usersRepository.save(newUser);
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
