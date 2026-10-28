const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const barrelPath = path.resolve('frontend/src/shared/api/billing/types.ts');

test('les types de facturation sont répartis par domaine sans modifier les exports publics', () => {
  const barrel = fs.readFileSync(barrelPath, 'utf8');
  const reexports = [...barrel.matchAll(/^export type \{([^}]+)\} from ['"](.+?)['"];?$/gm)];
  const exportedNames = reexports.flatMap((match) => match[1].split(',').map((name) => name.trim()));
  const definedNames = [];

  for (const match of reexports) {
    const modulePath = path.resolve(path.dirname(barrelPath), `${match[2]}.ts`);
    const source = fs.readFileSync(modulePath, 'utf8');
    definedNames.push(...[...source.matchAll(/^export interface (\w+)\b/gm)].map((declaration) => declaration[1]));
    assert.ok(source.split(/\r?\n/).length - 1 < 500, `${modulePath} doit rester sous 500 lignes`);
  }

  assert.deepEqual([...new Set(exportedNames)].sort(), [...new Set(definedNames)].sort());
});
