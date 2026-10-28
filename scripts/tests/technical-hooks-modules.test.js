const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const directory = path.resolve('frontend/src/hooks');
const barrelPath = path.join(directory, 'useTechnical.ts');
const modules = [
  'missions',
  'interventions',
  'ordres-mission',
  'techniciens',
  'materiel',
  'rapports',
  'specialites',
];
const expectedHooks = [
  'useMissions', 'useMission', 'useMissionsStats', 'useCreateMission', 'useUpdateMission',
  'useResyncMissionFromCrm', 'useUpdateMissionStatus', 'useAssignTechnicienToMission', 'useDeleteMission',
  'useInterventions', 'useIntervention', 'useCreateIntervention', 'useUpdateIntervention', 'useCompleteIntervention', 'useDeleteIntervention',
  'useMissionOrders', 'useCreateMissionOrder', 'useCreateMissionOrdersBatch', 'useUpdateMissionOrder', 'useMarkMissionOrderPrinted',
  'useTechniciens', 'useTechnicien', 'useAvailableTechniciens', 'useTechnicienStats', 'useCreateTechnicien',
  'useUpdateTechnicien', 'useUpdateTechnicienStatus', 'useDeleteTechnicien',
  'useMateriel', 'useMaterielById', 'useMaterielAlertes', 'useSortiesEnCours', 'useCreateMateriel', 'useUpdateMateriel', 'useDeleteMateriel',
  'useRapports', 'useRapport', 'useCreateRapport', 'useUpdateRapport', 'useValidateRapport', 'useDeleteRapport',
  'useSpecialites', 'useSpecialite', 'useCreateSpecialite', 'useUpdateSpecialite', 'useDeleteSpecialite',
];

test('les hooks techniques gardent leurs exports publics derrière le chemin historique', () => {
  const barrel = fs.readFileSync(barrelPath, 'utf8');
  const reexports = [...barrel.matchAll(/^export \* from ['"]\.\/technical\/(\w[\w-]*)['"];?$/gm)].map((match) => match[1]);
  const hookNames = [];

  assert.deepEqual(reexports, modules);

  for (const moduleName of modules) {
    const modulePath = path.join(directory, 'technical', `${moduleName}.ts`);
    const source = fs.readFileSync(modulePath, 'utf8');
    assert.ok(source.startsWith('/**'), `${modulePath} doit être commenté en français`);
    assert.ok(source.split(/\r?\n/).length - 1 < 500, `${modulePath} doit rester sous 500 lignes`);
    hookNames.push(...[...source.matchAll(/^export function (use\w+)\b/gm)].map((match) => match[1]));
  }

  assert.deepEqual(hookNames.sort(), [...expectedHooks].sort());
});
