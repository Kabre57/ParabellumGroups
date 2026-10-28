const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const servicesRoot = path.resolve(__dirname, '../../services');

function findModuleDirectories(directory, results = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory() || ['node_modules', 'dist', 'build'].includes(entry.name)) continue;
    const child = path.join(directory, entry.name);
    const normalized = child.replaceAll(path.sep, '/');
    const isControllerModule = normalized.includes('/controllers/') && fs.existsSync(path.join(child, 'shared.js'));
    const isServiceModule = normalized.includes('/services/')
      && fs.existsSync(path.join(child, 'index.js'))
      && fs.existsSync(path.join(child, 'core.js'));

    if (isControllerModule || isServiceModule) results.push(child);
    findModuleDirectories(child, results);
  }

  return results;
}

function collectJavaScriptFiles(directory, results = new Set()) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const child = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', 'dist', 'build'].includes(entry.name)) collectJavaScriptFiles(child, results);
    } else if (entry.name.endsWith('.js')) {
      results.add(child);
    }
  }

  return results;
}

test('les imports relatifs des modules extraits pointent vers des fichiers presents', () => {
  const directories = findModuleDirectories(servicesRoot);
  assert.ok(directories.length > 0, 'des dossiers de modules doivent être détectés');

  const files = new Set();
  for (const directory of directories) collectJavaScriptFiles(directory, files);

  for (const filePath of files) {
    const source = fs.readFileSync(filePath, 'utf8');
    for (const match of source.matchAll(/require\((['"])(\.[^'"]+)\1\)/g)) {
      assert.doesNotThrow(
        () => require.resolve(path.resolve(path.dirname(filePath), match[2])),
        `${path.relative(servicesRoot, filePath)} doit résoudre ${match[2]}`,
      );
    }
  }
});
