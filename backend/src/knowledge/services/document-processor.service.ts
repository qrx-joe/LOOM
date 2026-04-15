import { Injectable, Logger, BadRequestException } from '@nestjs/common';

export interface ProcessedDocument {
  content: string;
  metadata: {
    pageCount?: number;
    wordCount: number;
    format: string;
  };
}

@Injectable()
export class DocumentProcessorService {
  private readonly logger = new Logger(DocumentProcessorService.name);

  private readonly supportedMimeTypes = [
    'text/plain',
    'text/markdown',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
  ];

  async process(buffer: Buffer, mimeType: string, fileName: string): Promise<ProcessedDocument> {
    // 如果 MIME 类型是通用的 application/octet-stream，尝试从文件扩展名推断
    let detectedMimeType = mimeType;
    if (mimeType === 'application/octet-stream') {
      detectedMimeType = this.detectMimeTypeFromExtension(fileName);
      this.logger.log(`Detected MIME type from extension: ${detectedMimeType} for file: ${fileName}`);
    }

    if (!this.supportedMimeTypes.includes(detectedMimeType)) {
      throw new BadRequestException(`Unsupported file type: ${mimeType} (detected: ${detectedMimeType})`);
    }

    const format = this.getFormatFromMime(detectedMimeType);

    try {
      switch (detectedMimeType) {
        case 'text/plain':
        case 'text/markdown':
          return this.processText(buffer, detectedMimeType);
        case 'application/pdf':
          return this.processPdf(buffer);
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        case 'application/msword':
          return this.processWord(buffer, detectedMimeType);
        default:
          throw new BadRequestException(`Unsupported file type: ${detectedMimeType}`);
      }
    } catch (error) {
      this.logger.error(`Failed to process document ${fileName}: ${error.message}`);
      throw error;
    }
  }

  private async processText(buffer: Buffer, mimeType?: string): Promise<ProcessedDocument> {
    const content = buffer.toString('utf-8');
    const format = mimeType === 'text/markdown' ? 'markdown' : 'text';
    return {
      content,
      metadata: {
        wordCount: this.countWords(content),
        format,
      },
    };
  }

  private async processPdf(buffer: Buffer): Promise<ProcessedDocument> {
    // 动态加载 pdf-parse
    let pdfParse: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      pdfParse = require('pdf-parse');
    } catch (error) {
      this.logger.error('pdf-parse module not installed');
      throw new Error('pdf-parse module not installed. Run: npm install pdf-parse');
    }

    try {
      this.logger.log(`Parsing PDF, buffer size: ${buffer.length} bytes`);
      const data = await pdfParse(buffer);
      const content = data.text || '';

      this.logger.log(`PDF parsed successfully. Pages: ${data.numpages}, Text length: ${content.length}`);

      return {
        content,
        metadata: {
          pageCount: data.numpages,
          wordCount: this.countWords(content),
          format: 'pdf',
        },
      };
    } catch (error) {
      this.logger.error(`Failed to parse PDF: ${error.message}`);
      throw new Error(`PDF parsing failed: ${error.message}`);
    }
  }

  private async processWord(buffer: Buffer, mimeType: string): Promise<ProcessedDocument> {
    // 动态加载 mammoth
    let mammoth: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      mammoth = require('mammoth');
    } catch (error) {
      throw new Error('mammoth module not installed. Run: npm install mammoth');
    }

    const result = await mammoth.extractRawText({ buffer });
    const content = result.value;

    return {
      content,
      metadata: {
        wordCount: this.countWords(content),
        format: mimeType === 'application/msword' ? 'doc' : 'docx',
      },
    };
  }

  private getFormatFromMime(mimeType: string): string {
    const map: Record<string, string> = {
      'text/plain': 'txt',
      'text/markdown': 'md',
      'application/pdf': 'pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/msword': 'doc',
    };
    return map[mimeType] || 'unknown';
  }

  private detectMimeTypeFromExtension(fileName: string): string {
    const ext = fileName.toLowerCase().split('.').pop();
    const mimeMap: Record<string, string> = {
      'txt': 'text/plain',
      'md': 'text/markdown',
      'markdown': 'text/markdown',
      'pdf': 'application/pdf',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'doc': 'application/msword',
    };
    return mimeMap[ext || ''] || 'application/octet-stream';
  }

  private countWords(text: string): number {
    // 中文字符计数
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    // 英文单词计数
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    return chineseChars + englishWords;
  }

  isSupported(mimeType: string): boolean {
    return this.supportedMimeTypes.includes(mimeType);
  }

  getSupportedMimeTypes(): string[] {
    return [...this.supportedMimeTypes];
  }
}
