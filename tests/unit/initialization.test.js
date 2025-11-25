import { describe, it, expect } from 'vitest';
import * as initialization from '../../static/js/core/initialization.js';

describe('initialization module', () => {
  it('exports init function', () => {
    expect(initialization.init).toBeTypeOf('function');
  });
});


