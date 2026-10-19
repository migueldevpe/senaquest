import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { faceOnTop } from './Dice';

describe('leitura da face física do dado', () => {
  it('lê 1 no topo quando o dado está na orientação inicial', () => {
    expect(faceOnTop(new THREE.Quaternion()).value).toBe(1);
  });
  it('lê 6 ao inverter o dado', () => {
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
    expect(faceOnTop(q).value).toBe(6);
  });
  it('detecta uma face lateral no topo após um quarto de volta', () => {
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
    expect(faceOnTop(q).value).toBe(2);
  });
});
