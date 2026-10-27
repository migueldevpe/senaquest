/** Auditoria de arquivos estáticos e integridade do projeto, sem dependências npm. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const requiredRoot = [
  '.gitattributes',
  '.gitignore',
  '.prettierrc.json',
  'CHARACTER_STANDARDS.md',
  'LICENSE',
  'index.html',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'vite.config.ts',
];
for (const file of requiredRoot) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`Arquivo raiz ausente: ${file}`);
}

function walk(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full, ext) : full.endsWith(ext) ? [full] : [];
  });
}

const cssFiles = walk(path.join(root, 'src'), '.css');
if (cssFiles.length !== 1 || path.relative(root, cssFiles[0] ?? '') !== 'src/style.css') {
  failures.push('CSS disperso: somente src/style.css deve existir.');
}

const sources = [...walk(path.join(root, 'src'), '.ts'), ...walk(path.join(root, 'src'), '.tsx')];
for (const file of sources) {
  const content = fs.readFileSync(file, 'utf8');
  if (path.relative(root, file).split(path.sep).join('/') === 'src/App.tsx') continue; // A única importação CSS permitida.
  if (/\bimport\s*["'][^"']+\.css["']/.test(content)) {
    failures.push(`Importação CSS fora de App.tsx: ${path.relative(root, file)}`);
  }
}
const entry = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8');
if (!entry.includes("import './style.css';") && !entry.includes('import "./style.css";')) {
  failures.push('App.tsx não importa style.css');
}

const manifest = fs.readFileSync(path.join(root, 'src/scene/preloadManifest.ts'), 'utf8');
const assetPaths = [...manifest.matchAll(/["'](\/(?:models|audio|tutorial)\/[^"'\n]+)["']/g)].map(
  (match) => match[1],
);
if (assetPaths.length === 0) failures.push('Manifesto de preload vazio');
for (const url of assetPaths) {
  const filepath = path.join(root, 'public', url.slice(1));
  if (!fs.existsSync(filepath)) failures.push(`Asset do preload ausente: ${url}`);
  else if (fs.statSync(filepath).size === 0) failures.push(`Asset vazio: ${url}`);
}

const techAssets = [
  'pc/pc.fbx',
  'keyboard/keyboard.fbx',
  'keyboard/keyboard_albedo.webp',
  'keyboard/keyboard_emissive.webp',
  'keyboard/keyboard_normal.webp',
  'keyboard/keyboard_aux.webp',
];
for (const name of techAssets) {
  const asset = path.join(root, 'public/models/technology', name);
  if (!fs.existsSync(asset)) failures.push(`Modelo ou textura de TI ausente: ${name}`);
}
const webps = walk(path.join(root, 'public'), '.webp');
for (const file of webps) {
  const header = Buffer.alloc(12);
  const fd = fs.openSync(file, 'r');
  try {
    fs.readSync(fd, header, 0, 12, 0);
  } finally {
    fs.closeSync(fd);
  }
  if (header.toString('ascii', 0, 4) !== 'RIFF' || header.toString('ascii', 8, 12) !== 'WEBP') {
    failures.push(`WebP inválido: ${path.relative(root, file)}`);
  }
}

console.log(
  `SENAQUEST: ${assetPaths.length} recursos verificados; ${webps.length} WebP; CSS centralizado.`,
);
if (failures.length) {
  console.error(failures.map((message) => `ERRO: ${message}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log('Auditoria de arquivos: aprovada.');
}
