export { TextureForge } from './TextureForge.js';
import { TextureForge } from './TextureForge.js';
import { ConversionOptions, ConversionResult } from '../core/types.js';

/**
 * Convert a single image to KTX2 format
 * Convenience function for quick one-off conversions
 */
export async function convert(
  input: string,
  output?: string,
  options: Partial<ConversionOptions> = {}
): Promise<ConversionResult> {
  const forge = new TextureForge({
    mode: options.mode ?? 'etc1s',
    ...options
  });
  
  return forge.convertFile(input, output);
}

/**
 * Convert multiple images in a directory to KTX2 format
 * Convenience function for batch conversions
 */
export async function convertBatch(
  inputDir: string,
  outputDir?: string,
  options: Partial<ConversionOptions> = {}
): Promise<ConversionResult[]> {
  const forge = new TextureForge({
    mode: options.mode ?? 'etc1s',
    ...options
  });
  
  return forge.convertDirectory(inputDir, outputDir);
}
