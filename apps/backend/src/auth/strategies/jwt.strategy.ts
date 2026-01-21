import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'super-secret-key-123',
    });
  }

  async validate(payload: any) {
    console.log('JWT Strategy Validate Payload:', payload);
    if (!payload) {
        console.error('JWT Validation Failed: Payload is null or undefined');
        throw new UnauthorizedException('Token inválido ou expirado');
    }
    // Check if user still exists in DB? Usually not needed for JWT but good for security
    // For now, let's just log success
    return { 
      userId: payload.sub, 
      username: payload.username, 
      role: payload.role,
      employee: payload.employee 
    };
  }
}
