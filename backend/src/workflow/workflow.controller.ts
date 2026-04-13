import { Controller, Post, Body, Get, Param, Put, Delete, Res, Query } from '@nestjs/common';
import type { Response } from 'express';
import { ExecutorService, WorkflowEvent } from './executor.service';
import { WorkflowService } from './workflow.service';
import { Workflow } from './workflow.entity';
import type { WorkflowDefinition } from './interfaces/workflow.interface';

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
    async create(@Body() workflowData: Partial<Workflow>) {
        try {
            console.log('Creating workflow with data:', JSON.stringify(workflowData, null, 2));
            const result = await this.workflowService.create(workflowData);
            console.log('Workflow created successfully:', result.id);
            return result;
        } catch (error) {
            console.error('Failed to create workflow:', error);
            throw error;
        }
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() workflowData: Partial<Workflow>) {
        try {
            console.log('Updating workflow:', id, 'with data:', JSON.stringify(workflowData, null, 2));
            const result = await this.workflowService.update(id, workflowData);
            console.log('Workflow updated successfully:', id);
            return result;
        } catch (error) {
            console.error('Failed to update workflow:', id, error);
            throw error;
        }
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        try {
            return await this.workflowService.remove(id);
        } catch (error) {
            console.error('Delete workflow error:', error);
            throw error;
        }
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

    // SSE: 工作流执行并实时推送状态
    @Get(':id/run-stream')
    async runStream(
        @Param('id') id: string,
        @Query('input') input: string,
        @Res() res: Response,
    ) {
        const workflow = await this.workflowService.findOne(id);
        if (!workflow) {
            res.status(404).json({ error: 'Workflow not found' });
            return;
        }

        const definition: WorkflowDefinition = {
            id: workflow.id,
            name: workflow.name,
            nodes: workflow.nodes,
            edges: workflow.edges,
        };

        // 解析输入
        const initialInput = input ? { input } : {};

        // 设置 SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.flushHeaders();

        // 定义事件回调
        const sendEvent = (event: WorkflowEvent) => {
            res.write(`data: ${JSON.stringify(event)}\n\n`);
        };

        // 执行工作流，传入回调
        try {
            await this.executorService.runWorkflow(definition, initialInput, sendEvent);
        } catch (error: any) {
            sendEvent({
                type: 'workflow_complete',
                nodeId: 'workflow',
                data: { status: 'error', error: error.message },
                timestamp: Date.now(),
            });
        }

        // 完成后关闭连接
        res.end();
    }

    // 获取工作流执行日志
    @Get(':id/logs')
    getLogs(@Param('id') id: string) {
        return this.workflowService.getLogs(id);
    }

    // 临时：直接运行未保存的图
    @Post('run-preview')
    async runPreview(@Body() workflow: WorkflowDefinition) {
        return await this.executorService.runWorkflow(workflow);
    }
}
