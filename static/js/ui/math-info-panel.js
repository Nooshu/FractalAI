/**
 * Mathematical Information Panel
 * Displays mathematical information about the current fractal
 */

import { getFractalInfo, getDiscovererWikipediaUrl } from '../fractals/fractal-info.js';
import { getWikipediaUrl } from '../fractals/fractal-config.js';

/**
 * Setup the Mathematical Information Panel
 * @param {Object} callbacks - Callback functions
 * @param {Function} callbacks.getCurrentFractalType - Get current fractal type
 * @param {Function} callbacks.loadFractal - Load a fractal by type
 */
export function setupMathInfoPanel(callbacks) {
  const { getCurrentFractalType, loadFractal } = callbacks;

  const content = document.getElementById('math-info-content');
  if (!content) return;

  // Initial render (will use plain text if KaTeX not loaded yet)
  updatePanel(getCurrentFractalType());

  // Listen for fractal changes
  window.addEventListener('fractal-updated', (event) => {
    const fractalType = event.detail?.fractalType || getCurrentFractalType();
    updatePanel(fractalType);
  });

  // Listen for KaTeX load event (triggered when lazy loaded)
  window.addEventListener('katex-loaded', () => {
    // Re-render when KaTeX becomes available
    updatePanel(getCurrentFractalType());
  });

  /**
   * Update the panel with information for the current fractal
   * @param {string} fractalType - The fractal type
   */
  function updatePanel(fractalType) {
    if (!fractalType) {
      renderFallback(content, 'No fractal selected');
      return;
    }

    const info = getFractalInfo(fractalType);

    if (!info) {
      renderFallback(content, fractalType);
      return;
    }

    // Clear existing content
    content.innerHTML = '';

    // Render each section
    renderHeader(content, info);
    renderFormulas(content, info.formulas);
    renderProperties(content, info.properties);
    renderHistory(content, info.history);
    renderRelatedFractals(content, info.relatedFractals, loadFractal);
    renderWikipediaLink(content, fractalType);
  }

  /**
   * Render the fractal name header
   */
  function renderHeader(container, info) {
    const header = document.createElement('div');
    header.className = 'math-info-header';
    header.innerHTML = `
      <h3 class="fractal-name">${info.name}</h3>
      <p class="fractal-family">${info.family.replace('-family', '').replace(/-/g, ' ')}</p>
    `;
    container.appendChild(header);
  }

  /**
   * Render formulas section
   */
  function renderFormulas(container, formulas) {
    if (!formulas || formulas.length === 0) return;

    const section = document.createElement('div');
    section.className = 'math-info-section';

    const title = document.createElement('h4');
    title.className = 'math-info-title';
    title.textContent = 'Formulas';
    section.appendChild(title);

    formulas.forEach(formula => {
      const formulaDiv = document.createElement('div');
      formulaDiv.className = 'math-info-formula';

      if (formula.title) {
        const formulaTitle = document.createElement('div');
        formulaTitle.className = 'formula-title';
        formulaTitle.textContent = formula.title;
        formulaDiv.appendChild(formulaTitle);
      }

      const formulaText = document.createElement('div');
      formulaText.className = 'formula-text';

      // Render LaTeX if available, otherwise use plain text
      if (formula.latex && window.katex) {
        try {
          // Use KaTeX to render the LaTeX formula
          window.katex.render(formula.latex, formulaText, {
            throwOnError: false,
            displayMode: false,
            fleqn: false,
          });
        } catch (error) {
          // Fallback to plain text if LaTeX rendering fails
          console.warn('LaTeX rendering error:', error);
          formulaText.textContent = formula.plainText || formula.latex || '';
        }
      } else {
        // Fallback to plain text if KaTeX is not loaded or no LaTeX available
        formulaText.textContent = formula.plainText || formula.latex || '';

        // If we have LaTeX but KaTeX isn't loaded yet, show a note
        if (formula.latex && !window.katex) {
          formulaText.title = 'LaTeX rendering will appear when panel is opened';
        }
      }

      formulaDiv.appendChild(formulaText);

      if (formula.description) {
        const formulaDesc = document.createElement('div');
        formulaDesc.className = 'formula-description';
        formulaDesc.textContent = formula.description;
        formulaDiv.appendChild(formulaDesc);
      }

      section.appendChild(formulaDiv);
    });

    container.appendChild(section);
  }

  /**
   * Render properties section
   */
  function renderProperties(container, properties) {
    if (!properties) return;

    const section = document.createElement('div');
    section.className = 'math-info-section';

    const title = document.createElement('h4');
    title.className = 'math-info-title';
    title.textContent = 'Properties';
    section.appendChild(title);

    const propsList = document.createElement('ul');
    propsList.className = 'math-info-properties';

    if (properties.fractalDimension) {
      addProperty(propsList, 'Fractal Dimension', properties.fractalDimension);
    }
    if (properties.selfSimilar !== undefined) {
      addProperty(propsList, 'Self-Similar', properties.selfSimilar ? 'Yes' : 'No');
    }
    if (properties.discovered) {
      addProperty(propsList, 'Discovered', properties.discovered);
    }
    if (properties.discoverer) {
      addProperty(propsList, 'Discoverer', properties.discoverer);
    }
    if (properties.complexity) {
      addProperty(propsList, 'Complexity', properties.complexity);
    }

    section.appendChild(propsList);
    container.appendChild(section);
  }

  /**
   * Get Wikipedia URL for Big O notation explanation
   * @returns {string} Wikipedia URL for Big O notation
   */
  function getComplexityExplanationUrl() {
    return 'https://en.wikipedia.org/wiki/Big_O_notation';
  }

  /**
   * Get Wikipedia URL for fractal dimension explanation
   * @returns {string} Wikipedia URL for fractal dimension
   */
  function getFractalDimensionExplanationUrl() {
    return 'https://en.wikipedia.org/wiki/Fractal_dimension';
  }

  /**
   * Add a property to the list
   */
  function addProperty(list, label, value) {
    const item = document.createElement('li');

    // Special handling for Fractal Dimension - make the label clickable
    if (label === 'Fractal Dimension') {
      const dimensionUrl = getFractalDimensionExplanationUrl();
      const strong = document.createElement('strong');

      const labelLink = document.createElement('a');
      labelLink.href = dimensionUrl;
      labelLink.target = '_blank';
      labelLink.rel = 'noopener noreferrer';
      labelLink.textContent = label;
      labelLink.className = 'property-label-link';
      labelLink.title = 'Learn about fractal dimension on Wikipedia';

      strong.appendChild(labelLink);
      strong.appendChild(document.createTextNode(': '));

      item.appendChild(strong);
      item.appendChild(document.createTextNode(value));
    }
    // Special handling for discoverer - make it a clickable link
    else if (label === 'Discoverer') {
      const discovererUrl = getDiscovererWikipediaUrl(value);
      if (discovererUrl) {
        const link = document.createElement('a');
        link.href = discovererUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = value;
        link.className = 'discoverer-link';
        link.title = `Learn more about ${value} on Wikipedia`;

        const strong = document.createElement('strong');
        strong.textContent = `${label}: `;

        item.appendChild(strong);
        item.appendChild(link);
      } else {
        // Fallback if no Wikipedia URL found
        item.innerHTML = `<strong>${label}:</strong> ${value}`;
      }
    } else if (label === 'Complexity') {
      // Special handling for complexity - make the Big O notation clickable
      const complexityUrl = getComplexityExplanationUrl();
      const strong = document.createElement('strong');
      strong.textContent = `${label}: `;

      // Check if value contains Big O notation (O(...))
      const bigOMatch = value.match(/(O\([^)]+\))/);

      if (bigOMatch) {
        const bigONotation = bigOMatch[1];
        const beforeBigO = value.substring(0, bigOMatch.index);
        const afterBigO = value.substring(bigOMatch.index + bigONotation.length);

        item.appendChild(strong);

        if (beforeBigO) {
          const beforeText = document.createTextNode(beforeBigO);
          item.appendChild(beforeText);
        }

        const link = document.createElement('a');
        link.href = complexityUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = bigONotation;
        link.className = 'complexity-link';
        link.title = 'Learn about Big O notation on Wikipedia';
        item.appendChild(link);

        if (afterBigO) {
          const afterText = document.createTextNode(afterBigO);
          item.appendChild(afterText);
        }
      } else {
        // No Big O notation found, just display as normal
        item.innerHTML = `<strong>${label}:</strong> ${value}`;
      }
    } else {
      item.innerHTML = `<strong>${label}:</strong> ${value}`;
    }

    list.appendChild(item);
  }

  /**
   * Render history section
   */
  function renderHistory(container, history) {
    if (!history) return;

    const section = document.createElement('div');
    section.className = 'math-info-section';

    const title = document.createElement('h4');
    title.className = 'math-info-title';
    title.textContent = 'History';
    section.appendChild(title);

    const historyText = document.createElement('p');
    historyText.className = 'math-info-text';
    historyText.textContent = history;
    section.appendChild(historyText);

    container.appendChild(section);
  }

  /**
   * Render related fractals section
   */
  function renderRelatedFractals(container, relatedFractals, loadFractal) {
    if (!relatedFractals || relatedFractals.length === 0) return;

    const section = document.createElement('div');
    section.className = 'math-info-section';

    const title = document.createElement('h4');
    title.className = 'math-info-title';
    title.textContent = 'Related Fractals';
    section.appendChild(title);

    const relatedList = document.createElement('div');
    relatedList.className = 'math-info-related';

    relatedFractals.forEach(related => {
      const chip = document.createElement('span');
      chip.className = 'related-fractal-chip';
      chip.textContent = related.name;
      chip.title = related.relationship || '';
      chip.addEventListener('click', () => {
        if (loadFractal) {
          loadFractal(related.type);
        }
      });
      relatedList.appendChild(chip);
    });

    section.appendChild(relatedList);
    container.appendChild(section);
  }

  /**
   * Render Wikipedia link
   */
  function renderWikipediaLink(container, fractalType) {
    const url = getWikipediaUrl(fractalType);

    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'math-info-wikipedia-link';
    link.textContent = 'Learn More on Wikipedia →';

    container.appendChild(link);
  }

  /**
   * Render fallback when no specific info is available
   */
  function renderFallback(container, fractalType) {
    container.innerHTML = `
      <div class="math-info-fallback">
        <p>Mathematical information for "${fractalType}" is coming soon.</p>
        <a href="https://en.wikipedia.org/wiki/Fractal" target="_blank" rel="noopener noreferrer" class="math-info-wikipedia-link">
          Learn about fractals on Wikipedia →
        </a>
      </div>
    `;
  }
}

