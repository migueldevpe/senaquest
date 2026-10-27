/** Medidas da superfície virtual do tablet; independentes da resolução do visor. */
export const TABLET = {
  width: 1200,
  height: 740,
  inset: 42,
  gap: 20,
  cardGap: 18,
  timer: { x: 42, y: 26, w: 1116, h: 107 },
  timerText: { inset: 20, centerY: 32 },
  timerTrack: { inset: 20, top: 76, height: 12, radius: 6 },
  header: { y: 166, titleY: 187, messageY: 257, h: 118 },
  content: { y: 302, bottom: 565 },
  footer: { y: 583, h: 98 },
} as const;
export type Rect = { x: number; y: number; w: number; h: number };
/** Grid de colunas igualmente dimensionadas (equivalente a grid + gap). */
export function tabletGrid(
  columns: number,
  count: number,
  x: number,
  y: number,
  width: number,
  cellHeight: number,
  columnGap: number = TABLET.gap,
  rowGap: number = TABLET.cardGap,
): Rect[] {
  if (columns < 1 || count < 0 || cellHeight <= 0 || width <= 0) return [];
  const cw = (width - (columns - 1) * columnGap) / columns;
  return Array.from({ length: count }, (_, i) => ({
    x: x + (i % columns) * (cw + columnGap),
    y: y + Math.floor(i / columns) * (cellHeight + rowGap),
    w: cw,
    h: cellHeight,
  }));
}
/** Equivalente a flex com justify-content: space-between; para uma ação, centraliza. */
export function tabletActions(
  widths: number[],
  y: number = TABLET.footer.y,
  height: number = TABLET.footer.h,
): Rect[] {
  if (!widths.length) return [];
  const available = TABLET.width - TABLET.inset * 2;
  const sum = widths.reduce((v, w) => v + w, 0);
  if (sum > available) throw new Error('Ações ultrapassam a largura útil do tablet');
  const free = available - sum;
  let x = widths.length === 1 ? TABLET.inset + free / 2 : TABLET.inset;
  return widths.map((w) => {
    const rect = { x, y, w, h: height };
    x += w + (widths.length > 1 ? free / (widths.length - 1) : 0);
    return rect;
  });
}
/** Quebra de palavras por largura real, não por contagem de caracteres. */
export function tabletWrap(
  text: string,
  measure: (text: string) => number,
  width: number,
): string[] {
  const result: string[] = [];
  for (const paragraph of String(text).split(/\n/)) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && measure(candidate) > width) {
        result.push(line);
        line = word;
      } else line = candidate;
    }
    if (line) result.push(line);
  }
  return result.length ? result : [''];
}
/** Recorta texto de forma a nunca desenhar fora da região disponível. */
export function tabletEllipsis(
  text: string,
  measure: (text: string) => number,
  width: number,
): string {
  if (measure(text) <= width) return text;
  let truncated = text;
  while (truncated.length && measure(`${truncated}…`) > width) truncated = truncated.slice(0, -1);
  return `${truncated}…`;
}

/** Coordenadas únicas da barra de progresso: fundo e preenchimento usam o mesmo retângulo. */
export function tabletTimerRects() {
  const t = TABLET.timer;
  const track = TABLET.timerTrack;
  const background: Rect = {
    x: t.x + track.inset,
    y: t.y + track.top,
    w: t.w - track.inset * 2,
    h: track.height,
  };
  // Recuo real, inclusive nas extremidades arredondadas (o preenchimento
  // nunca vaza mesmo com 100% e inclinação/anti-aliasing no headset).
  const inner = 3;
  const fill: Rect = {
    x: background.x + inner,
    y: background.y + 2,
    w: background.w - inner * 2,
    h: background.h - 4,
  };
  return { background, fill };
}

/** Converte a geometria do Canvas para o mesmo plano 3D do tablet. */
export function tabletRectToWorld(rect: Rect, planeW = 1.18, planeH = 0.7) {
  return {
    x: (rect.x + rect.w / 2) * (planeW / TABLET.width) - planeW / 2,
    y: planeH / 2 - (rect.y + rect.h / 2) * (planeH / TABLET.height),
    w: rect.w * (planeW / TABLET.width),
    h: rect.h * (planeH / TABLET.height),
  };
}
