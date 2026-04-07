import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExecutorService } from './executor.service';
import { WorkflowController } from './workflow.controller';
import { Workflow } from './workflow.entity';
import { WorkflowLog } from './workflow-log.entity';
import { WorkflowService } from './workflow.service';
import { KnowledgeModule } from '../knowledge/knowledge.module';

@Module({
    imports: [TypeOrmModule.forFeature([Workflow, WorkflowLog]), KnowledgeModule],
    controllers: [WorkflowController],
    providers: [ExecutorService, WorkflowService],
    exports: [ExecutorService, WorkflowService],
})
export class WorkflowModule { }
