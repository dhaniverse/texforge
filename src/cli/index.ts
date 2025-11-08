#!/usr/bin/env node
/**
 * texforge CLI
 * Forge textures for the GPU age
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as cliProgress from 'cli-progress';
import { TextureForge } from '../converter/TextureForge.js';
import { ConversionResult } from '../core/types.js';
import { promises as fs } from 'fs';
import * as path from 'path';

const program = new Command();

program
  .name('texforge')
  .description('Forge textures for the GPU age - Convert images to KTX2')
  .version('0.1.0');

program
  .command('convert')
  .description('Convert image(s) to KTX2 format')
  .argument('<input>', 'Input file or directory')
  .option('-o, --output <path>', 'Output file or directory')
  .option('-m, --mode <mode>', 'Compression mode: etc1s or uastc', 'etc1s')
  .option('-q, --quality <number>', 'Quality level (1-255, default: 128)', '128')
  .option('-c, --compression <level>', 'Compression level (0-5, default: 2)', '2')
  .option('--mipmaps', 'Generate mipmaps', false)
  .option('--normal-map', 'Treat as normal map', false)
  .action(async (input: string, options: any) => {
    console.log(chalk.bold.cyan('\ntexforge') + chalk.gray(' - Forging textures...\n'));

    // Check if toktx is available
    const spinner = ora('Checking for toktx...').start();
    const hasToktx = await TextureForge.checkToktxAvailability();
    
    if (!hasToktx) {
      spinner.fail(chalk.red('toktx not found!'));
      console.log(chalk.yellow('\nInstall toktx:'));
      console.log(chalk.gray('  Windows: ') + 'https://github.com/KhronosGroup/KTX-Software/releases');
      console.log(chalk.gray('  macOS:   ') + 'brew install ktx');
      console.log(chalk.gray('  Linux:   ') + 'Download from KTX-Software releases\n');
      process.exit(1);
    }
    
    spinner.succeed('toktx found');

    // Validate compression mode
    if (options.mode !== 'etc1s' && options.mode !== 'uastc') {
      console.log(chalk.red(`\nInvalid mode: ${options.mode}`));
      console.log(chalk.gray('   Use "etc1s" or "uastc"\n'));
      process.exit(1);
    }

    // Create converter
    const forge = new TextureForge({
      mode: options.mode,
      quality: parseInt(options.quality),
      compressionLevel: parseInt(options.compression),
      mipmaps: options.mipmaps,
      normalMap: options.normalMap
    });

    try {
      // Check if input is file or directory
      const stats = await fs.stat(input);
      
      if (stats.isFile()) {
        // Single file conversion
        console.log(chalk.gray(`\nMode: ${options.mode.toUpperCase()}, Quality: ${options.quality}\n`));
        
        const spinner = ora(`Converting ${path.basename(input)}...`).start();
        const result = await forge.convertFile(input, options.output);
        
        if (result.success) {
          spinner.succeed(chalk.green(`Converted ${path.basename(input)}`));
          printResult(result);
        } else {
          spinner.fail(chalk.red(`Failed: ${result.error}`));
          process.exit(1);
        }
      } else if (stats.isDirectory()) {
        // Directory conversion
        const files = await fs.readdir(input);
        const imageFiles = files.filter((f: string) => /\.(png|jpg|jpeg)$/i.test(f));
        
        if (imageFiles.length === 0) {
          console.log(chalk.yellow('\nNo image files found in directory\n'));
          process.exit(0);
        }

        console.log(chalk.gray(`Found ${imageFiles.length} image(s)`));
        console.log(chalk.gray(`Mode: ${options.mode.toUpperCase()}, Quality: ${options.quality}\n`));

        // Create progress bar
        const progressBar = new cliProgress.SingleBar({
          format: chalk.cyan('{bar}') + ' | {percentage}% | {value}/{total} files | {filename}',
          barCompleteChar: '\u2588',
          barIncompleteChar: '\u2591',
          hideCursor: true
        });

        progressBar.start(imageFiles.length, 0, { filename: '' });

        const results = await forge.convertDirectory(input, options.output);
        
        let successCount = 0;
        let failureCount = 0;
        let totalOriginalSize = 0;
        let totalCompressedSize = 0;

        results.forEach((result: ConversionResult, index: number) => {
          progressBar.update(index + 1, { filename: path.basename(result.inputFile) });
          
          if (result.success) {
            successCount++;
            totalOriginalSize += result.originalSize;
            totalCompressedSize += result.compressedSize;
          } else {
            failureCount++;
          }
        });

        progressBar.stop();

        // Print summary
        console.log(chalk.bold('\nSummary:'));
        console.log(chalk.green(`  Successful: ${successCount}`));
        if (failureCount > 0) {
          console.log(chalk.red(`  Failed: ${failureCount}`));
        }
        console.log(chalk.gray(`  Original size:   ${TextureForge.formatBytes(totalOriginalSize)}`));
        console.log(chalk.cyan(`  Compressed size: ${TextureForge.formatBytes(totalCompressedSize)}`));
        console.log(chalk.bold.green(`  Total saved:     ${TextureForge.formatBytes(totalOriginalSize - totalCompressedSize)} (${((1 - totalCompressedSize / totalOriginalSize) * 100).toFixed(1)}%)`));
        console.log();

        if (failureCount > 0) {
          process.exit(1);
        }
      }
    } catch (error) {
      console.log(chalk.red('\nError:'), (error as Error).message, '\n');
      process.exit(1);
    }
  });

program
  .command('check')
  .description('Check if toktx is installed')
  .action(async () => {
    const spinner = ora('Checking for toktx...').start();
    const hasToktx = await TextureForge.checkToktxAvailability();
    
    if (hasToktx) {
      spinner.succeed(chalk.green('toktx is installed and ready!'));
    } else {
      spinner.fail(chalk.red('toktx not found'));
      console.log(chalk.yellow('\nInstall toktx:'));
      console.log(chalk.gray('  Windows: ') + 'https://github.com/KhronosGroup/KTX-Software/releases');
      console.log(chalk.gray('  macOS:   ') + 'brew install ktx');
      console.log(chalk.gray('  Linux:   ') + 'Download from KTX-Software releases\n');
      process.exit(1);
    }
  });

function printResult(result: ConversionResult) {
  console.log(chalk.gray('  Original:   ') + TextureForge.formatBytes(result.originalSize));
  console.log(chalk.cyan('  Compressed: ') + TextureForge.formatBytes(result.compressedSize));
  console.log(chalk.green('  Saved:      ') + TextureForge.formatBytes(result.originalSize - result.compressedSize) + ` (${result.compressionRatio.toFixed(1)}%)`);
  console.log(chalk.gray('  Time:       ') + `${result.duration}ms\n`);
}

program.parse();
