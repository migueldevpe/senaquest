import { POPPINS_3D } from './poppins';
import { Text } from '@react-three/drei';
import { YawBillboard } from './YawBillboard';

/** Rótulo compartilhado: sempre voltado para a câmera, inclusive em VR. */
export function CharacterName({
  name,
  height = 2.625,
  color = '#ffffff',
}: {
  name: string;
  height?: number;
  color?: string;
}) {
  return (
    <YawBillboard position={[0, height, 0]}>
      <Text
        font={POPPINS_3D}
        fontSize={0.23}
        color={color}
        outlineWidth={0.014}
        outlineColor="#163354"
        anchorX="center"
        anchorY="middle"
      >
        {name}
      </Text>
    </YawBillboard>
  );
}
