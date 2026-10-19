import { useLoader } from '@react-three/fiber';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import * as THREE from 'three';
import { PLAYER_COLORS } from '../../game/playerVisual';
import { FBXCharacter } from './FBXCharacter';
import { CHARACTER_CONFIG } from './characterConfig';

export function FBXChico(props: { position: [number, number, number]; rotation: number }) {
  const source = useLoader(FBXLoader, '/models/chico.fbx');
  const texture = useLoader(THREE.TextureLoader, '/models/chico-uv.webp');
  return (
    <FBXCharacter
      {...props}
      playerId={3}
      name="Chico"
      color={PLAYER_COLORS[3]}
      source={source}
      uvTexture={texture}
      settings={CHARACTER_CONFIG.chico}
    />
  );
}
useLoader.preload(FBXLoader, '/models/chico.fbx');
useLoader.preload(THREE.TextureLoader, '/models/chico-uv.webp');
