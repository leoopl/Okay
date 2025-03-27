import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import { AuditMiddleware } from './common/middleware/audit.middleware';

async function bootstrap() {
  // Create NestJS app
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });
  const configService = app.get(ConfigService);

  // Apply security headers
  app.use(helmet());

  // Apply compression for better performance
  app.use(compression());

  // Parse cookies for Auth0 integration
  app.use(cookieParser(configService.get<string>('COOKIE_SECRET')));

  // Apply global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Set up CORS for frontend integration
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Set up Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('Okay Mental Health API')
    .setDescription('API documentation for the Okay Mental Health PWA')
    .setVersion('1.0')
    .addTag('health')
    .addTag('users')
    .addTag('journal')
    .addTag('inventories')
    .addTag('authentication')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
      },
      'JWT',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Apply audit middleware globally using the middleware consumer
  const auditMiddleware = app.get(AuditMiddleware);
  app.use(auditMiddleware.use.bind(auditMiddleware));

  // Start the server
  const port = configService.get<number>('PORT', 3001);
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`API Documentation: ${await app.getUrl()}/api/docs`);
}
bootstrap();
