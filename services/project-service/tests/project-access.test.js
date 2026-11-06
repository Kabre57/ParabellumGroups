const test = require('node:test');
const assert = require('node:assert/strict');
const { fixture, request, response, stubReferences } = require('./helpers/projectFixture');

test('les listes, compteurs et statistiques excluent les autres entreprises et les projets historiques non rattachés', async (t) => {
  stubReferences(t);
  const { controller } = fixture();
  for (const [name, method, expected] of [
    ['projet', 'getAllProjets', 'project-a'],
    ['tache', 'getAllTaches', 'task-a'],
    ['jalon', 'getAllJalons', 'milestone-a'],
  ]) {
    const res = response();
    await controller(name)[method](request(), res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data.map((record) => record.id), [expected]);
    assert.equal(res.body.meta.pagination.total, 1);
  }
  const stats = response();
  await controller('projet').getGlobalProjetStats(request(), stats);
  assert.equal(stats.body.data.totalProjects, 1);
  assert.equal(stats.body.data.budgetTotal, 100);
});

test('les détails, statistiques, mises à jour et suppressions étrangers retournent 404 sans mutation', async (t) => {
  stubReferences(t);
  const { controller, data } = fixture();
  const before = JSON.stringify(data);
  for (const [name, methods, prefix] of [
    ['projet', ['getProjetById', 'getProjetStats', 'updateProjet', 'deleteProjet'], 'project'],
    ['tache', ['getTacheById', 'updateTache', 'deleteTache', 'completeTache'], 'task'],
    ['jalon', ['getJalonById', 'updateJalon', 'deleteJalon', 'updateJalonStatus'], 'milestone'],
  ]) {
    for (const suffix of ['b', 'legacy', 'missing']) {
      for (const method of methods) {
        const res = response();
        await controller(name)[method](request({ params: { id: `${prefix}-${suffix}` }, body: { status: 'ATTEINT', nom: 'Intrusion', titre: 'Intrusion' } }), res);
        assert.equal(res.statusCode, 404, `${method}: ${suffix}`);
      }
    }
  }
  assert.equal(JSON.stringify(data), before);
});

test('les mutations autorisées restent fonctionnelles dans le contexte actif et ne déplacent pas les ressources', async (t) => {
  stubReferences(t);
  const { controller, data } = fixture();
  for (const [name, method, id, body, expectedField, expected] of [
    ['projet', 'updateProjet', 'project-a', { nom: 'Projet corrigé' }, 'nom', 'Projet corrigé'],
    ['tache', 'updateTache', 'task-a', { titre: 'Tâche corrigée' }, 'titre', 'Tâche corrigée'],
    ['jalon', 'updateJalonStatus', 'milestone-a', { status: 'ATTEINT' }, 'status', 'ATTEINT'],
  ]) {
    const res = response();
    await controller(name)[method](request({ params: { id }, body }), res);
    assert.equal(res.statusCode, 200);
    assert.equal(data[name].find((row) => row.id === id)[expectedField], expected);
  }
  for (const [name, method, id, body] of [
    ['projet', 'updateProjet', 'project-a', { clientId: 'customer-b' }],
    ['tache', 'updateTache', 'task-a', { projetId: 'project-b' }],
    ['jalon', 'updateJalon', 'milestone-a', { projectId: 'project-b' }],
  ]) {
    const res = response();
    await controller(name)[method](request({ params: { id }, body }), res);
    assert.equal(res.statusCode, 400);
  }
});

test('les créations valident le client et le projet parent dans la même entreprise avant toute écriture', async (t) => {
  const calls = stubReferences(t);
  const { controller, data } = fixture();
  for (const clientId of ['customer-b', 'customer-legacy', 'missing']) {
    const res = response();
    await controller('projet').createProjet(request({ body: { nom: 'Nouveau', clientId, dateDebut: '2026-11-06' } }), res);
    assert.equal(res.statusCode, 404);
  }
  assert.equal(data.projet.length, 4);
  const created = response();
  await controller('projet').createProjet(request({ body: { nom: 'Nouveau', clientId: 'customer-a', dateDebut: '2026-11-06' } }), created);
  assert.equal(created.statusCode, 201);
  assert.equal(created.body.data.enterpriseId, 1);
  const clientLookup = calls.find((call) => call.url.endsWith('/api/clients/customer-a'));
  assert.equal(clientLookup.init.headers.Authorization, 'Bearer test-token');
  assert.equal(clientLookup.init.headers['X-Enterprise-Id'], '1');
  assert.ok(clientLookup.init.signal);
  for (const [name, method] of [['tache', 'createTache'], ['jalon', 'createJalon']]) {
    for (const projetId of ['project-b', 'project-legacy', 'missing']) {
      const res = response();
      await controller(name)[method](request({ body: { projetId, nom: 'Jalon', titre: 'Tâche', dateEcheance: '2026-11-06' } }), res);
      assert.equal(res.statusCode, 404);
    }
    const res = response();
    await controller(name)[method](request({ body: { projetId: 'project-a', nom: 'Jalon', titre: 'Tâche', dateEcheance: '2026-11-06' } }), res);
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.data.projetId, 'project-a');
  }
});

test('les assignations contrôlent la tâche, son entreprise et l’utilisateur cible', async (t) => {
  stubReferences(t);
  const { controller, data } = fixture();
  const tasks = controller('tache');
  for (const id of ['task-b', 'task-legacy']) {
    for (const method of ['assignTache', 'unassignTache']) {
      const res = response();
      await tasks[method](request({ params: { id, userId: '20' }, body: { userId: '10' } }), res);
      assert.equal(res.statusCode, 404);
    }
  }
  for (const userId of ['20', '40']) {
    const res = response();
    await tasks.assignTache(request({ params: { id: 'task-a' }, body: { userId } }), res);
    assert.equal(res.statusCode, 404);
  }
  const allowed = response();
  await tasks.assignTache(request({ params: { id: 'task-a' }, body: { userId: '10' } }), allowed);
  assert.equal(allowed.statusCode, 201);
  assert.equal(allowed.body.tache.projet.enterpriseId, 1);
  const removed = response();
  await tasks.unassignTache(request({ params: { id: 'task-a', userId: '10' } }), removed);
  assert.equal(removed.statusCode, 204);
  assert.equal(data.tacheAssignation.filter((item) => item.tacheId === 'task-a').length, 0);
  assert.equal(data.tacheAssignation.filter((item) => item.tacheId === 'task-b').length, 1);
});

test('le choix explicite d’une filiale reste isolé et un administrateur ne voit jamais les projets legacy', async (t) => {
  stubReferences(t);
  const { controller } = fixture();
  const child = response();
  await controller('projet').getAllProjets(request({ headers: { 'x-enterprise-id': '3' } }), child);
  assert.deepEqual(child.body.data.map((row) => row.id), ['project-child']);
  const admin = response();
  await controller('projet').getAllProjets(request({ user: { role: 'ADMIN' }, headers: { 'x-enterprise-id': '2' } }), admin);
  assert.deepEqual(admin.body.data.map((row) => row.id), ['project-b']);
});
