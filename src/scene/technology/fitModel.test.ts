import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { fitModel } from './fitModel';

describe('Encaixe compartilhado dos modelos de Tecnologia', () => {
  it('preserva a proporção e apoia o modelo pelo menor Y', () => {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 1));
    mesh.position.set(4, 5, -2);
    group.add(mesh);
    const result = fitModel(group, [1, 2, 1]);
    expect(result).not.toBeNull();
    expect(result!.scale).toBeCloseTo(0.5);
    expect(result!.offset).toEqual([-4, -3.5, 2]);
    mesh.geometry.dispose();
  });

  it('não tenta posicionar um objeto vazio', () => {
    expect(fitModel(new THREE.Group(), [1, 1, 1])).toBeNull();
  });
});
