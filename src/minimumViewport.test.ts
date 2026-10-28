import { describe, expect, it } from 'vitest';
import { isBelowMinimumViewport, MINIMUM_VIEWPORT } from './minimumViewport';

describe('isBelowMinimumViewport', () => {
  it('accepts the minimum size and larger viewports', () => {
    expect(isBelowMinimumViewport(MINIMUM_VIEWPORT.width, MINIMUM_VIEWPORT.height)).toBe(false);
    expect(isBelowMinimumViewport(1920, 1080)).toBe(false);
  });

  it('blocks when either viewport dimension is below the minimum', () => {
    expect(isBelowMinimumViewport(1023, 900)).toBe(true);
    expect(isBelowMinimumViewport(1280, 599)).toBe(true);
  });
});
