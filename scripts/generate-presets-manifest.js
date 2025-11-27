#!/usr/bin/env node

/**
 * Generate a manifest of preset image files
 * This allows automatic discovery without directory listing
 */

import { readdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const presetsDir = resolve(__dirname, '..', 'static', 'presets', 'images');
const manifestPath = resolve(__dirname, '..', 'static', 'presets', 'images', 'manifest.json');

try {
  // Read all files in the presets directory
  const files = readdirSync(presetsDir);
  
  // Filter for JPG files matching the pattern: [number]-[title]-[title].jpg
  const imageFiles = files.filter(file => {
    return file.match(/^\d{2}-[\w-]+-[\w-]+\.jpg$/i);
  });
  
  // Sort by filename (which sorts by number prefix)
  imageFiles.sort();
  
  // Generate manifest
  const manifest = {
    images: imageFiles,
    generated: new Date().toISOString(),
    count: imageFiles.length
  };
  
  // Write manifest file
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  
  console.log(`✅ Generated manifest with ${imageFiles.length} images`);
  console.log(`📁 Manifest saved to: ${manifestPath}`);
  
} catch (error) {
  console.error('❌ Error generating manifest:', error.message);
  process.exit(1);
}

