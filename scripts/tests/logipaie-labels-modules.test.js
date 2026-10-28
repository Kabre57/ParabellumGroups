const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sourceDirectory = path.resolve('frontend/src/components/hr/logipaie');
const barrelPath = path.join(sourceDirectory, 'logipaieLabels.ts');
const moduleNames = [
  'referentiel-et-contrats',
  'paie-et-absences',
  'editions-et-declarations',
  'syntheses',
  'rh-et-journal',
];
const expectedSheets = [
  '1-ACCUEIL', '2-MODE D\'EMPLOI', '3-PARAMÈTRES', '4-CUMULS', '5-LE PERSONNEL',
  '6-CONTRAT DE TRAVAIL CDI', '7-CONTRAT DE TRAVAIL CDD', '8-ATTESTATION DE TRAVAIL',
  '9-TRAITEMENT DE LA PAIE', '10-HEURES SUPPLEMENTAIRES', '11-CONGÉS', '12-ATTESTATION DE CONGÉS',
  '13-GRATIFICATIONS', '14-INDEMNITES DE RUPTURE', '15-CERTIFICAT DE TRAVAIL', '16-DONNÉES RNS',
  '17-RNS', '18-PRÊTS', '19-ÉDITION BULLETINS', '20-ÉDITION BULLETINS GROUPÉS',
  '21-LIVRE DE PAIE MENSUEL', '22-ORDRE DE VIREMENT', '23-LISTE DES SALAIRES À VIRER',
  '24-DÉCLARATION ITS ', '25-DÉCLARATION FDFP', '26-LISTE NOMINATIVE COTI. CNPS ',
  '27-DÉCLARATION CNPS', '28-IMPUTATIONS COMPTABLES', '29-LIVRE DE PAIE ANNUEL',
  '30-RECAP. MASSE SALARIALE', '31-ETAT 301 PAGE 1 (REGUL ITS)', '32-ETAT 301 PAGE 2 (DETAIL)',
  '33-REGUL ANNUELLE FDFP', '34-DISA', '35-DASC', '36-FICHE INDIVIDUELLE',
  '37-PROVISION CONGES', '38-PROVISION RETRAITE', '39-NOTE 27B', '40-JOURNAL DU PERSONNEL',
  '41-INDICATEURS RH',
];

test('les libellés Logipaie gardent leur liste et leur ordre dans la façade publique', () => {
  const barrel = fs.readFileSync(barrelPath, 'utf8');
  const imports = [...barrel.matchAll(/^import \{ (\w+) \} from ['"]\.\/logipaieLabels\/(\w[\w-]*)['"];?$/gm)];
  const mergedNames = imports.map((match) => match[1]);
  const sheetNames = [];

  assert.deepEqual(imports.map((match) => match[2]), moduleNames);
  assert.match(barrel, /export const LOGIPAIE_SHEETS = \{/);
  assert.match(barrel, /export type LogipaieSheetName = keyof typeof LOGIPAIE_SHEETS/);
  assert.deepEqual(
    [...barrel.matchAll(/^  \.\.\.(\w+),?$/gm)].map((match) => match[1]),
    mergedNames,
  );

  for (const moduleName of moduleNames) {
    const modulePath = path.join(sourceDirectory, 'logipaieLabels', `${moduleName}.ts`);
    const source = fs.readFileSync(modulePath, 'utf8');
    assert.ok(source.startsWith('/**'), `${modulePath} doit documenter son domaine en français`);
    assert.ok(source.split(/\r?\n/).length - 1 < 500, `${modulePath} doit rester sous 500 lignes`);
    sheetNames.push(...[...source.matchAll(/^  "([^"]+)": \[$/gm)].map((match) => match[1]));
  }

  assert.deepEqual(sheetNames, expectedSheets);
});
