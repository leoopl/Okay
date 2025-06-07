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
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });
  const configService = app.get(ConfigService);
  const isProduction = configService.get<string>('NODE_ENV') === 'production';

  // Trust proxy for accurate IP addresses
  app.set('trust proxy', 1);

  // Apply security headers with image serving exceptions
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow cross-origin images
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'accounts.google.com'],
          imgSrc: ["'self'", 'data:', 'blob:', '*'], // Allow images from anywhere
          connectSrc: ["'self'", 'accounts.google.com'],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
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

  // app.useGlobalPipes(
  //   new ValidationPipe({
  //     whitelist: true,
  //     forbidNonWhitelisted: true,
  //     transform: true,
  //     transformOptions: {
  //       enableImplicitConversion: false, // Security: explicit conversions only
  //     },
  //     validationError: {
  //       target: false, // Don't expose target object
  //       value: false, // Don't expose values
  //     },
  //     exceptionFactory: (errors) => {
  //       // Sanitize error messages
  //       const messages = errors.map(error => ({
  //         field: error.property,
  //         errors: Object.values(error.constraints || {}),
  //       }));
  //       return new BadRequestException(messages);
  //     },
  //   }),
  // );

  // Set up CORS with security
  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        configService.get<string>('FRONTEND_URL'),
        'http://localhost:3000',
        'http://localhost:3001', // Backend (for file serving)
      ].filter(Boolean);

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-CSRF-Token',
      'X-Requested-With',
      'Range', // Important for image serving
    ],
    exposedHeaders: ['X-CSRF-Token'],
    maxAge: 86400,
  });

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Force HTTPS in production
  if (isProduction) {
    app.use((req, res, next) => {
      if (req.header('x-forwarded-proto') !== 'https') {
        return res.redirect(`https://${req.header('host')}${req.url}`);
      }
      next();
    });
  }

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
      },
      'JWT',
    )
    .addOAuth2(
      {
        type: 'oauth2',
        flows: {
          authorizationCode: {
            authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
            tokenUrl: 'https://oauth2.googleapis.com/token',
            scopes: {
              openid: 'OpenID Connect',
              profile: 'User profile',
              email: 'User email',
            },
          },
        },
      },
      'google',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Disable Swagger in production
  if (!isProduction) {
    SwaggerModule.setup('api/docs', app, document);
  }

  // Apply audit middleware globally using the middleware consumer
  const auditMiddleware = app.get(AuditMiddleware);
  app.use(auditMiddleware.use.bind(auditMiddleware));

  // Start the server
  const port = configService.get<number>('PORT');
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
  if (!isProduction) {
    console.log(`API Documentation: ${await app.getUrl()}/api/docs`);
  }
}
bootstrap();
