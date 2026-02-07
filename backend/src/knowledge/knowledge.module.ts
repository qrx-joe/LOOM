import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeBase, KnowledgeDocument, KnowledgeChunk } from './knowledge.entity';

@Module({
    imports: [TypeOrmModule.forFeature([KnowledgeBase, KnowledgeDocument, KnowledgeChunk])],
    controllers: [KnowledgeController],
    providers: [KnowledgeService],
    exports: [KnowledgeService],
})
export class KnowledgeModule { }
