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

  // Apply security headers with image serving exceptions
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow cross-origin images
      contentSecurityPolicy: {
        directives: {
          imgSrc: ["'self'", 'data:', 'blob:', '*'], // Allow images from anywhere
        },
      },
    }),
  );

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

  // Set up CORS for frontend integration with detailed configuration
  app.enableCors({
    origin: [
      configService.get<string>('CORS_ORIGIN'),
      'http://localhost:3000', // Frontend
      'http://localhost:3001', // Backend (for file serving)
    ],
    credentials: true, // Required for cookies
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'X-CSRF-Token',
      'Range', // Important for image serving
    ],
    exposedHeaders: [
      'Authorization',
      'Content-Length',
      'Content-Type',
      'X-File-Key', // Custom debug header
    ],
    maxAge: 86400, // 24 hours
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  });

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Serve static files from uploads directory with proper headers
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setHeaders: (res, path, stat) => {
      // Set CORS headers for static files
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

      // Set appropriate content type based on file extension
      const ext = path.split('.').pop()?.toLowerCase();
      const mimeTypes = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
      };

      if (ext && mimeTypes[ext]) {
        res.setHeader('Content-Type', mimeTypes[ext]);
      }
    },
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
