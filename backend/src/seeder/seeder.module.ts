import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeederService } from './seeder.service';
import { Workflow } from '../workflow/workflow.entity';
import {
  KnowledgeBase,
  KnowledgeDocument,
  KnowledgeChunk,
} from '../knowledge/knowledge.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Workflow,
      KnowledgeBase,
      KnowledgeDocument,
      KnowledgeChunk,
    ]),
  ],
  providers: [SeederService],
})
export class SeederModule {}
