import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      // Lấy token từ header Authorization: Bearer <token>
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Dùng lại cái secret key trong file .env
      secretOrKey: configService.get<string>('JWT_SECRET')!, 
    });
  }

  // Hàm này tự động chạy nếu Token hợp lệ. 
  // Nó sẽ bóc tách payload (sub, email, role) mà ta đã nhét vào lúc đăng nhập.
  async validate(payload: any) {
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}