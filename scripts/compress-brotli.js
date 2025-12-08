#!/usr/bin/env node
/**
 * Brotli Compression Script
 * Compresses static assets using Brotli level 11 compression
 * Creates .br files alongside original files for efficient serving
 */

import { createBrotliCompress, constants } from 'zlib';
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, resolve, extname, relative } from 'path';

const BROTLI_LEVEL = 11; // Maximum compression level
const BROTLI_WINDOW = 22; // Maximum window size for better compression
const BROTLI_MODE = 1; // Generic mode (0=text, 1=generic, 2=font)

// File extensions to compress
const COMPRESSIBLE_EXTENSIONS = new Set([
  '.js',
  '.css',
  '.html',
  '.json',
  '.svg',
  '.xml',
  '.txt',
  '.woff2', // Fonts can benefit from Brotli
  '.woff',
  '.ttf',
]);

// Directories to skip
const SKIP_DIRS = new Set(['node_modules', '.git', 'test-results', 'playwright-report']);

// Files to skip
const SKIP_FILES = new Set(['sw.js']); // Service worker should not be compressed

/**
 * Compress a single file using Brotli
 */
async function compressFile(filePath, outputPath) {
  try {
    const input = readFileSync(filePath);
    
    return new Promise((resolve, reject) => {
      const compress = createBrotliCompress({
        params: {
          [constants.BROTLI_PARAM_QUALITY]: BROTLI_LEVEL,
          [constants.BROTLI_PARAM_LGWIN]: BROTLI_WINDOW,
          [constants.BROTLI_PARAM_MODE]: BROTLI_MODE,
        },
      });

      const chunks = [];
      compress.on('data', (chunk) => chunks.push(chunk));
      compress.on('end', () => {
        const compressed = Buffer.concat(chunks);
        writeFileSync(outputPath, compressed);
        const originalSize = input.length;
        const compressedSize = compressed.length;
        const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
        console.log(
          `  ✓ ${relative(process.cwd(), filePath)}: ${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB (${ratio}% reduction)`
        );
        resolve({ originalSize, compressedSize });
      });
      compress.on('error', reject);
      compress.end(input);
    });
  } catch (error) {
    console.error(`  ✗ Failed to compress ${filePath}:`, error.message);
    throw error;
  }
}

/**
 * Recursively process directory
 */
async function processDirectory(dir, baseDir, stats = { files: 0, totalOriginal: 0, totalCompressed: 0 }) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const promises = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relPath = relative(baseDir, fullPath);

    // Skip directories
    if (SKIP_DIRS.has(entry.name)) {
      continue;
    }

    if (entry.isDirectory()) {
      const subStats = await processDirectory(fullPath, baseDir, stats);
      Object.assign(stats, subStats);
    } else if (entry.isFile()) {
      // Skip files that shouldn't be compressed
      if (SKIP_FILES.has(entry.name)) {
        continue;
      }

      const ext = extname(entry.name).toLowerCase();
      
      // Only compress files with compressible extensions
      if (COMPRESSIBLE_EXTENSIONS.has(ext)) {
        const brPath = `${fullPath}.br`;
        
        // Only compress if .br doesn't exist or source is newer
        const sourceStat = statSync(fullPath);
        let shouldCompress = true;
        
        if (existsSync(brPath)) {
          const brStat = statSync(brPath);
          shouldCompress = sourceStat.mtime > brStat.mtime;
        }

        if (shouldCompress) {
          stats.files++;
          promises.push(
            compressFile(fullPath, brPath)
              .then(({ originalSize, compressedSize }) => {
                stats.totalOriginal += originalSize;
                stats.totalCompressed += compressedSize;
              })
              .catch((err) => {
                console.error(`Error compressing ${relPath}:`, err);
              })
          );
        }
      }
    }
  }

  await Promise.all(promises);
  return stats;
}

/**
 * Main function
 */
async function main() {
  // Only run Brotli compression in production
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (!isProduction) {
    console.log('⏭️  Skipping Brotli compression (development mode)');
    console.log('   Set NODE_ENV=production to enable compression\n');
    return;
  }

  const distDir = resolve(process.cwd(), 'dist');
  
  if (!existsSync(distDir)) {
    console.error('Error: dist directory does not exist. Run "npm run build" first.');
    process.exit(1);
  }

  console.log('🔧 Compressing assets with Brotli (level 11)...\n');
  console.log(`📁 Processing: ${distDir}\n`);

  const stats = await processDirectory(distDir, distDir);

  console.log('\n📊 Compression Summary:');
  console.log(`   Files compressed: ${stats.files}`);
  if (stats.totalOriginal > 0) {
    const totalReduction = ((1 - stats.totalCompressed / stats.totalOriginal) * 100).toFixed(1);
    console.log(`   Original size: ${(stats.totalOriginal / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   Compressed size: ${(stats.totalCompressed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   Total reduction: ${totalReduction}%`);
  }
  console.log('\n✅ Brotli compression complete!\n');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

