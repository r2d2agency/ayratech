import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    console.log(`Validating user: ${email}`);
    try {
      const user = await this.usersService.findOne(email);
      if (!user) {
          console.warn(`User not found: ${email}`);
          return null;
      }
      
      const isPasswordValid = await bcrypt.compare(pass, user.password);
      if (user && isPasswordValid) {
        console.log(`User validated successfully: ${email}`);
        const { password, ...result } = user;
        return result;
      }
      console.warn(`Invalid password for user: ${email}`);
      return null;
    } catch (err) {
        console.error(`Error validating user ${email}:`, err);
        return null;
    }
  }

  async login(user: any) {
    console.log(`Logging in user: ${user.email}`);
    const payload = { 
      username: user.email, 
      email: user.email,
      sub: user.id, 
      role: user.role?.name || 'user',
      employee: user.employee ? {
        id: user.employee.id,
        fullName: user.employee.fullName
      } : null
    };
    const token = this.jwtService.sign(payload);
    console.log(`Generated token for ${user.email}: ${token.substring(0, 20)}...`);
    return {
      access_token: token,
      user: payload,
    };
  }
}
