export const MINIMUM_VIEWPORT = {
  width: 1024,
  height: 600,
} as const;

export function isBelowMinimumViewport(width: number, height: number): boolean {
  return width < MINIMUM_VIEWPORT.width || height < MINIMUM_VIEWPORT.height;
}
