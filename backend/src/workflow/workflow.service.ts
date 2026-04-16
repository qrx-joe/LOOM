import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workflow } from './workflow.entity';
import { WorkflowLog } from './workflow-log.entity';
import { Session, Message } from '../chat/chat.entity';

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(Workflow)
    private workflowRepository: Repository<Workflow>,
    @InjectRepository(WorkflowLog)
    private workflowLogRepository: Repository<WorkflowLog>,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
  ) {}

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

  async remove(id: string) {
    console.log('WorkflowService.remove called with id:', id);
    try {
      // 找到关联的 sessions
      const sessions = await this.sessionRepository.find({
        where: { workflow: { id } },
        relations: ['messages'],
      });

      // 删除关联的 messages
      for (const session of sessions) {
        if (session.messages && session.messages.length > 0) {
          await this.messageRepository.delete({ session: { id: session.id } });
          console.log('Deleted messages for session:', session.id);
        }
      }

      // 删除关联的 sessions
      await this.sessionRepository.delete({ workflow: { id } });
      console.log('Deleted related sessions');

      // 尝试删除关联的日志（表可能不存在）
      try {
        await this.workflowLogRepository.delete({ workflowId: id });
      } catch (logError) {
        console.log(
          'Could not delete logs (table may not exist):',
          logError.message,
        );
      }

      // 删除工作流
      const result = await this.workflowRepository.delete(id);
      console.log('Workflow delete result:', result);
      return result;
    } catch (error) {
      console.error('Error in remove:', error);
      throw error;
    }
  }

  getLogs(workflowId: string) {
    return this.workflowLogRepository.find({
      where: { workflowId },
      order: { startedAt: 'ASC' },
    });
  }
}
