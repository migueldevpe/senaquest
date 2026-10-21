import { useTexture } from '@react-three/drei';
import { useLoader } from '@react-three/fiber';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { PLAYER_COLORS } from '../../game/playerVisual';
import { FBXCharacter } from './FBXCharacter';
import { CHARACTER_CONFIG } from './characterConfig';

/** Claudinha FBX: mesmas animações, otimizações e escala inicial da Paty. */
export function FBXClaudinha(props: { position: [number, number, number]; rotation: number }) {
  const source = useLoader(FBXLoader, '/models/claudinha.fbx');
  const uvTexture = useTexture('/models/claudinha-uv.webp');
  uvTexture.flipY = true; // FBX: manter a orientação UV usada pelo carregador de texturas.
  return (
    <FBXCharacter
      {...props}
      playerId={1}
      name="Claudinha"
      color={PLAYER_COLORS[1]}
      source={source}
      uvTexture={uvTexture}
      settings={CHARACTER_CONFIG.claudinha}
    />
  );
}
useLoader.preload(FBXLoader, '/models/claudinha.fbx');
