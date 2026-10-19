/** Ajustes por personagem. Mude apenas targetHeight da Paty para testar sua escala. */
export type CharacterSettings = {
  targetHeight: number;
  seatTop: number;
  hipClearance: number;
  seatDepthOffset: number;
  nameHeight: number;
  crownHeight: number;
  crownScale: number;
};

export const CHARACTER_CONFIG = {
  textureAnisotropy: 4,
  chico: {
    targetHeight: 2.85,
    seatTop: 0.805,
    hipClearance: 0.19,
    seatDepthOffset: 0.07,
    nameHeight: 2.625,
    crownHeight: 2.43,
    crownScale: 1.08,
  },
  paty: {
    targetHeight: 2.7, // Altura aprovada para a Paty.
    seatTop: 0.805,
    hipClearance: 0.19,
    seatDepthOffset: 0.07,
    nameHeight: 2.625,
    crownHeight: 2.39,
    crownScale: 0.93,
  },
} as const satisfies {
  textureAnisotropy: number;
  chico: CharacterSettings;
  paty: CharacterSettings;
};
