import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Workflow } from './workflow.entity';

export enum WorkflowLogStatus {
    PENDING = 'PENDING',
    RUNNING = 'RUNNING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
}

@Entity('workflow_logs')
export class WorkflowLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    workflowId: string;

    @Column({ nullable: true })
    nodeId: string;

    @Column({
        type: 'varchar',
        default: WorkflowLogStatus.PENDING,
    })
    status: WorkflowLogStatus;

    @Column('simple-json', { nullable: true })
    inputData: any;

    @Column('simple-json', { nullable: true })
    outputData: any;

    @Column('text', { nullable: true })
    error: string;

    @Column('simple-json', { nullable: true })
    metadata: any;

    @CreateDateColumn()
    startedAt: Date;

    @Column({ type: 'timestamptz', nullable: true })
    completedAt: Date;
}
