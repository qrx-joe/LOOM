import { Controller, Post, Body, Get, UploadedFile, UseInterceptors, Param } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { KnowledgeService } from './knowledge.service';

@Controller('knowledge')
export class KnowledgeController {
    constructor(private readonly knowledgeService: KnowledgeService) { }

    @Post('bases')
    createBase(@Body() body: { name: string; description?: string }) {
        return this.knowledgeService.createBase(body.name, body.description);
    }

    @Get('bases')
    findAllBases() {
        return this.knowledgeService.findAllBases();
    }

    @Post('bases/:id/upload')
    @UseInterceptors(FileInterceptor('file'))
    uploadDocument(
        @Param('id') id: string,
        @UploadedFile() file: any,
    ) {
        if (!file) throw new Error('No file uploaded');
        const content = file.buffer.toString('utf-8');
        return this.knowledgeService.processDocument(id, file.originalname, content);
    }

    @Post('search')
    search(@Body() body: { kbId: string; query: string; topK?: number }) {
        return this.knowledgeService.search(body.kbId, body.query, body.topK);
    }
}
