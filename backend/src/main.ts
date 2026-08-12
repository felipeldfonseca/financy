import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { initSentry } from './monitoring/sentry';

async function bootstrap() {
  const sentryEnabled = initSentry();
  console.log(
    sentryEnabled
      ? '🛰️  Sentry error monitoring enabled'
      : 'ℹ️  Sentry disabled (set SENTRY_DSN to enable error monitoring)',
  );

  const app = await NestFactory.create(AppModule);

  configureApp(app);

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
