/** Fonte Poppins local para textos 3D (Troika/Drei). */
import poppins500 from '@fontsource/poppins/files/poppins-latin-500-normal.woff?url';

export const POPPINS_3D = poppins500;

/** Solicita os pesos usados nos Canvas antes do primeiro desenho. */
export async function loadPoppinsCanvas(): Promise<void> {
  await Promise.all(
    [400, 500, 600, 700, 800].map((weight) => document.fonts.load(`${weight} 24px Poppins`)),
  );
}
