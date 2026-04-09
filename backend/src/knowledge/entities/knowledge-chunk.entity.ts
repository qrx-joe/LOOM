import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { KnowledgeDocument } from './knowledge-document.entity';

@Entity()
export class KnowledgeChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'simple-json', nullable: true })
  embedding: number[];

  @Column({ nullable: true })
  embeddingModel: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata: {
    startIndex: number;
    endIndex: number;
  };

  @ManyToOne(() => KnowledgeDocument, doc => doc.chunks, { onDelete: 'CASCADE' })
  document: KnowledgeDocument;

  @CreateDateColumn()
  createdAt: Date;
}
