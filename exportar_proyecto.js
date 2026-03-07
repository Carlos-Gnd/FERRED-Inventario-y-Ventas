// exportar_proyecto.js
const fs = require('fs');
const path = require('path');

const ROOT_DIR = process.argv[2] || process.cwd();
const OUTPUT_FILE = process.argv[3] || path.join(process.cwd(), 'codigo_completo.txt');

const IGNORE_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  '.next',
  '.turbo',
  '.cache',
  '.pnpm-store',
  'coverage',
]);

const IGNORE_FILES = new Set([
  'pnpm-lock.yaml',
  'package-lock.json',
  'yarn.lock',
]);

function isBinaryBuffer(buffer) {
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] === 0) return true;
  }
  return false;
}

function walk(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      walk(fullPath, files);
      continue;
    }

    if (IGNORE_FILES.has(entry.name)) continue;
    files.push(fullPath);
  }

  return files;
}

function main() {
  const allFiles = walk(ROOT_DIR);
  let output = `# Export de código\n# Raíz: ${ROOT_DIR}\n# Fecha: ${new Date().toISOString()}\n\n`;

  for (const filePath of allFiles) {
    try {
      const buffer = fs.readFileSync(filePath);
      if (isBinaryBuffer(buffer)) continue;

      const relative = path.relative(ROOT_DIR, filePath);
      const content = buffer.toString('utf8');

      output += `\n\n===== INICIO: ${relative} =====\n`;
      output += content;
      output += `\n===== FIN: ${relative} =====\n`;
    } catch (err) {
      output += `\n\n===== ERROR: ${filePath} =====\n${String(err)}\n`;
    }
  }

  fs.writeFileSync(OUTPUT_FILE, output, 'utf8');
  console.log(`Export completado: ${OUTPUT_FILE}`);
}

main();
