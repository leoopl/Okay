import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

// Load environment variables from .env file
config();

// DataSource configuration
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: ['src/**/*.entity{.ts,.js}'], // Using compiled entities
  migrations: ['src/database/migrations/*{.ts,.js}'], // Using compiled migrations
  synchronize: process.env.NODE_ENV === 'development',
  // synchronize: true,
  logging: process.env.DB_LOGGING === 'true',
  namingStrategy: new SnakeNamingStrategy(),
  extra: {
    statement_timeout: 10000,
    min: 2,
    max: 10,
  },
};

// Create and export the data source
const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
