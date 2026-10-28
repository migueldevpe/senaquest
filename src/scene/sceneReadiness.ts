type SceneLookup = {
  getObjectByName: (name: string) => unknown;
};

export function isRoomMounted(scene: SceneLookup): boolean {
  return Boolean(scene.getObjectByName('room-wall-back'));
}
