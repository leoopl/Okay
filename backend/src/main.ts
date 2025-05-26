import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import { AuditMiddleware } from './common/middleware/audit.middleware';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
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
    credentials: true, // Required for cookies
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'X-CSRF-Token',
    ],
    exposedHeaders: ['Authorization'],
    maxAge: 86400, // 24 hours
  });

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Serve static files from uploads directory
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

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
    .addTag('medications')
    .addTag('testimonials')
    .addTag('files')
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
  const port = configService.get<number>('PORT');
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`API Documentation: ${await app.getUrl()}/api/docs`);
}
bootstrap();
