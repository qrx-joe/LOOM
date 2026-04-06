import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workflow } from './workflow.entity';

@Injectable()
export class WorkflowService {
    constructor(
        @InjectRepository(Workflow)
        private workflowRepository: Repository<Workflow>,
    ) { }

    findAll() {
        return this.workflowRepository.find();
    }

    findOne(id: string) {
        return this.workflowRepository.findOneBy({ id });
    }

    create(workflowData: Partial<Workflow>) {
        const workflow = this.workflowRepository.create(workflowData);
        return this.workflowRepository.save(workflow);
    }

    async update(id: string, workflowData: Partial<Workflow>) {
        const workflow = await this.findOne(id);
        if (!workflow) throw new Error('Workflow not found');
        Object.assign(workflow, workflowData);
        return this.workflowRepository.save(workflow);
    }

    remove(id: string) {
        return this.workflowRepository.delete(id);
    }
}
