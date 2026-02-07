import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    @Post('sessions')
    createSession(@Body() body: { workflowId: string; name?: string }) {
        return this.chatService.createSession(body.workflowId, body.name);
    }

    @Get('sessions/:id/messages')
    getMessages(@Param('id') id: string) {
        return this.chatService.getMessages(id);
    }

    @Post('sessions/:id/messages')
    sendMessage(
        @Param('id') id: string,
        @Body() body: { content: string },
    ) {
        return this.chatService.sendMessage(id, body.content);
    }
}
