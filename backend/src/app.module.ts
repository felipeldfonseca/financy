import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { redisStore } from 'cache-manager-redis-store';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TransactionsModule } from './transactions/transactions.module';
import { ContextsModule } from './contexts/contexts.module';
import { TelegramModule } from './telegram/telegram.module';
import { CurrencyModule } from './currency/currency.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { typeOrmConfig } from './config/typeorm.config';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development', '.env'],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: typeOrmConfig,
      inject: [ConfigService],
    }),

    // Redis Cache (conditional - only if Redis is available)
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get('REDIS_URL');
        const redisHost = configService.get('REDIS_HOST');
        
        // If no Redis configuration, use in-memory cache
        if (!redisUrl && !redisHost) {
          return {
            ttl: 300, // 5 minutes default TTL
          };
        }
        
        // Use Redis if available
        return {
          store: redisStore as any,
          url: redisUrl,
          host: redisHost || 'localhost',
          port: configService.get('REDIS_PORT', 6379),
          ttl: 300, // 5 minutes default TTL
        };
      },
      inject: [ConfigService],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    // Feature modules
    AuthModule,
    UsersModule,
    TransactionsModule,
    ContextsModule,
    TelegramModule,
    CurrencyModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}