import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { Workflow } from '../workflow/workflow.entity';

@Entity()
export class Session {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ nullable: true })
    name: string;

    @ManyToOne(() => Workflow)
    workflow: Workflow;

    @OneToMany(() => Message, (msg) => msg.session)
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
    content: string;

    // 消息元数据（如引用来源）
    @Column('simple-json', { nullable: true })
    metadata: {
        sourceDocs?: { id: string; content: string; score: number; documentName: string }[];
        nodeIds?: string[];
    };

    @ManyToOne(() => Session, (session) => session.messages)
    session: Session;

    @CreateDateColumn()
    createdAt: Date;
}
