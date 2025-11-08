export interface ChunkMetadata {
  id: string;
  x: number;
  y: number;
  pixelX: number;
  pixelY: number;
  width: number;
  height: number;
  filename: string;
}

export interface ChunkedMapMetadata {
  version: number;
  totalWidth: number;
  totalHeight: number;
  chunkWidth: number;
  chunkHeight: number;
  chunksX: number;
  chunksY: number;
  chunks: ChunkMetadata[];
  format: 'png' | 'ktx2';
}

export interface ChunkOptions {
  chunkSize?: number;
  outputDir: string;
  format?: 'png' | 'ktx2';
}

export interface ConversionOptions {
  mode: 'etc1s' | 'uastc';
  quality?: number;
  compressionLevel?: number;
  mipmaps?: boolean;
  normalMap?: boolean;
  toktxPath?: string;
}

export interface ConversionResult {
  success: boolean;
  inputFile: string;
  outputFile: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  mode: 'etc1s' | 'uastc';
  duration: number;
  error?: string;
}

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
