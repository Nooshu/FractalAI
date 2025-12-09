/**
 * Favorites UI Component
 * Handles the UI for managing and displaying favorites
 */

import {
  getFavorites,
  addFavorite,
  removeFavorite,
  updateFavoriteName,
  findMatchingFavorite,
} from '../discovery/favorites-manager.js';
import { triggerRetraining } from '../discovery/discovery-manager.js';

let favoritesContainer = null;
let onFavoriteSelect = null;
let getCurrentFractalState = null;

/**
 * Initialize favorites UI
 * @param {HTMLElement} container - Container element for favorites
 * @param {Function} onSelect - Callback when a favorite is selected
 * @param {Function} getState - Function to get current fractal state
 */
export function initializeFavorites(container, onSelect, getState) {
  favoritesContainer = container;
  onFavoriteSelect = onSelect;
  getCurrentFractalState = getState;
  renderFavorites();
}

/**
 * Render the favorites list
 */
export function renderFavorites() {
  if (!favoritesContainer) return;

  const favorites = getFavorites();

  if (favorites.length === 0) {
    favoritesContainer.innerHTML = `
      <div class="favorites-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
        <p>No favorites yet</p>
        <small>Add favorites to save your favorite fractal configurations</small>
      </div>
    `;
    return;
  }

  const html = favorites
    .map((fav) => {
      const date = new Date(fav.timestamp);
      return `
      <div class="favorite-item" data-id="${fav.id}">
        <div class="favorite-content">
          <div class="favorite-name" contenteditable="true" data-id="${fav.id}">${escapeHtml(fav.name)}</div>
          <div class="favorite-meta">
            <span class="favorite-type">${escapeHtml(fav.fractalType)}</span>
            <span class="favorite-date">${date.toLocaleDateString()}</span>
          </div>
        </div>
        <div class="favorite-actions">
          <button class="favorite-btn favorite-load" title="Load this favorite" data-id="${fav.id}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </button>
          <button class="favorite-btn favorite-delete" title="Delete favorite" data-id="${fav.id}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18"></path>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
      `;
    })
    .join('');

  favoritesContainer.innerHTML = html;

  // Attach event listeners
  favoritesContainer.querySelectorAll('.favorite-load').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      loadFavorite(id);
    });
  });

  favoritesContainer.querySelectorAll('.favorite-delete').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      deleteFavorite(id);
    });
  });

  favoritesContainer.querySelectorAll('.favorite-name').forEach((el) => {
    el.addEventListener('blur', (e) => {
      const id = e.currentTarget.dataset.id;
      const newName = e.currentTarget.textContent.trim();
      if (newName) {
        updateFavoriteName(id, newName);
        renderFavorites();
      }
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.currentTarget.blur();
      }
    });
  });
}

/**
 * Add current fractal as favorite
 * @returns {string|null} ID of the added favorite or null
 */
export function addCurrentAsFavorite() {
  if (!getCurrentFractalState) return null;

  const state = getCurrentFractalState();
  
  // Check if already favorited
  const existing = findMatchingFavorite(state);
  if (existing) {
    return existing.id;
  }

  const id = addFavorite(state);
  renderFavorites();
  
  // Trigger retraining in background
  setTimeout(() => {
    triggerRetraining();
  }, 1000);

  return id;
}

/**
 * Load a favorite
 * @param {string} id - Favorite ID
 */
function loadFavorite(id) {
  if (!onFavoriteSelect) return;

  const favorites = getFavorites();
  const favorite = favorites.find((fav) => fav.id === id);
  if (favorite) {
    onFavoriteSelect(favorite);
  }
}

/**
 * Delete a favorite
 * @param {string} id - Favorite ID
 */
function deleteFavorite(id) {
  if (confirm('Delete this favorite?')) {
    removeFavorite(id);
    renderFavorites();
    
    // Trigger retraining in background
    setTimeout(() => {
      triggerRetraining();
    }, 1000);
  }
}

/**
 * Check if current fractal is favorited
 * @returns {Object|null} Matching favorite or null
 */
export function isCurrentFavorited() {
  if (!getCurrentFractalState) return null;
  return findMatchingFavorite(getCurrentFractalState());
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

