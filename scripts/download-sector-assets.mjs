/*
 * Baixa GLBs CC0 do Kenney para inclusão OFFLINE no SENAQUEST.
 * Execute: node scripts/download-sector-assets.mjs
 * Requer Node 20+ e conexão à internet na máquina do desenvolvedor.
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const targetRoot = join(root, 'public', 'models', 'sector-assets');
const manifestPath = join(targetRoot, 'index.json');
const files = [
  "car-kit/box.glb",
  "car-kit/cone.glb",
  "car-kit/delivery.glb",
  "car-kit/truck.glb",
  "car-kit/van.glb",
  "furniture-kit/books.glb",
  "furniture-kit/cardboardboxclosed.glb",
  "furniture-kit/cardboardboxopen.glb",
  "furniture-kit/computerkeyboard.glb",
  "furniture-kit/computermouse.glb",
  "furniture-kit/computerscreen.glb",
  "furniture-kit/laptop.glb",
  "furniture-kit/plantsmall1.glb",
  "furniture-kit/plantsmall2.glb",
  "furniture-kit/plantsmall3.glb",
  "furniture-kit/pottedplant.glb",
  "furniture-kit/radio.glb",
  "furniture-kit/sidetabledrawers.glb",
  "furniture-kit/speaker.glb",
  "furniture-kit/speakersmall.glb",
  "prototype-kit/crate-color.glb",
  "prototype-kit/hat-hard.glb"
];
const mirrors = [
  'https://cdn.jsdelivr.net/gh/Hidencod/tge-assets@main/packs/',
  'https://raw.githubusercontent.com/Hidencod/tge-assets/main/packs/',
];

function isGLB(data) {
  return data.length >= 20 && data.toString('ascii', 0, 4) === 'glTF' && data.readUInt32LE(4) === 2 && data.readUInt32LE(8) === data.length;
}

await mkdir(targetRoot, { recursive: true });
let existing = [];
try {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (Array.isArray(manifest.files)) existing = manifest.files.filter((name) => files.includes(name));
} catch { /* primeira execução */ }
const downloaded = new Set();
let failures = 0;
let bytes = 0;
for (const file of files) {
  const dest = join(targetRoot, file);
  await mkdir(dirname(dest), { recursive: true });
  try {
    const local = await readFile(dest);
    if (isGLB(local)) {
      downloaded.add(file);
      console.log(`[já existe] ${file}`);
      continue;
    }
  } catch { /* arquivo ainda não baixado */ }
  let content;
  for (const mirror of mirrors) {
    try {
      const response = await fetch(`${mirror}${file}`, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const candidate = Buffer.from(await response.arrayBuffer());
      if (!isGLB(candidate)) throw new Error('arquivo não é GLB válido');
      content = candidate;
      break;
    } catch (error) {
      console.warn(`  ${mirror}: ${error.message}`);
    }
  }
  if (!content) {
    failures += 1;
    console.error(`[falhou] ${file}`);
    continue;
  }
  const temp = `${dest}.tmp`;
  await writeFile(temp, content);
  await rename(temp, dest);
  downloaded.add(file);
  bytes += content.length;
  console.log(`[ok] ${file} (${Math.round(content.length / 1024)} KB)`);
}
// Atualiza SOMENTE o manifesto depois da validação do GLB, evitando URLs locais inválidas.
// Verifica também arquivos anteriores ainda presentes.
for (const file of existing) {
  if (downloaded.has(file)) continue;
  try {
    if (isGLB(await readFile(join(targetRoot, file)))) downloaded.add(file);
  } catch { /* não existe */ }
}
await writeFile(manifestPath, JSON.stringify({ files: [...downloaded].sort() }, null, 2) + '\n');
console.log(`\n${downloaded.size}/${files.length} assets locais; ${(bytes / 1024).toFixed(1)} KB novos.`);
if (failures > 0) {
  console.error('Os modelos faltantes continuarão tentando usar o CDN no jogo.');
  process.exitCode = 1;
}
