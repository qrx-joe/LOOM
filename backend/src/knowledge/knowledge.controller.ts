import {
  Controller,
  Post,
  Body,
  Get,
  UploadedFile,
  UseInterceptors,
  Param,
  Delete,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { KnowledgeBaseService } from './services/knowledge-base.service';
import { SearchService } from './services/search.service';
import { DEFAULT_SEARCH_CONFIG } from './interfaces';

@Controller('knowledge')
export class KnowledgeController {
  constructor(
    private readonly knowledgeBaseService: KnowledgeBaseService,
    private readonly searchService: SearchService,
  ) {}

  // ==================== 知识库管理 ====================

  @Post('bases')
  createBase(@Body() body: { name: string; description?: string }) {
    return this.knowledgeBaseService.createBase(body.name, body.description);
  }

  @Get('bases')
  findAllBases() {
    return this.knowledgeBaseService.findAllBases();
  }

  @Get('bases/:id')
  async findBase(@Param('id') id: string) {
    const kb = await this.knowledgeBaseService.findBaseById(id);
    if (!kb) throw new NotFoundException('Knowledge Base not found');
    return kb;
  }

  @Delete('bases/:id')
  deleteBase(@Param('id') id: string) {
    return this.knowledgeBaseService.deleteBase(id);
  }

  @Get('stats')
  getStats() {
    return this.knowledgeBaseService.getStats();
  }

  // ==================== 文档管理 ====================

  @Post('bases/:id/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: any,
  ) {
    if (!file) throw new Error('No file uploaded');

    return this.knowledgeBaseService.processDocument(
      id,
      file.originalname,
      file.buffer,
      file.mimetype,
    );
  }

  @Delete('documents/:id')
  deleteDocument(@Param('id') id: string) {
    return this.knowledgeBaseService.deleteDocument(id);
  }

  @Get('documents/:id/status')
  getDocumentStatus(@Param('id') id: string) {
    return this.knowledgeBaseService.getDocumentStatus(id);
  }

  // ==================== 检索 ====================

  @Post('search')
  async search(@Body() body: { kbId: string; query: string; topK?: number }) {
    const config = { ...DEFAULT_SEARCH_CONFIG, topK: body.topK || DEFAULT_SEARCH_CONFIG.topK };
    return this.searchService.search(body.kbId, body.query, config);
  }
}
