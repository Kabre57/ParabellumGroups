const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const controllerDirectory = path.join(__dirname, '../controllers/sequence');
const facadePath = path.join(__dirname, '../controllers/sequence.controller.js');
const expectedHandlers = [
  'addStep',
  'assignProspects',
  'createSequence',
  'deleteSequence',
  'deleteStep',
  'executeNextStep',
  'getAllSequences',
  'getSequenceById',
  'getSequenceStats',
  'updateSequence',
  'updateStep',
];

test('la facade des sequences conserve les gestionnaires metier', () => {
  const facade = fs.readFileSync(facadePath, 'utf8');
  const modules = [...facade.matchAll(/require\('\.\/sequence\/(.+?)'\)/g)].map((match) => `${match[1]}.js`);
  const declarations = modules.flatMap((moduleName) => {
    const source = fs.readFileSync(path.join(controllerDirectory, moduleName), 'utf8');
    return [...source.matchAll(/^exports\.(\w+)\s*=/gm)].map((match) => match[1]);
  });

  assert.deepEqual(declarations.sort(), expectedHandlers);
});

test('les modules de sequences restent courts sans gestionnaires en double', () => {
  for (const entry of fs.readdirSync(controllerDirectory)) {
    if (!entry.endsWith('.controller.js')) continue;
    const source = fs.readFileSync(path.join(controllerDirectory, entry), 'utf8');
    const declarations = [...source.matchAll(/^exports\.(\w+)\s*=/gm)].map((match) => match[1]);
    assert.equal(new Set(declarations).size, declarations.length, `${entry} ne doit pas redéfinir un gestionnaire`);
    assert.ok(source.split(/\r?\n/).length - 1 < 500, `${entry} doit rester sous 500 lignes`);
  }
});
