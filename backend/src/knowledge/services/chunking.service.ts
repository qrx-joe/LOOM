import { Injectable, Logger } from '@nestjs/common';
import { ChunkingConfig, ChunkResult, DEFAULT_CHUNKING_CONFIG, ChunkingStrategy } from '../interfaces';

@Injectable()
export class ChunkingService {
  private readonly logger = new Logger(ChunkingService.name);

  async chunk(text: string, config: ChunkingConfig = DEFAULT_CHUNKING_CONFIG): Promise<ChunkResult[]> {
    switch (config.strategy) {
      case 'fixed':
        return this.fixedChunk(text, config.chunkSize, config.chunkOverlap);
      case 'semantic':
        return this.semanticChunk(text, config.chunkSize, config.chunkOverlap);
      case 'recursive':
        return this.recursiveChunk(text, config.chunkSize, config.chunkOverlap);
      default:
        return this.semanticChunk(text, config.chunkSize, config.chunkOverlap);
    }
  }

  private fixedChunk(text: string, chunkSize: number, overlap: number): ChunkResult[] {
    const chunks: ChunkResult[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push({
        content: text.slice(start, end),
        metadata: { startIndex: start, endIndex: end },
      });
      start = end - overlap;
      if (start >= text.length - overlap) break;
    }

    return chunks;
  }

  private semanticChunk(text: string, chunkSize: number, overlap: number): ChunkResult[] {
    // 按段落分割，保留语义完整性
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
    const chunks: ChunkResult[] = [];
    let currentChunk = '';
    let currentStart = 0;
    let position = 0;

    for (const para of paragraphs) {
      const paraStart = text.indexOf(para, position);

      if (currentChunk.length + para.length + 1 <= chunkSize) {
        currentChunk += (currentChunk ? '\n\n' : '') + para;
      } else {
        if (currentChunk) {
          chunks.push({
            content: currentChunk,
            metadata: { startIndex: currentStart, endIndex: currentStart + currentChunk.length },
          });

          // 处理重叠：保留上一块的末尾部分
          if (overlap > 0 && currentChunk.length > overlap) {
            const overlapText = currentChunk.slice(-overlap);
            currentChunk = overlapText + '\n\n' + para;
            currentStart = paraStart - overlap - 2;
          } else {
            currentChunk = para;
            currentStart = paraStart;
          }
        } else {
          // 单个段落超过chunkSize，需要进一步分割
          const subChunks = this.splitLongParagraph(para, chunkSize, overlap);
          for (const sub of subChunks) {
            const subStart = text.indexOf(sub.content, paraStart) || paraStart;
            chunks.push({
              content: sub.content,
              metadata: { startIndex: subStart, endIndex: subStart + sub.content.length },
            });
          }
          currentChunk = '';
        }
      }
      position = paraStart + para.length;
    }

    if (currentChunk) {
      chunks.push({
        content: currentChunk,
        metadata: { startIndex: currentStart, endIndex: currentStart + currentChunk.length },
      });
    }

    return chunks.length > 0 ? chunks : [{
      content: text.slice(0, chunkSize),
      metadata: { startIndex: 0, endIndex: Math.min(chunkSize, text.length) },
    }];
  }

  private recursiveChunk(text: string, chunkSize: number, overlap: number): ChunkResult[] {
    const separators = ['\n\n', '\n', '。', '.', '！', '!', '？', '?', '；', ';', ' ', ''];

    const splitBySeparator = (t: string, sep: string): string[] => {
      if (sep === '') return [t];
      return t.split(sep).filter(s => s.trim().length > 0).map(s => sep === ' ' ? s : s + sep);
    };

    const chunkRecursive = (t: string, sepIndex: number): ChunkResult[] => {
      if (t.length <= chunkSize) {
        return [{
          content: t,
          metadata: { startIndex: 0, endIndex: t.length },
        }];
      }

      const separator = separators[sepIndex];
      if (!separator) {
        // 无法再分割，直接按固定大小切分
        return this.fixedChunk(t, chunkSize, overlap);
      }

      const parts = splitBySeparator(t, separator);
      const chunks: ChunkResult[] = [];
      let current = '';
      let currentStart = 0;
      let pos = 0;

      for (const part of parts) {
        if (current.length + part.length <= chunkSize) {
          current += part;
        } else {
          if (current) {
            chunks.push({
              content: current,
              metadata: { startIndex: currentStart, endIndex: currentStart + current.length },
            });
            currentStart += current.length - overlap;
          }

          if (part.length > chunkSize) {
            // 需要更细粒度的分割
            const subChunks = chunkRecursive(part, sepIndex + 1);
            chunks.push(...subChunks.map(c => ({
              ...c,
              metadata: {
                startIndex: currentStart + c.metadata.startIndex,
                endIndex: currentStart + c.metadata.endIndex,
              },
            })));
            current = '';
          } else {
            current = part;
          }
        }
        pos += part.length;
      }

      if (current) {
        chunks.push({
          content: current,
          metadata: { startIndex: currentStart, endIndex: currentStart + current.length },
        });
      }

      return chunks;
    };

    return chunkRecursive(text, 0);
  }

  private splitLongParagraph(para: string, chunkSize: number, overlap: number): ChunkResult[] {
    // 按句子分割长段落
    const sentences = para.split(/(?<=[。！？.!?])/);
    const chunks: ChunkResult[] = [];
    let current = '';

    for (const sentence of sentences) {
      if (current.length + sentence.length <= chunkSize) {
        current += sentence;
      } else {
        if (current) chunks.push({ content: current, metadata: { startIndex: 0, endIndex: current.length } });
        current = sentence;
      }
    }
    if (current) chunks.push({ content: current, metadata: { startIndex: 0, endIndex: current.length } });

    return chunks;
  }
}
