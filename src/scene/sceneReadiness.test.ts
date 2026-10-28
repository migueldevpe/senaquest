import { describe, expect, it } from 'vitest';
import { isRoomMounted } from './sceneReadiness';

describe('isRoomMounted', () => {
  it('waits for the classroom to exist', () => {
    const scene = { getObjectByName: () => undefined };

    expect(isRoomMounted(scene)).toBe(false);
    const renderedRoom = {
      getObjectByName: (name: string) => (name === 'room-wall-back' ? {} : undefined),
    };
    expect(isRoomMounted(renderedRoom)).toBe(true);
  });

  it('does not wait for independently loaded desk models', () => {
    const scene = {
      getObjectByName: (name: string) => (name === 'room-wall-back' ? {} : undefined),
    };
    expect(isRoomMounted(scene)).toBe(true);
  });
});
