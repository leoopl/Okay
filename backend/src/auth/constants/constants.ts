import { registerAs } from '@nestjs/config';

export default registerAs('jwtConstants', () => ({
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN,
}));
