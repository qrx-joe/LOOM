import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Workflow } from '../workflow/workflow.entity';

@Entity()
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  name: string;

  @ManyToOne(() => Workflow)
  workflow: Workflow;

  @OneToMany(() => Message, (msg) => msg.session, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  messages: Message[];

  @CreateDateColumn()
  createdAt: Date;
}

@Entity()
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  role: 'user' | 'assistant' | 'system';

  @Column('text')
  content: string; // 建议应用层限制最大长度 10000 字符

  // 消息元数据（如引用来源）
  @Column('simple-json', { nullable: true })
  metadata: {
    sourceDocs?: {
      id: string;
      content: string;
      score: number;
      documentName: string;
    }[];
    nodeIds?: string[];
  };

  @ManyToOne(() => Session, (session) => session.messages, {
    onDelete: 'CASCADE',
  })
  session: Session;

  @CreateDateColumn()
  createdAt: Date;
}
