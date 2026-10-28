import { describe, expect, it } from 'vitest';
import { REQUIRED_ASSETS } from './preloadManifest';

describe('Ativos de Logística e identidade visual', () => {
  it('inclui apenas a logo oficial com contorno e os assets de logística no preload', () => {
    expect(REQUIRED_ASSETS).toContain('/branding/senaquest-logo-outline.webp');
    expect(REQUIRED_ASSETS).not.toContain('/branding/senaquest-logo.webp');
    expect(REQUIRED_ASSETS).toContain('/audio/musicmenu.opus');
    expect(REQUIRED_ASSETS).toContain('/audio/musicquestionary.opus');
    expect(REQUIRED_ASSETS).toContain('/audio/musicgameplay.opus');
    expect(REQUIRED_ASSETS).toContain('/audio/musicafterquestionary.opus');
    expect(REQUIRED_ASSETS).toContain('/audio/musicwin.opus');
    expect(REQUIRED_ASSETS).toContain('/models/logistics/cash-register/CashRegister.fbx');
    expect(REQUIRED_ASSETS).toContain('/models/logistics/cash-register/CashRegister.webp');
    expect(REQUIRED_ASSETS).toContain('/models/logistics/payment-terminal/paymentterminal.fbx');
    expect(REQUIRED_ASSETS).toContain(
      '/models/logistics/payment-terminal/payment_terminal_surface.webp',
    );
    expect(REQUIRED_ASSETS).toContain('/textures/administration-wood.webp');
    expect(REQUIRED_ASSETS).toContain('/models/logistics/box/box.fbx');
    expect(REQUIRED_ASSETS).toContain('/models/logistics/box/box.webp');
    expect(REQUIRED_ASSETS).toContain('/models/logistics/boxes/boxes.fbx');
    expect(REQUIRED_ASSETS).toContain('/models/logistics/boxes/cardboard_albedo.webp');
    expect(REQUIRED_ASSETS).toContain('/models/logistics/boxes/cardboard_normal.webp');
    expect(REQUIRED_ASSETS).toContain('/models/logistics/boxes/cardboard_roughness.webp');
    expect(REQUIRED_ASSETS).toContain('/models/logistics/boxes/cardboard_height.webp');
    expect(REQUIRED_ASSETS).toContain('/models/logistics/boxes/warning-symbols.webp');
  });
});
