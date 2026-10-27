/** Face interna das paredes: centro +/-8 m com espessura 0,18 m.
 * Aplica uma folga de 5 mm para evitar z-fighting com o revestimento.
 * O encaixe e os móveis encostados devem usar a face INTERNA, não o centro da parede.
 */
export const ROOM_WALL = {
  halfExtent: 8,
  thickness: 0.18,
  clearance: 0.005,
} as const;

export const ROOM_INNER_FACE = ROOM_WALL.halfExtent - ROOM_WALL.thickness / 2;

/** Distância positiva do centro ao centro de uma placa de parede. */
export function wallPanelDistance(panelThickness: number): number {
  return ROOM_INNER_FACE - panelThickness / 2 - ROOM_WALL.clearance;
}

/** Administração: o painel roxo está em Z local=-0,04 e tem 0,075 de espessura.
 * O grupo gira +90 graus, transformando Z local em +X global.
 * Suas costas devem encontrar a face interna da parede esquerda.
 */
export function administrationExhibitX(): number {
  const backboardBackZ = -0.04 - 0.075 / 2;
  return -ROOM_INNER_FACE + ROOM_WALL.clearance - backboardBackZ;
}

/** Centro X da estante depois da rotação. O ponto X configurado marca a
 * face traseira voltada à parede direita, não o centro do FBX.
 */
export function shelfCenterFromBackFaceX(
  backFaceX: number,
  rotationY: number,
  scaledWidth: number,
  scaledDepth: number,
): number {
  const halfExtentX =
    (Math.abs(Math.cos(rotationY)) * scaledWidth) / 2 +
    (Math.abs(Math.sin(rotationY)) * scaledDepth) / 2;
  return backFaceX - halfExtentX;
}

/** Plano real do piso e altura do rodapé; a face inferior encosta no piso. */
export const FLOOR_Y = -0.02;
export const BASEBOARD_HEIGHT = 0.18;
export const BASEBOARD_CENTER_Y = FLOOR_Y + BASEBOARD_HEIGHT / 2;
