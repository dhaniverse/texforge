import { ImageChunker } from '../chunker/ImageChunker.js';
import { TextureForge } from '../converter/TextureForge.js';
import { promises as fs } from 'fs';
import * as path from 'path';
import {
  ChunkedMapMetadata,
  ConversionResult
} from './types.js';

export interface ProcessOptions {
  input: string;
  outputDir: string;
  chunkSize?: number;
  mode?: 'etc1s' | 'uastc';
  quality?: number;
  compressionLevel?: number;
  mipmaps?: boolean;
}

export interface ProcessResult {
  metadata: ChunkedMapMetadata;
  conversions: ConversionResult[];
  totalOriginalSize: number;
  totalCompressedSize: number;
  totalSaved: number;
  compressionRatio: number;
}

/**
 * Main TexForge orchestrator class
 * Combines chunking and KTX2 conversion into one-line API
 */
export class TexForge {
  /**
   * Process a large map image: chunk it and convert to KTX2
   * One-line API for the entire pipeline
   * 
   * @example
   * const result = await TexForge.processMapToKTX2({
   *   input: 'large-map.png',
   *   outputDir: './output',
   *   chunkSize: 1024,
   *   mode: 'etc1s'
   * });
   */
  static async processMapToKTX2(options: ProcessOptions): Promise<ProcessResult> {
    const chunksDir = path.join(options.outputDir, 'chunks_temp');
    
    // Step 1: Chunk the large image into tiles
    const chunker = new ImageChunker({
      chunkSize: options.chunkSize ?? 1024,
      outputDir: chunksDir,
      format: 'png'
    });

    const metadata = await chunker.chunkImage(options.input);

    // Step 2: Convert each PNG chunk to KTX2
    const forge = new TextureForge({
      mode: options.mode ?? 'etc1s',
      quality: options.quality ?? 128,
      compressionLevel: options.compressionLevel ?? 2,
      mipmaps: options.mipmaps ?? false
    });

    const ktx2Dir = path.join(options.outputDir, 'chunks');
    await fs.mkdir(ktx2Dir, { recursive: true });

    const conversions: ConversionResult[] = [];
    let totalOriginalSize = 0;
    let totalCompressedSize = 0;

    for (const chunk of metadata.chunks) {
      const inputPath = path.join(chunksDir, chunk.filename);
      const outputPath = path.join(ktx2Dir, chunk.filename.replace('.png', '.ktx2'));

      const result = await forge.convertFile(inputPath, outputPath);
      conversions.push(result);

      if (result.success) {
        totalOriginalSize += result.originalSize;
        totalCompressedSize += result.compressedSize;
        // Update metadata to point to KTX2 files
        chunk.filename = chunk.filename.replace('.png', '.ktx2');
      }
    }

    // Step 3: Cleanup temporary PNG chunks
    await fs.rm(chunksDir, { recursive: true, force: true });

    // Step 4: Update and save metadata
    metadata.format = 'ktx2';
    const metadataPath = path.join(ktx2Dir, 'metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    return {
      metadata,
      conversions,
      totalOriginalSize,
      totalCompressedSize,
      totalSaved: totalOriginalSize - totalCompressedSize,
      compressionRatio: ((1 - totalCompressedSize / totalOriginalSize) * 100)
    };
  }
}
