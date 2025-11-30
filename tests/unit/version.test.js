import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the version constant
const mockVersion = '3.5.0';

describe('version', () => {
  let versionModule;

  beforeEach(async () => {
    // Dynamically import to get the actual module
    // Note: In actual tests, __APP_VERSION__ is defined by vitest.config.js
    versionModule = await import('../../static/js/core/version.js');
  });

  it('should export APP_VERSION constant', () => {
    expect(versionModule.APP_VERSION).toBeDefined();
    expect(typeof versionModule.APP_VERSION).toBe('string');
  });

  it('should export getVersion function', () => {
    expect(versionModule.getVersion).toBeTypeOf('function');
  });

  it('should export getVersionString function', () => {
    expect(versionModule.getVersionString).toBeTypeOf('function');
  });

  it('getVersion should return the APP_VERSION', () => {
    const version = versionModule.getVersion();
    expect(version).toBe(versionModule.APP_VERSION);
    expect(typeof version).toBe('string');
  });

  it('getVersionString should return version with FractalAI v prefix', () => {
    const versionString = versionModule.getVersionString();
    expect(versionString).toContain('FractalAI v');
    expect(versionString).toContain(versionModule.APP_VERSION);
    expect(versionString).toBe(`FractalAI v${versionModule.APP_VERSION}`);
  });
});

