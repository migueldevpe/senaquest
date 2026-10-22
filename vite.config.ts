import { defineConfig } from 'vite';

export default defineConfig({
  // React Three Fiber, XR e bibliotecas auxiliares devem compartilhar o mesmo
  // THREE. O lockfile ainda pode listar versões transitivas distintas, mas
  // o resolver do Vite apontará os imports de runtime para a cópia raiz.
  resolve: {
    dedupe: ['three', 'react', 'react-dom', '@react-three/fiber'],
  },
});
