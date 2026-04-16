import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeBase, KnowledgeDocument, KnowledgeChunk } from './entities';
import {
  KnowledgeBaseService,
  EmbeddingService,
  ChunkingService,
  DocumentProcessorService,
  SearchService,
} from './services';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      KnowledgeBase,
      KnowledgeDocument,
      KnowledgeChunk,
    ]),
  ],
  controllers: [KnowledgeController],
  providers: [
    KnowledgeBaseService,
    EmbeddingService,
    ChunkingService,
    DocumentProcessorService,
    SearchService,
  ],
  exports: [
    KnowledgeBaseService,
    SearchService,
    EmbeddingService,
    ChunkingService,
    DocumentProcessorService,
  ],
})
export class KnowledgeModule {}
