import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { EmployeesService } from '../employees/employees.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private employeesService: EmployeesService,
    private jwtService: JwtService,
  ) {}

  async validateUser(identifier: string, pass: string): Promise<any> {
    console.log(`Validating user: ${identifier}`);
    try {
      let user;
      
      // Check if identifier is CPF (simple check: 11 digits numbers only)
      // If the input has formatting like 111.222.333-44, we clean it.
      // If it's an email, cleaning might remove chars but length check should distinguish.
      const cleanIdentifier = identifier.replace(/\D/g, '');
      
      // Basic heuristic: if it looks like a CPF (11 digits) and wasn't an email structure
      const isEmail = identifier.includes('@');
      
      if (!isEmail && cleanIdentifier.length === 11) {
          const employee = await this.employeesService.findByCpf(cleanIdentifier);
          if (employee) {
              user = await this.usersService.findByEmployeeId(employee.id);
          }
      }

      // Fallback to email search if not found via CPF
      if (!user) {
          user = await this.usersService.findOne(identifier);
      }

      if (!user) {
          console.warn(`User not found: ${identifier}`);
          return null;
      }
      
      const isPasswordValid = await bcrypt.compare(pass, user.password);
      if (user && isPasswordValid) {
        console.log(`User validated successfully: ${user.email}`);
        const { password, ...result } = user;
        return result;
      }
      console.warn(`Invalid password for user: ${user.email}`);
      return null;
    } catch (err) {
        console.error(`Error validating user ${identifier}:`, err);
        return null;
    }
  }

  async login(user: any) {
    console.log(`Logging in user: ${user.email}`);
    
    const sessionId = randomUUID();
    await this.usersService.updateSession(user.id, sessionId);

    const payload = { 
      username: user.email, 
      email: user.email,
      sub: user.id, 
      sessionId: sessionId,
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
