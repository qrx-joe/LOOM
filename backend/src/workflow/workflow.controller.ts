import { Controller, Post, Body, Get, Param, Put, Delete } from '@nestjs/common';
import { ExecutorService } from './executor.service';
import { WorkflowService } from './workflow.service';
import { Workflow } from './workflow.entity';
import { WorkflowDefinition } from './interfaces/workflow.interface';

@Controller('workflows')
export class WorkflowController {
    constructor(
        private readonly executorService: ExecutorService,
        private readonly workflowService: WorkflowService,
    ) { }

    @Get()
    findAll() {
        return this.workflowService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.workflowService.findOne(id);
    }

    @Post()
    create(@Body() workflowData: Partial<Workflow>) {
        return this.workflowService.create(workflowData);
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() workflowData: Partial<Workflow>) {
        return this.workflowService.update(id, workflowData);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.workflowService.remove(id);
    }

    @Post(':id/run')
    async run(@Param('id') id: string) {
        const workflow = await this.workflowService.findOne(id);
        if (!workflow) throw new Error('Workflow not found');

        // 适配接口
        const definition: WorkflowDefinition = {
            id: workflow.id,
            name: workflow.name,
            nodes: workflow.nodes,
            edges: workflow.edges,
        };

        return await this.executorService.runWorkflow(definition);
    }

    // 临时：直接运行未保存的图
    @Post('run-preview')
    async runPreview(@Body() workflow: WorkflowDefinition) {
        return await this.executorService.runWorkflow(workflow);
    }
}
