import sharp from 'sharp';
import { promises as fs } from 'fs';
import * as path from 'path';
import { ChunkMetadata, ChunkedMapMetadata, ChunkOptions } from '../core/types.js';

export class ImageChunker {
  private readonly chunkSize: number;
  private readonly outputDir: string;
  private readonly format: 'png' | 'ktx2';

  constructor(options: ChunkOptions) {
    this.chunkSize = options.chunkSize ?? 1024;
    this.outputDir = options.outputDir;
    this.format = options.format ?? 'png';
  }

  async chunkImage(inputPath: string): Promise<ChunkedMapMetadata> {
    await fs.mkdir(this.outputDir, { recursive: true });

    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    if (!metadata.width || !metadata.height) {
      throw new Error('Failed to read image dimensions');
    }

    const { width, height } = metadata;
    const chunksX = Math.ceil(width / this.chunkSize);
    const chunksY = Math.ceil(height / this.chunkSize);

    const chunks: ChunkMetadata[] = [];

    for (let row = 0; row < chunksY; row++) {
      for (let col = 0; col < chunksX; col++) {
        const chunk = await this.createChunk(image, col, row, width, height);
        chunks.push(chunk);
      }
    }

    const mapMetadata: ChunkedMapMetadata = {
      version: 1,
      totalWidth: width,
      totalHeight: height,
      chunkWidth: this.chunkSize,
      chunkHeight: this.chunkSize,
      chunksX,
      chunksY,
      chunks,
      format: this.format
    };

    await this.saveMetadata(mapMetadata);

    return mapMetadata;
  }

  private async createChunk(
    image: sharp.Sharp,
    col: number,
    row: number,
    totalWidth: number,
    totalHeight: number
  ): Promise<ChunkMetadata> {
    const chunkId = `${col}_${row}`;
    const pixelX = col * this.chunkSize;
    const pixelY = row * this.chunkSize;

    const width = Math.min(this.chunkSize, totalWidth - pixelX);
    const height = Math.min(this.chunkSize, totalHeight - pixelY);

    const filename = `${chunkId}.${this.format}`;
    const filePath = path.join(this.outputDir, filename);

    await image
      .clone()
      .extract({ left: pixelX, top: pixelY, width, height })
      .toFile(filePath);

    return {
      id: chunkId,
      x: col,
      y: row,
      pixelX,
      pixelY,
      width,
      height,
      filename
    };
  }

  private async saveMetadata(metadata: ChunkedMapMetadata): Promise<void> {
    const metadataPath = path.join(this.outputDir, 'metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  }
}
