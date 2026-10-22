import { useLoader } from '@react-three/fiber';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import * as THREE from 'three';
import { PLAYER_COLORS } from '../../game/playerVisual';
import { FBXCharacter } from './FBXCharacter';
import { CHARACTER_CONFIG } from './characterConfig';

export function FBXPaty(props: { position: [number, number, number]; rotation: number }) {
  const source = useLoader(FBXLoader, '/models/paty/paty.fbx');
  const texture = useLoader(THREE.TextureLoader, '/models/paty/paty-uv.webp');
  return (
    <FBXCharacter
      {...props}
      playerId={2}
      name="Paty"
      color={PLAYER_COLORS[2]}
      source={source}
      uvTexture={texture}
      settings={CHARACTER_CONFIG.paty}
    />
  );
}
useLoader.preload(FBXLoader, '/models/paty/paty.fbx');
useLoader.preload(THREE.TextureLoader, '/models/paty/paty-uv.webp');
