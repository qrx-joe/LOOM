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
  Patch,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { KnowledgeBaseService } from './services/knowledge-base.service';
import { SearchService } from './services/search.service';
import { DEFAULT_SEARCH_CONFIG } from './interfaces';

// 修复中文文件名编码问题
function decodeFilename(filename: string): string {
  try {
    // 尝试修复 latin1 -> utf8 的编码问题
    return Buffer.from(filename, 'latin1').toString('utf8');
  } catch {
    return filename;
  }
}

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

  @Patch('bases/:id')
  updateBase(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string },
  ) {
    return this.knowledgeBaseService.updateBase(
      id,
      body.name,
      body.description,
    );
  }

  @Get('stats')
  getStats() {
    return this.knowledgeBaseService.getStats();
  }

  // ==================== 文档管理 ====================

  @Post('bases/:id/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB 文件大小限制
      },
    }),
  )
  async uploadDocument(@Param('id') id: string, @UploadedFile() file: any) {
    if (!file) throw new Error('No file uploaded');

    // 修复中文文件名编码
    const filename = decodeFilename(file.originalname);

    console.log(
      `[Upload] File: ${filename}, Size: ${file.size}, MimeType: ${file.mimetype}`,
    );

    return this.knowledgeBaseService.processDocument(
      id,
      filename,
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

  @Get('documents/:id/content')
  async getDocumentContent(@Param('id') id: string) {
    return this.knowledgeBaseService.getDocumentContent(id);
  }

  // ==================== 检索 ====================

  @Post('search')
  async search(@Body() body: { kbId: string; query: string; topK?: number }) {
    const config = {
      ...DEFAULT_SEARCH_CONFIG,
      topK: body.topK || DEFAULT_SEARCH_CONFIG.topK,
    };
    return this.searchService.search(body.kbId, body.query, config);
  }
}
