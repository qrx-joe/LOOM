import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany } from 'typeorm';

@Entity()
export class KnowledgeBase {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    description: string;

    @OneToMany(() => KnowledgeDocument, (doc) => doc.knowledgeBase)
    documents: KnowledgeDocument[];

    @CreateDateColumn()
    createdAt: Date;
}

@Entity()
export class KnowledgeDocument {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    filePath: string;

    @ManyToOne(() => KnowledgeBase, (kb) => kb.documents)
    knowledgeBase: KnowledgeBase;

    @OneToMany(() => KnowledgeChunk, (chunk) => chunk.document)
    chunks: KnowledgeChunk[];

    @CreateDateColumn()
    createdAt: Date;
}

@Entity()
export class KnowledgeChunk {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('text')
    content: string;

    @Column('simple-json')
    embedding: number[];

    @ManyToOne(() => KnowledgeDocument, (doc) => doc.chunks)
    document: KnowledgeDocument;

    @CreateDateColumn()
    createdAt: Date;
}
