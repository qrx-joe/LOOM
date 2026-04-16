import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { Session, Message } from './chat.entity';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [TypeOrmModule.forFeature([Session, Message]), WorkflowModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
