import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { unlockBackgroundMusic } from '../game/backgroundMusic';

/** O Quest usa eventos WebXR, não obrigatoriamente pointerdown da janela. */
export function XRMusicUnlock() {
  const { gl } = useThree();
  useEffect(() => {
    let session: XRSession | null = null;
    const unlock = () => unlockBackgroundMusic();
    const detach = () => {
      if (!session) return;
      session?.removeEventListener('select', unlock);
      session?.removeEventListener('squeeze', unlock);
      session = null;
    };
    const attach = () => {
      detach();
      session = gl.xr.getSession();
      session?.addEventListener('select', unlock);
      session?.addEventListener('squeeze', unlock);
    };
    gl.xr.addEventListener('sessionstart', attach);
    gl.xr.addEventListener('sessionend', detach);
    attach();
    return () => {
      detach();
      gl.xr.removeEventListener('sessionstart', attach);
      gl.xr.removeEventListener('sessionend', detach);
    };
  }, [gl]);
  return null;
}
