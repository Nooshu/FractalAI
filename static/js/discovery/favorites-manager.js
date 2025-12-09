/**
 * Favorites Manager
 * Handles storage and retrieval of user favorite fractal configurations
 */

const FAVORITES_STORAGE_KEY = 'fractalai_favorites';

/**
 * Get all favorites from localStorage
 * @returns {Array} Array of favorite fractal configurations
 */
export function getFavorites() {
  try {
    const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load favorites:', error);
  }
  return [];
}

/**
 * Save favorites to localStorage
 * @param {Array} favorites - Array of favorite fractal configurations
 */
export function saveFavorites(favorites) {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  } catch (error) {
    console.error('Failed to save favorites:', error);
  }
}

/**
 * Add a favorite fractal configuration
 * @param {Object} fractalState - Fractal state to save
 * @param {string} name - Optional name for the favorite
 * @returns {string} ID of the saved favorite
 */
export function addFavorite(fractalState, name = null) {
  const favorites = getFavorites();
  const id = `fav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const favorite = {
    id,
    name: name || `Favorite ${favorites.length + 1}`,
    timestamp: Date.now(),
    ...fractalState,
  };
  favorites.push(favorite);
  saveFavorites(favorites);
  return id;
}

/**
 * Remove a favorite by ID
 * @param {string} id - ID of the favorite to remove
 * @returns {boolean} True if removed successfully
 */
export function removeFavorite(id) {
  const favorites = getFavorites();
  const index = favorites.findIndex((fav) => fav.id === id);
  if (index !== -1) {
    favorites.splice(index, 1);
    saveFavorites(favorites);
    return true;
  }
  return false;
}

/**
 * Update a favorite's name
 * @param {string} id - ID of the favorite
 * @param {string} name - New name
 * @returns {boolean} True if updated successfully
 */
export function updateFavoriteName(id, name) {
  const favorites = getFavorites();
  const favorite = favorites.find((fav) => fav.id === id);
  if (favorite) {
    favorite.name = name;
    saveFavorites(favorites);
    return true;
  }
  return false;
}

/**
 * Get a favorite by ID
 * @param {string} id - ID of the favorite
 * @returns {Object|null} Favorite object or null if not found
 */
export function getFavorite(id) {
  const favorites = getFavorites();
  return favorites.find((fav) => fav.id === id) || null;
}

/**
 * Check if current fractal state is already favorited
 * @param {Object} fractalState - Current fractal state to check
 * @returns {Object|null} Matching favorite or null
 */
export function findMatchingFavorite(fractalState) {
  const favorites = getFavorites();
  return (
    favorites.find((fav) => {
      return (
        fav.fractalType === fractalState.fractalType &&
        Math.abs(fav.zoom - fractalState.zoom) < 0.001 &&
        Math.abs(fav.offsetX - fractalState.offsetX) < 0.001 &&
        Math.abs(fav.offsetY - fractalState.offsetY) < 0.001 &&
        fav.colorScheme === fractalState.colorScheme &&
        fav.iterations === fractalState.iterations
      );
    }) || null
  );
}

