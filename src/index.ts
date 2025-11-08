// Main orchestrator
export { TexForge } from './core/orchestrator.js';
export type { ProcessOptions, ProcessResult } from './core/orchestrator.js';

// Chunking
export { ImageChunker } from './chunker/ImageChunker.js';

// Conversion
export { TextureForge, convert, convertBatch } from './converter/index.js';

// Types
export type {
  ChunkMetadata,
  ChunkedMapMetadata,
  ChunkOptions,
  ConversionOptions,
  ConversionResult
} from './core/types.js';
