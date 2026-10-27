import { describe, expect, it } from 'vitest';
import {
  ROOM_INNER_FACE,
  ROOM_WALL,
  wallPanelDistance,
  administrationExhibitX,
  shelfCenterFromBackFaceX,
  BASEBOARD_HEIGHT,
  BASEBOARD_CENTER_Y,
  FLOOR_Y,
} from './roomWallPlacement';

describe('Encaixe dos painéis e móveis às paredes', () => {
  it('mantém o rodapé apoiado diretamente no piso', () => {
    expect(BASEBOARD_CENTER_Y - BASEBOARD_HEIGHT / 2).toBeCloseTo(FLOOR_Y, 6);
  });

  it('coloca os quatro painéis a 5 mm da face interna da parede', () => {
    const center = wallPanelDistance(0.1);
    expect(center).toBeCloseTo(7.855, 6);
    expect(ROOM_INNER_FACE - (center + 0.1 / 2)).toBeCloseTo(ROOM_WALL.clearance, 6);
  });

  it('encaixa a parte traseira do expositor roxo na parede esquerda', () => {
    const backboardBackZ = -0.04 - 0.075 / 2;
    expect(administrationExhibitX() + backboardBackZ).toBeCloseTo(
      -ROOM_INNER_FACE + ROOM_WALL.clearance,
      6,
    );
  });

  it('mantém a parte traseira do FBX de Logística encostada após escala e rotação', () => {
    const backFace = ROOM_INNER_FACE - ROOM_WALL.clearance;
    const width = 2.3;
    const depth = 0.35; // Exemplo de profundidade real após scale de fitting.
    const yaw = -Math.PI / 2;
    const center = shelfCenterFromBackFaceX(backFace, yaw, width, depth);
    const projectedHalfX =
      (Math.abs(Math.cos(yaw)) * width) / 2 + (Math.abs(Math.sin(yaw)) * depth) / 2;
    expect(center + projectedHalfX).toBeCloseTo(backFace, 6);
  });
});
