import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { Script } from 'node:vm';

const roots = process.argv.slice(2);

if (roots.length === 0) {
  console.error('Usage: node scripts/check-js-syntax.mjs <path> [path...]');
  process.exit(1);
}

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'coverage',
]);

const JS_EXTENSIONS = new Set(['.js', '.cjs', '.mjs']);

const files = [];

const walk = (targetPath) => {
  const stats = statSync(targetPath);

  if (stats.isDirectory()) {
    const entries = readdirSync(targetPath);
    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry)) continue;
      walk(join(targetPath, entry));
    }
    return;
  }

  const extension = targetPath.slice(targetPath.lastIndexOf('.'));
  if (JS_EXTENSIONS.has(extension)) {
    files.push(targetPath);
  }
};

for (const root of roots) {
  walk(resolve(root));
}

if (files.length === 0) {
  console.log('No JavaScript files found to validate.');
  process.exit(0);
}

const failures = [];
let useInProcessFallback = false;

const checkWithCurrentProcess = (file) => {
  try {
    const source = readFileSync(file, 'utf8');
    new Script(source, { filename: file });
    return { status: 0, output: '' };
  } catch (error) {
    return {
      status: 1,
      output: (error?.stack || error?.message || String(error)).trim(),
    };
  }
};

for (const file of files) {
  let result;

  if (useInProcessFallback) {
    result = checkWithCurrentProcess(file);
  } else {
    const child = spawnSync(process.execPath, ['--check', file], {
      encoding: 'utf8',
    });

    if (child.error?.code === 'EPERM') {
      useInProcessFallback = true;
      result = checkWithCurrentProcess(file);
    } else {
      result = {
        status: child.status,
        output: (child.stderr || child.stdout || '').trim(),
      };
    }
  }

  if (result.status !== 0) {
    failures.push({
      file,
      output: result.output,
    });
  }
}

if (failures.length > 0) {
  console.error(`JavaScript syntax validation failed for ${failures.length} file(s):`);
  for (const failure of failures) {
    console.error(`\n- ${relative(process.cwd(), failure.file)}`);
    if (failure.output) {
      console.error(failure.output);
    }
  }
  process.exit(1);
}

console.log(`JavaScript syntax validated for ${files.length} file(s).`);
