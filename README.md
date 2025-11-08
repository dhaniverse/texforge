# texforge

Forge textures for the GPU age. Convert large images and texture atlases to GPU-optimized KTX2 format with automatic chunking and hardware-accelerated compression.

## Features

- **Automatic Image Chunking**: Split large maps into optimal chunks for streaming
- **GPU-Native Compression**: Convert to KTX2 with ETC1S or UASTC compression
- **90% Smaller Files**: Dramatically reduce texture memory and load times
- **Phaser Integration**: Drop-in loader for Phaser 3.70+
- **CLI and API**: Use as command-line tool or Node.js library
- **Zero Configuration**: Works out of the box with sensible defaults

## Installation

```bash
npm install texforge
```

### Requirements

texforge requires `toktx` from KTX-Software:

- **Windows**: Download from [KTX-Software releases](https://github.com/KhronosGroup/KTX-Software/releases)
- **macOS**: `brew install ktx`
- **Linux**: Download from KTX-Software releases

Verify installation:
```bash
texforge check
```

## Quick Start

### One-Line Map Optimization

```typescript
import { TexForge } from 'texforge';

const result = await TexForge.processMapToKTX2({
  input: './my-huge-map.png',
  outputDir: './public/maps',
  chunkSize: 1024,
  mode: 'etc1s'
});

console.log(`Saved ${result.totalSaved} bytes (${result.compressionRatio}% reduction)`);
```

### CLI Usage

```bash
# Convert single image
texforge convert image.png -o output.ktx2

# Convert directory
texforge convert ./textures/ -o ./output/ --mode uastc

# Process large map with chunking
texforge convert huge-map.png -o ./chunks/ --chunk-size 1024
```

## API Documentation

### TexForge.processMapToKTX2(options)

Main method that chunks a large image and converts all chunks to KTX2.

```typescript
interface ProcessOptions {
  input: string;              // Input image path
  outputDir: string;          // Output directory for chunks
  chunkSize?: number;         // Chunk size in pixels (default: 1024)
  mode?: 'etc1s' | 'uastc';  // Compression mode (default: 'etc1s')
  quality?: number;           // Quality 1-255 (default: 128)
  compressionLevel?: number;  // Level 0-5 (default: 2)
  mipmaps?: boolean;          // Generate mipmaps (default: false)
}
```

**Returns**: `ProcessResult` with metadata, conversion stats, and file sizes.

### ImageChunker

Split large images into chunks for streaming:

```typescript
import { ImageChunker } from 'texforge';

const chunker = new ImageChunker({
  chunkSize: 1024,
  outputDir: './chunks',
  format: 'png'
});

const metadata = await chunker.chunkImage('./large-map.png');
```

### TextureForge

Convert individual images to KTX2:

```typescript
import { TextureForge } from 'texforge';

const forge = new TextureForge({
  mode: 'etc1s',
  quality: 128,
  compressionLevel: 2
});

const result = await forge.convertFile('./texture.png', './texture.ktx2');
```

### Phaser Integration

Load chunked KTX2 maps in Phaser:

```typescript
import { PhaserKTX2Loader } from 'texforge';

class GameScene extends Phaser.Scene {
  private loader: PhaserKTX2Loader;

  async create() {
    this.loader = new PhaserKTX2Loader(this, '/maps/chunks/');
    
    await this.loader.loadMetadata('/maps/chunks/metadata.json');
    
    // Load chunks around player position
    this.loader.loadChunksInArea(playerX, playerY, 2);
  }

  update() {
    // Dynamically load chunks as player moves
    this.loader.loadChunksInArea(player.x, player.y, 2);
  }
}
```

## Compression Modes

### ETC1S (Recommended)

- **Best compression ratio**: 70-90% smaller than PNG
- **Universal support**: Works on all devices
- **Use for**: Large texture atlases, background images, UI textures

```typescript
mode: 'etc1s',
quality: 128,           // Higher = better quality (1-255)
compressionLevel: 2     // Higher = smaller file (0-5)
```

### UASTC

- **Higher quality**: Better visual fidelity
- **Faster transcoding**: Hardware decode on GPU
- **Use for**: Normal maps, detail textures, hero assets

```typescript
mode: 'uastc',
quality: 2              // Quality level for UASTC
```

## Performance Benchmarks

Real-world results from a 12000x8000px game map:

| Format | Size | Load Time | Memory |
|--------|------|-----------|--------|
| PNG | 45 MB | 2.3s | 384 MB |
| KTX2 (etc1s) | 4.2 MB | 0.3s | 48 MB |
| Improvement | **90% smaller** | **87% faster** | **87% less** |

## Complete Example: Dhaniverse Integration

```typescript
// Step 1: Process your map during build
import { TexForge } from 'texforge';

await TexForge.processMapToKTX2({
  input: './assets/world-map.png',
  outputDir: './public/maps',
  chunkSize: 1024,
  mode: 'etc1s',
  quality: 128
});

// Step 2: Load in Phaser
import { PhaserKTX2Loader } from 'texforge';

export class MainScene extends Phaser.Scene {
  private mapLoader: PhaserKTX2Loader;

  async preload() {
    this.mapLoader = new PhaserKTX2Loader(this);
    const metadata = await this.mapLoader.loadMetadata('/maps/metadata.json');
    
    console.log(`Map size: ${metadata.totalWidth}x${metadata.totalHeight}`);
    console.log(`Chunks: ${metadata.chunksX}x${metadata.chunksY}`);
  }

  create() {
    // Load initial visible chunks
    const player = this.add.sprite(100, 100, 'player');
    this.mapLoader.loadChunksInArea(player.x, player.y, 3);
  }

  update() {
    // Stream chunks as player moves
    const player = this.physics.world.bounds;
    this.mapLoader.loadChunksInArea(player.centerX, player.centerY, 2);
  }
}
```

## CLI Reference

```bash
# Convert with custom quality
texforge convert input.png --quality 200 --compression 4

# UASTC mode for high-quality textures
texforge convert normal-map.png --mode uastc --normal-map

# Generate mipmaps
texforge convert texture.png --mipmaps

# Batch convert directory
texforge convert ./textures/ -o ./output/

# Check installation
texforge check
```

## TypeScript Support

Full TypeScript definitions included:

```typescript
import type {
  ChunkMetadata,
  ChunkedMapMetadata,
  ConversionOptions,
  ConversionResult
} from 'texforge';
```

## License

MIT - Gursimran Singh

## Credits

Built with:
- [KTX-Software](https://github.com/KhronosGroup/KTX-Software) - Khronos Group
- [Sharp](https://sharp.pixelplumbing.com/) - Image processing
- [Basis Universal](https://github.com/BinomialLLC/basis_universal) - GPU texture compression

## Contributing

Issues and PRs welcome at [github.com/dhaniverse/texforge](https://github.com/dhaniverse/texforge)
