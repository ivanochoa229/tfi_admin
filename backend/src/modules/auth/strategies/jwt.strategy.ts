import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'super-secret-key'
    });
  }

  async validate(payload: any) {
    return {
      id: payload.sub,
      roleId: payload.roleId,
      roleName: payload.role,
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email
    };
  }
}