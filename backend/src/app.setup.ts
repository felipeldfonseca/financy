import { ClassSerializerInterceptor, INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost, Reflector } from '@nestjs/core';
import helmet from 'helmet';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import { SentryExceptionFilter } from './monitoring/sentry-exception.filter';

/**
 * Everything that turns a bare Nest app into the Financy API: middleware,
 * validation, CORS and the route prefix. Kept out of main.ts so the e2e tests
 * can apply it without triggering bootstrap(), and shared with them so they
 * exercise the configuration production actually runs under — a CORS origin or
 * a validation rule that only exists in main() is a rule no test can protect.
 */
export function configureApp(app: INestApplication): void {
  // Behind the hosting platform's proxy every request arrives from the same
  // address, so without this the rate limiter would count all users as one
  // client and start rejecting real traffic.
  //
  // The value must stay 1 — exactly one hop. Express then reads only the entry
  // the proxy in front of us appended, which is the real client. Raising it
  // (or using `true`) would trust entries the client itself can put in
  // X-Forwarded-For, letting an attacker rotate a fake address and slip past
  // every limit. The rate-limiting e2e suite fails if this is loosened.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

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

  // Applies the @Exclude() markers on entities when they are serialised.
  // Without it those markers are inert decoration: any endpoint returning an
  // entity that carries a User relation was sending the password hash along
  // with it.
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Unexpected errors and 5xx go to Sentry (when configured); every response
  // stays exactly what the default filter would have produced.
  app.useGlobalFilters(new SentryExceptionFilter(app.get(HttpAdapterHost).httpAdapter));

  app.enableCors({
    origin: corsOrigins(),
    credentials: true,
  });

  // API prefix
  app.setGlobalPrefix('api/v1');
}

/**
 * Origins allowed to call the API from a browser. FRONTEND_URL is the one
 * canonical address of the deployed frontend — links in invitation emails and
 * bot messages are built from it. EXTRA_CORS_ORIGINS (comma-separated) admits
 * origins that must keep working without being canonical: after a move to a
 * custom domain the old .vercel.app address stays live and stays printed in
 * every invitation email already delivered, so it has to remain callable. The
 * localhost entries keep local development working against either dev-server
 * port.
 */
export function corsOrigins(): string[] {
  const origins = ['http://localhost:3000', 'http://localhost:3001'];

  const configured = [
    process.env.FRONTEND_URL ?? '',
    ...(process.env.EXTRA_CORS_ORIGINS ?? '').split(','),
  ];

  for (const entry of configured) {
    // Browsers send the Origin header without a trailing slash, so a pasted
    // value carrying one would silently never match.
    const origin = entry.trim().replace(/\/+$/, '');
    if (origin && !origins.includes(origin)) {
      origins.push(origin);
    }
  }

  return origins;
}
