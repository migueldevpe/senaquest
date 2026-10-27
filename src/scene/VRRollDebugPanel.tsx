import { useState } from 'react';

/** UI de diagnóstico: só é montada no dev server com ?xr-roll-test=1. */
export function VRRollDebugPanel({
  degrees,
  setDegrees,
  status,
}: {
  degrees: number;
  setDegrees: (value: number) => void;
  status: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const preset = [-90, -45, -30, -15, 0, 15, 30, 45, 90];
  return (
    <aside
      aria-label="Teste de inclinação lateral XR"
      style={{
        position: 'fixed',
        top: 12,
        left: 12,
        zIndex: 9500,
        width: 310,
        maxWidth: 'calc(100vw - 24px)',
        padding: 12,
        borderRadius: 12,
        background: 'rgba(8,24,42,.94)',
        border: '1px solid #ff981a',
        boxShadow: '0 5px 25px #0009',
        color: '#fff',
        font: '13px system-ui, sans-serif',
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}
      >
        <strong>TESTE XR · Inclinação lateral</strong>
        <button
          type="button"
          aria-label={collapsed ? 'Expandir teste' : 'Recolher teste'}
          onClick={() => setCollapsed((v) => !v)}
          style={{ cursor: 'pointer' }}
        >
          {collapsed ? '+' : '−'}
        </button>
      </div>
      {!collapsed && (
        <>
          <p style={{ margin: '8px 0' }}>
            Roll (eixo da visão):{' '}
            <strong>
              {degrees > 0 ? '+' : ''}
              {degrees}°
            </strong>
          </p>
          <input
            aria-label="Inclinação lateral em graus"
            type="range"
            min={-90}
            max={90}
            step={1}
            value={degrees}
            onChange={(event) => setDegrees(Number(event.target.value))}
            style={{ width: '100%', accentColor: '#ff981a' }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, margin: '8px 0' }}>
            {preset.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setDegrees(value)}
                aria-pressed={degrees === value}
                style={{
                  cursor: 'pointer',
                  padding: '5px 7px',
                  borderRadius: 6,
                  border: '1px solid #68809b',
                  background: degrees === value ? '#ff981a' : '#17476a',
                  color: degrees === value ? '#102d4c' : '#fff',
                }}
              >
                {value > 0 ? '+' : ''}
                {value}°
              </button>
            ))}
          </div>
          <p
            role="status"
            style={{ margin: '8px 0', color: status.startsWith('ATENÇÃO') ? '#ffbd86' : '#abe9b6' }}
          >
            {status}
          </p>
          <p style={{ opacity: 0.85, margin: 0, lineHeight: 1.4 }}>
            Atalhos: [ e ] mudam 15°; \ retorna a 0°. Teste visual em desenvolvimento: inclina a
            câmera no desktop ou o rig do XR em torno da posição dos olhos. No modo XR, também
            altera temporariamente a orientação dos controles; não simula os sensores físicos do
            Quest.
          </p>
        </>
      )}
    </aside>
  );
}
