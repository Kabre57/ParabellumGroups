const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const hooksDirectory = path.resolve('frontend/src/hooks');
const barrelPath = path.join(hooksDirectory, 'useCrm.ts');
const domainModules = [
  'clients',
  'contacts',
  'contrats',
  'interactions',
  'opportunites',
  'documents',
  'adresses',
  'referentiels',
  'relances',
  'segments',
];

const expectedHooks = [
  'useClients', 'useClient', 'useSearchClients', 'useClientsStats', 'useCreateClient',
  'useUpdateClient', 'useUpdateClientStatus', 'useUpdateClientPriority', 'useArchiveClient', 'useDeleteClient',
  'useContacts', 'useContact', 'useCreateContact', 'useUpdateContact', 'useDeleteContact', 'useSetContactPrincipal',
  'useContrats', 'useContrat', 'useCreateContrat', 'useContratsStats', 'useContratsExpiring', 'useUpdateContratStatus', 'useContratAvenants',
  'useInteractions', 'useInteraction', 'useCreateInteraction', 'useUpdateInteraction', 'useDeleteInteraction', 'useInteractionsStats', 'useLinkInteractionTask',
  'useOpportunites', 'useOpportunite', 'useCreateOpportunite', 'useUpdateOpportunite', 'useDeleteOpportunite', 'useOpportunitesPipeline', 'useUpdateOpportuniteStage', 'useCloseOpportunite', 'useAddOpportuniteProduct',
  'useDocuments', 'useDocument', 'useCreateDocument', 'useUpdateDocument', 'useUpdateDocumentValidity', 'useDeleteDocument', 'useDocumentsExpiring',
  'useAdresses', 'useAdresse', 'useCreateAdresse', 'useUpdateAdresse', 'useDeleteAdresse', 'useSetAdressePrincipal',
  'useTypeClients', 'useTypeClient', 'useCreateTypeClient', 'useUpdateTypeClient', 'useDeleteTypeClient', 'useToggleTypeClient',
  'useSecteurs', 'useSecteur', 'useCreateSecteur', 'useUpdateSecteur', 'useDeleteSecteur', 'useSecteursTree',
  'useRelances', 'useRelance', 'useCreateRelance', 'useUpdateRelance', 'useDeleteRelance', 'useToggleRelance',
  'useSegments', 'useSegment', 'useCreateSegment', 'useUpdateSegment', 'useDeleteSegment', 'useRefreshSegment',
];

test('les hooks CRM restent accessibles par leur façade publique', () => {
  const barrel = fs.readFileSync(barrelPath, 'utf8');
  const exportedHooks = [...barrel.matchAll(/^export \* from ['"]\.\/crm\/(\w+)['"];?$/gm)].map((match) => match[1]);
  const moduleHooks = [];

  assert.deepEqual(exportedHooks, domainModules);

  for (const moduleName of domainModules) {
    const modulePath = path.join(hooksDirectory, 'crm', `${moduleName}.ts`);
    const source = fs.readFileSync(modulePath, 'utf8');
    const hooks = [...source.matchAll(/^export function (use\w+)\b/gm)].map((match) => match[1]);

    assert.ok(source.split(/\r?\n/).length - 1 < 500, `${modulePath} doit rester sous 500 lignes`);
    assert.ok(source.startsWith('/**'), `${modulePath} doit expliquer son domaine en français`);
    moduleHooks.push(...hooks);
  }

  assert.deepEqual([...moduleHooks].sort(), [...expectedHooks].sort());
});
