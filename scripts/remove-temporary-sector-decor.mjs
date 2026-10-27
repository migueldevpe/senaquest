/**
 * Remove TODOS os placeholders setoriais temporários do SENAQUEST.
 * Não remove móveis, personagens, iluminação, regras, áudio ou dependências
 * usadas pelo jogo. Nenhuma dependência exclusiva foi adicionada ao npm.
 *
 * Uso: node scripts/remove-temporary-sector-decor.mjs
 * A operação só altera o World se todos os marcadores esperados existirem.
 */
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const scriptPath = fileURLToPath(import.meta.url);
const root = resolve(dirname(scriptPath), '..');
const worldPath = join(root, 'src', 'scene', 'World.tsx');
const world = await readFile(worldPath, 'utf8');

const targets = [
  { name: 'IMPORT', replacement: '' },
  { name: 'FLAG', replacement: '' },
  { name: 'SHELF', replacement: '' },
  { name: 'WALL', replacement: '' },
  { name: 'WORKTOP', replacement: '' },
];

let clean = world;
for (const { name, replacement } of targets) {
  const startToken = name === 'IMPORT' || name === 'FLAG'
    ? `// SENAQUEST_TEMP_DECOR_${name}_BEGIN`
    : `{/* SENAQUEST_TEMP_DECOR_${name}_BEGIN */}`;
  const endToken = name === 'IMPORT' || name === 'FLAG'
    ? `// SENAQUEST_TEMP_DECOR_${name}_END`
    : `{/* SENAQUEST_TEMP_DECOR_${name}_END */}`;
  const a = clean.indexOf(startToken);
  const b = clean.indexOf(endToken);
  if (a < 0 || b < a || clean.indexOf(startToken, a + 1) !== -1 || clean.indexOf(endToken, b + 1) !== -1) {
    throw new Error(`Marcador ${name} ausente ou duplicado; nada foi removido. Restaure a versão original antes de continuar.`);
  }
  // Remove a indentação da própria linha de marcação, mas não mexe no entorno.
  const lineStart = clean.lastIndexOf('\n', a - 1) + 1;
  const lineEnd = clean.indexOf('\n', b + endToken.length);
  if (lineEnd < 0) throw new Error(`Fim da marcação ${name} não localizado.`);
  const newText = replacement ? `${replacement}\n` : '';
  clean = clean.slice(0, lineStart) + newText + clean.slice(lineEnd + 1);
}
// A API temporária `sector` não deve permanecer no componente Shelf:
// com noUnusedLocals/noUnusedParameters ligados, isso quebraria a build.
const cleanupEdits = [
  ["  boxes = false,\n  sector,\n", ""],
  ["  boxes?: boolean;\n  sector?: 'technology' | 'logistics' | 'health';\n", ""],
  [' sector="technology"', ''],
  [' sector="logistics"', ''],
  [' sector="health"', ''],
  [' boxes />', ' />'],
];
for (const [before, after] of cleanupEdits) {
  if (!clean.includes(before)) throw new Error(`Assinatura modificada em World.tsx: ${before}`);
  clean = clean.replace(before, after);
}
if (/SENAQUEST_TEMP_DECOR_|SectorShelfDecor|AdministrationWallDecor|TechnologyWorktopDecor|TEMP_SECTOR_DECOR_MODE/.test(clean)) {
  throw new Error('Restaram referências aos placeholders em World.tsx; nada foi removido.');
}
const tempPath = `${worldPath}.temporary-clean`;
await writeFile(tempPath, clean);
await rename(tempPath, worldPath);

for (const file of [
  'src/scene/SectorDecor.tsx',
  'src/scene/sectorAssets.ts',
  'src/scene/sectorAssets.test.ts',
  'scripts/download-sector-assets.mjs',
]) {
  await rm(join(root, file), { force: true });
}
await rm(join(root, 'public', 'models', 'sector-assets'), { recursive: true, force: true });
console.log('Placeholders, GLBs locais, catálogo, downloader e testes temporários removidos.');
console.log('Estantes vazias, mobiliário permanente e lógica do jogo preservados.');
// Remoção do próprio utilitário: não restará dependência residual de placeholders.
await rm(scriptPath, { force: true });
