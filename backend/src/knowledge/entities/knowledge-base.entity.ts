import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { KnowledgeDocument } from './knowledge-document.entity';

@Entity()
export class KnowledgeBase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @OneToMany(() => KnowledgeDocument, (doc) => doc.knowledgeBase, {
    cascade: true,
  })
  documents: KnowledgeDocument[];

  @CreateDateColumn()
  createdAt: Date;
}
