import { Controller, Post, Body, Get, Param, Query, Res, Delete, Patch, HttpCode } from '@nestjs/common';
import type { Response } from 'express';
import { ChatService } from './chat.service';

@Controller('agent')
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    @Get('sessions')
    getSessions() {
        return this.chatService.findAllSessions();
    }

    @Get('sessions/:id')
    getSession(@Param('id') id: string) {
        return this.chatService.findSessionById(id);
    }

    @Post('sessions')
    createSession(@Body() body: { workflowId: string; name?: string }) {
        return this.chatService.createSession(body.workflowId, body.name);
    }

    @Get('sessions/:id/messages')
    getMessages(
        @Param('id') id: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const pageNum = page ? parseInt(page, 10) : 1;
        const limitNum = limit ? parseInt(limit, 10) : 50;
        return this.chatService.getMessages(id, pageNum, limitNum);
    }

    @Post('sessions/:id/messages')
    sendMessage(
        @Param('id') id: string,
        @Body() body: { content: string },
    ) {
        return this.chatService.sendMessage(id, body.content);
    }

    // SSE 流式发送消息
    @Get('sessions/:id/messages/stream')
    async sendMessageStream(
        @Param('id') id: string,
        @Query('content') content: string,
        @Res() res: Response,
    ) {
        // 设置 SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.flushHeaders();

        try {
            await this.chatService.sendMessageStream(id, content || '', (data) => {
                res.write(`data: ${JSON.stringify(data)}\n\n`);
            });
        } catch (error: any) {
            res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`);
        }

        res.end();
    }

    @Delete('sessions/:id')
    deleteSession(@Param('id') id: string) {
        return this.chatService.deleteSession(id);
    }

    @Patch('sessions/:id')
    updateSession(
        @Param('id') id: string,
        @Body() body: { name: string }
    ) {
        return this.chatService.updateSession(id, body.name);
    }

    // 导出会话为 Markdown
    @Get('sessions/:id/export')
    async exportSession(@Param('id') id: string, @Res() res: Response) {
        const markdown = await this.chatService.exportSession(id);
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="session-${id}.md"`);
        res.send(markdown);
    }

    // 重新生成最后一条消息
    @Post('sessions/:id/regenerate')
    @HttpCode(200)
    async regenerateMessage(
        @Param('id') id: string,
        @Res() res: Response,
    ) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.flushHeaders();

        try {
            await this.chatService.regenerateMessage(id, (data) => {
                res.write(`data: ${JSON.stringify(data)}\n\n`);
            });
        } catch (error: any) {
            res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`);
        }

        res.end();
    }
}
