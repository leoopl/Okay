import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

export default registerAs('database', (): TypeOrmModuleOptions => {
  return {
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    // Entities and migrations
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],

    // Development settings
    synchronize: process.env.NODE_ENV === 'development',
    logging: process.env.DB_LOGGING === 'true',

    // Naming strategy - convert camelCase to snake_case in DB
    namingStrategy: new SnakeNamingStrategy(),

    // Extra options passed to the PostgreSQL driver
    extra: {
      // 10 second timeout
      statement_timeout: 10000,
      // Connection pool settings
      min: 2,
      max: 10,
    },
  };
});
