const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const sourcePath = path.resolve(__dirname, '../src/expoPush.ts');
const compiled = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const testModule = { exports: {} };
vm.runInNewContext(compiled, { module: testModule, exports: testModule.exports, fetch }, { filename: sourcePath });
const { sendExpoPushNotification } = testModule.exports;

const message = {
  to: 'ExponentPushToken[device-token]',
  title: 'Nouvelle demande opérationnelle à valider',
  body: 'Une demande est en attente.',
  sound: 'default',
  channelId: 'operational-requests',
  priority: 'high',
  data: { link: '/dashboard/demandes-operationnelles?request=request-123', enterpriseId: 7 },
};

test('sends the complete operational request payload to Expo', async () => {
  let request;
  await sendExpoPushNotification(message, async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ data: [{ status: 'ok', id: 'ticket-1' }] }) };
  });

  assert.equal(request.url, 'https://exp.host/--/api/v2/push/send');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(request.options.body), message);
});

test('rejects an HTTP failure so the outbox can retry delivery', async () => {
  await assert.rejects(
    sendExpoPushNotification(message, async () => ({ ok: false, status: 503, json: async () => ({}) })),
    /Expo Push API returned 503/,
  );
});

test('rejects a failed Expo ticket so the outbox can retry delivery', async () => {
  await assert.rejects(
    sendExpoPushNotification(message, async () => ({
      ok: true,
      json: async () => ({ data: [{ status: 'error', message: 'Invalid token' }] }),
    })),
    /Invalid token/,
  );
});
