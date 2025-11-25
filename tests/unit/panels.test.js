import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupCollapsibleSections, setupPanelToggle } from '../../static/js/ui/panels.js';

describe('panels module', () => {
  beforeEach(() => {
    vi.useFakeTimers();

    document.body.innerHTML = `
      <aside class="side-panel">
        <header class="panel-header">
          <button class="back-btn" title="Back"></button>
        </header>
      </aside>
      <button id="show-panel-btn"></button>
      <div class="section">
        <button class="section-header" data-section="one"></button>
        <div class="section-content active"></div>
      </div>
    `;
  });

  it('setupCollapsibleSections toggles active and collapsed classes', () => {
    const header = document.querySelector('.section-header');
    const content = document.querySelector('.section-content');

    setupCollapsibleSections();

    // Initially active
    expect(content.classList.contains('active')).toBe(true);

    header.click();
    expect(content.classList.contains('active')).toBe(false);
    expect(header.classList.contains('collapsed')).toBe(true);

    header.click();
    expect(content.classList.contains('active')).toBe(true);
    expect(header.classList.contains('collapsed')).toBe(false);
  });

  it('setupPanelToggle toggles side panel hidden class and calls updateRendererSize', () => {
    const updateRendererSize = vi.fn();

    setupPanelToggle(updateRendererSize);

    const sidePanel = document.querySelector('.side-panel');
    const backBtn = document.querySelector('.back-btn');
    const showPanelBtn = document.getElementById('show-panel-btn');

    // Hide
    backBtn.click();
    expect(sidePanel.classList.contains('hidden')).toBe(true);

    // Fast-forward the resize timeout
    vi.runAllTimers();

    // Show
    showPanelBtn.click();
    expect(sidePanel.classList.contains('hidden')).toBe(false);
  });
});


