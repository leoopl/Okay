/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config();
const { SnakeNamingStrategy } = require('typeorm-naming-strategies');

module.exports = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  // Path configurations
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/database/migrations/*{.ts,.js}'],

  // Naming strategy
  namingStrategy: new SnakeNamingStrategy(),

  // Extra options
  extra: {
    statement_timeout: 10000,
    min: 2,
    max: 10,
  },

  // CLI configurations for where migration files should be created
  cli: {
    migrationsDir: 'src/database/migrations',
  },
};
