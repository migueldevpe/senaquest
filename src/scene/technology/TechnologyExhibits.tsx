/** Montagem do setor de Tecnologia em um único ponto da cena.
 * Posições e dimensões ficam exclusivamente em modelPlacements.ts. */
import { TechnologySectorModels } from './TechnologySectorModels';
import { TechnologyAccessories } from './TechnologyAccessories';
import { TechnologyTVHeadphones } from './TechnologyTVHeadphones';
import { TechnologyLaptop } from './TechnologyLaptop';
import { TechnologyPCStack } from './TechnologyPCStack';

export function TechnologyExhibits() {
  return (
    <>
      <TechnologySectorModels />
      <TechnologyAccessories />
      <TechnologyTVHeadphones />
      <TechnologyLaptop />
      <TechnologyPCStack />
    </>
  );
}
