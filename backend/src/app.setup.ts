import { INestApplication, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';

/**
 * Everything that turns a bare Nest app into the Financy API: middleware,
 * validation, CORS and the route prefix. Kept out of main.ts so the e2e tests
 * can apply it without triggering bootstrap(), and shared with them so they
 * exercise the configuration production actually runs under — a CORS origin or
 * a validation rule that only exists in main() is a rule no test can protect.
 */
export function configureApp(app: INestApplication): void {
  // Security middleware
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: corsOrigins(),
    credentials: true,
  });

  // API prefix
  app.setGlobalPrefix('api/v1');
}

/**
 * Origins allowed to call the API from a browser. FRONTEND_URL is what the
 * deployed frontend runs on; the localhost entries keep local development
 * working against either dev-server port.
 */
export function corsOrigins(): string[] {
  const origins = ['http://localhost:3000', 'http://localhost:3001'];

  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }

  return origins;
}
