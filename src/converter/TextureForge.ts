import { exec } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { ConversionOptions, ConversionResult } from '../core/types.js';

const execAsync = promisify(exec);

export class TextureForge {
  private readonly mode: 'etc1s' | 'uastc';
  private readonly quality: number;
  private readonly compressionLevel: number;
  private readonly mipmaps: boolean;
  private readonly normalMap: boolean;
  private readonly toktxPath: string;

  constructor(options: ConversionOptions) {
    this.mode = options.mode;
    this.quality = options.quality ?? 128;
    this.compressionLevel = options.compressionLevel ?? 2;
    this.mipmaps = options.mipmaps ?? false;
    this.normalMap = options.normalMap ?? false;
    this.toktxPath = options.toktxPath ?? 'toktx';
  }

  /**
   * Convert a single image file to KTX2 format
   */
  async convertFile(inputPath: string, outputPath?: string): Promise<ConversionResult> {
    const startTime = Date.now();
    
    try {
      // Validate input file exists
      await fs.access(inputPath);
      const stats = await fs.stat(inputPath);
      const originalSize = stats.size;

      // Determine output path
      const outputFilePath = outputPath ?? inputPath.replace(/\.(png|jpg|jpeg)$/i, '.ktx2');

      // Build toktx command
      const command = this.buildToktxCommand(inputPath, outputFilePath);

      // Execute conversion
      await execAsync(command);

      // Get compressed file size
      const compressedStats = await fs.stat(outputFilePath);
      const compressedSize = compressedStats.size;
      const compressionRatio = (1 - compressedSize / originalSize) * 100;

      const duration = Date.now() - startTime;

      return {
        success: true,
        inputFile: inputPath,
        outputFile: outputFilePath,
        originalSize,
        compressedSize,
        compressionRatio,
        mode: this.mode,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        inputFile: inputPath,
        outputFile: outputPath ?? inputPath.replace(/\.(png|jpg|jpeg)$/i, '.ktx2'),
        originalSize: 0,
        compressedSize: 0,
        compressionRatio: 0,
        mode: this.mode,
        duration,
        error: errorMessage
      };
    }
  }

  /**
   * Convert multiple image files to KTX2 format
   */
  async convertDirectory(
    inputDir: string,
    outputDir?: string,
    filePattern: RegExp = /\.(png|jpg|jpeg)$/i,
    onProgress?: (current: number, total: number, file: string, result: ConversionResult) => void
  ): Promise<ConversionResult[]> {
    // Read directory
    const files = await fs.readdir(inputDir);
    const imageFiles = files.filter((file: string) => filePattern.test(file));

    if (imageFiles.length === 0) {
      return [];
    }

    // Ensure output directory exists
    const targetDir = outputDir ?? inputDir;
    await fs.mkdir(targetDir, { recursive: true });

    // Convert files sequentially (parallel can overwhelm system)
    const results: ConversionResult[] = [];

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const inputPath = path.join(inputDir, file);
      const outputPath = outputDir 
        ? path.join(outputDir, file.replace(/\.(png|jpg|jpeg)$/i, '.ktx2'))
        : inputPath.replace(/\.(png|jpg|jpeg)$/i, '.ktx2');

      const result = await this.convertFile(inputPath, outputPath);
      results.push(result);
      
      // Call progress callback after each file
      if (onProgress) {
        onProgress(i + 1, imageFiles.length, file, result);
      }
    }

    return results;
  }

  /**
   * Build toktx command with appropriate flags
   */
  private buildToktxCommand(inputPath: string, outputPath: string): string {
    const args: string[] = [];

    if (this.mode === 'etc1s') {
      args.push('--bcmp');
      args.push('--clevel', this.compressionLevel.toString());
      args.push('--qlevel', this.quality.toString());
      args.push('--max_endpoints', '16128');
      args.push('--max_selectors', '16128');
    } else if (this.mode === 'uastc') {
      args.push('--uastc');
      args.push('--uastc_quality', '2');
      args.push('--zcmp', '19');
    }

    if (this.mipmaps) {
      args.push('--genmipmap');
    }

    if (this.normalMap) {
      args.push('--normal_map');
    }

    args.push('--t2');
    args.push('--threads', '0');
    args.push(outputPath);
    args.push(inputPath);

    return `${this.toktxPath} ${args.join(' ')}`;
  }

  /**
   * Check if toktx is available in system PATH
   */
  static async checkToktxAvailability(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('toktx --version');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Format bytes to human-readable string
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }
}
