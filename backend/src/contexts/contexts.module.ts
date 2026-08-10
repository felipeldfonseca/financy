import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContextsService } from './contexts.service';
import { ContextsController } from './contexts.controller';
import { Context } from './entities/context.entity';
import { ContextMember } from './entities/context-member.entity';
import { User } from '../users/entities/user.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [TypeOrmModule.forFeature([Context, ContextMember, User]), EmailModule],
  controllers: [ContextsController],
  providers: [ContextsService],
  exports: [ContextsService],
})
export class ContextsModule {}