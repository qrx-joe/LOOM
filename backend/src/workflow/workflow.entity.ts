import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class Workflow {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column('simple-json')
    nodes: any[];

    @Column('simple-json')
    edges: any[];

    @CreateDateColumn()
    createdAt: Date;
}
