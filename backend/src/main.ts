import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  // CORS configuration
  const corsOrigins = ['http://localhost:3000', 'http://localhost:3001'];
  if (process.env.FRONTEND_URL) {
    corsOrigins.push(process.env.FRONTEND_URL);
  }

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger documentation
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Financy API')
      .setDescription('Conversational financial assistant API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 Financy Backend running on port ${port}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  }
}

bootstrap();