import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn } from 'typeorm';
import { KnowledgeBase } from './knowledge-base.entity';
import { KnowledgeChunk } from './knowledge-chunk.entity';

export type ProcessingStatus = 'pending' | 'parsing' | 'chunking' | 'embedding' | 'completed' | 'failed';

@Entity()
export class KnowledgeDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  filePath: string;

  @Column({ nullable: true })
  mimeType: string;

  @Column({ type: 'integer', nullable: true })
  fileSize: number;

  @Column({ type: 'simple-json', nullable: true })
  metadata: {
    pageCount?: number;
    wordCount?: number;
    format?: string;
  };

  @Column({ type: 'varchar', default: 'pending' })
  processingStatus: ProcessingStatus;

  @Column({ type: 'integer', default: 0 })
  progress: number;

  @Column({ nullable: true })
  errorMessage: string;

  @ManyToOne(() => KnowledgeBase, kb => kb.documents, { onDelete: 'CASCADE' })
  knowledgeBase: KnowledgeBase;

  @OneToMany(() => KnowledgeChunk, chunk => chunk.document, { cascade: true })
  chunks: KnowledgeChunk[];

  @CreateDateColumn()
  createdAt: Date;
}
