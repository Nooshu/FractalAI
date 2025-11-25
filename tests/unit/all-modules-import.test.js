import { describe, it, expect } from 'vitest';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * Structural coverage test:
 * - Recursively finds every JS module under static/js
 * - Dynamically imports each module
 * - Asserts that the import succeeds and returns an object
 *
 * This ensures that every module (including all fractals) is exercised by at least one test.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

const projectRoot = join(__dirname, '..', '..');
const staticJsRoot = join(projectRoot, 'static', 'js');

function collectJsFiles(dir) {
  const entries = readdirSync(dir);
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...collectJsFiles(fullPath));
    } else if (stat.isFile() && fullPath.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

describe('All JS modules importable', () => {
  const jsFiles = collectJsFiles(staticJsRoot);

  for (const filePath of jsFiles) {
    const url = pathToFileURL(filePath).href;

    it(`imports module: ${filePath.replace(projectRoot, '')}`, async () => {
      const mod = await import(url);
      expect(mod).toBeTypeOf('object');
    });
  }
});


