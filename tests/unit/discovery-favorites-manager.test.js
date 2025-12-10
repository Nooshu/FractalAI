import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Tests for discovery/favorites-manager.js
 * Tests the favorites storage and retrieval functionality
 */

describe('discovery/favorites-manager', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('should export all required functions', async () => {
    const module = await import('../../static/js/discovery/favorites-manager.js');
    expect(module).toHaveProperty('getFavorites');
    expect(module).toHaveProperty('saveFavorites');
    expect(module).toHaveProperty('addFavorite');
    expect(module).toHaveProperty('removeFavorite');
    expect(module).toHaveProperty('updateFavoriteName');
    expect(module).toHaveProperty('getFavorite');
    expect(module).toHaveProperty('findMatchingFavorite');
  });

  it('should return empty array when no favorites exist', async () => {
    const { getFavorites } = await import('../../static/js/discovery/favorites-manager.js');
    const favorites = getFavorites();
    expect(favorites).toEqual([]);
  });

  it('should save and retrieve favorites', async () => {
    const { saveFavorites, getFavorites } = await import('../../static/js/discovery/favorites-manager.js');
    const testFavorites = [
      { id: '1', name: 'Test 1', fractalType: 'mandelbrot' },
      { id: '2', name: 'Test 2', fractalType: 'julia' },
    ];
    saveFavorites(testFavorites);
    const favorites = getFavorites();
    expect(favorites).toEqual(testFavorites);
  });

  it('should add a favorite with generated ID', async () => {
    const { addFavorite, getFavorites } = await import('../../static/js/discovery/favorites-manager.js');
    const fractalState = {
      fractalType: 'mandelbrot',
      zoom: 1.5,
      offsetX: 0.5,
      offsetY: 0.3,
      iterations: 125,
      colorScheme: 'classic',
    };
    const id = addFavorite(fractalState, 'My Favorite');
    expect(id).toMatch(/^fav_\d+_[a-z0-9]+$/);
    const favorites = getFavorites();
    expect(favorites).toHaveLength(1);
    expect(favorites[0].id).toBe(id);
    expect(favorites[0].name).toBe('My Favorite');
    expect(favorites[0].fractalType).toBe('mandelbrot');
    expect(favorites[0]).toHaveProperty('timestamp');
  });

  it('should generate default name when name not provided', async () => {
    const { addFavorite, getFavorites } = await import('../../static/js/discovery/favorites-manager.js');
    const fractalState = { fractalType: 'mandelbrot' };
    addFavorite(fractalState);
    const favorites = getFavorites();
    expect(favorites[0].name).toBe('Favorite 1');
  });

  it('should remove a favorite by ID', async () => {
    const { addFavorite, removeFavorite, getFavorites } = await import('../../static/js/discovery/favorites-manager.js');
    const id1 = addFavorite({ fractalType: 'mandelbrot' }, 'Test 1');
    const id2 = addFavorite({ fractalType: 'julia' }, 'Test 2');
    expect(getFavorites()).toHaveLength(2);
    const removed = removeFavorite(id1);
    expect(removed).toBe(true);
    const favorites = getFavorites();
    expect(favorites).toHaveLength(1);
    expect(favorites[0].id).toBe(id2);
  });

  it('should return false when removing non-existent favorite', async () => {
    const { removeFavorite } = await import('../../static/js/discovery/favorites-manager.js');
    const removed = removeFavorite('non-existent-id');
    expect(removed).toBe(false);
  });

  it('should update favorite name', async () => {
    const { addFavorite, updateFavoriteName, getFavorite } = await import('../../static/js/discovery/favorites-manager.js');
    const id = addFavorite({ fractalType: 'mandelbrot' }, 'Old Name');
    const updated = updateFavoriteName(id, 'New Name');
    expect(updated).toBe(true);
    const favorite = getFavorite(id);
    expect(favorite.name).toBe('New Name');
  });

  it('should return false when updating non-existent favorite', async () => {
    const { updateFavoriteName } = await import('../../static/js/discovery/favorites-manager.js');
    const updated = updateFavoriteName('non-existent-id', 'New Name');
    expect(updated).toBe(false);
  });

  it('should get favorite by ID', async () => {
    const { addFavorite, getFavorite } = await import('../../static/js/discovery/favorites-manager.js');
    const fractalState = { fractalType: 'mandelbrot', zoom: 2.0 };
    const id = addFavorite(fractalState, 'Test Favorite');
    const favorite = getFavorite(id);
    expect(favorite).toBeDefined();
    expect(favorite.id).toBe(id);
    expect(favorite.name).toBe('Test Favorite');
    expect(favorite.fractalType).toBe('mandelbrot');
    expect(favorite.zoom).toBe(2.0);
  });

  it('should return null for non-existent favorite', async () => {
    const { getFavorite } = await import('../../static/js/discovery/favorites-manager.js');
    const favorite = getFavorite('non-existent-id');
    expect(favorite).toBeNull();
  });

  it('should find matching favorite by fractal state', async () => {
    const { addFavorite, findMatchingFavorite } = await import('../../static/js/discovery/favorites-manager.js');
    const fractalState = {
      fractalType: 'mandelbrot',
      zoom: 1.5,
      offsetX: 0.5,
      offsetY: 0.3,
      iterations: 125,
      colorScheme: 'classic',
    };
    const id = addFavorite(fractalState, 'Test');
    const match = findMatchingFavorite(fractalState);
    expect(match).toBeDefined();
    expect(match.id).toBe(id);
  });

  it('should return null when no matching favorite found', async () => {
    const { findMatchingFavorite } = await import('../../static/js/discovery/favorites-manager.js');
    const fractalState = {
      fractalType: 'mandelbrot',
      zoom: 999,
      offsetX: 999,
      offsetY: 999,
      iterations: 999,
      colorScheme: 'nonexistent',
    };
    const match = findMatchingFavorite(fractalState);
    expect(match).toBeNull();
  });

  it('should handle localStorage errors gracefully', async () => {
    const { getFavorites } = await import('../../static/js/discovery/favorites-manager.js');
    // Mock localStorage.getItem to throw an error
    const originalGetItem = localStorage.getItem;
    localStorage.getItem = vi.fn(() => {
      throw new Error('Storage error');
    });
    const favorites = getFavorites();
    expect(favorites).toEqual([]);
    localStorage.getItem = originalGetItem;
  });
});




