import process from 'node:process';

const gatewayUrl = (process.env.E2E_GATEWAY_URL || 'http://localhost:3001').replace(/\/$/, '');
const frontendUrl = (process.env.E2E_FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const timeoutMs = Number(process.env.E2E_TIMEOUT_MS || 15000);

const probes = [
  ['Authentification', '/api/auth/users'],
  ['Communication', '/api/communication/messages'],
  ['Services techniques', '/api/missions'],
  ['Gestion commerciale', '/api/commercial'],
  ['Stocks', '/api/inventory/articles'],
  ['Projets', '/api/projects'],
  ['Achats', '/api/procurement/fournisseurs'],
  ['Clients', '/api/clients'],
  ['Ressources humaines', '/api/employees'],
  ['Facturation et comptabilité', '/api/billing/invoices'],
  ['Analytique', '/api/analytics/overview'],
  ['Notifications', '/api/notifications'],
];

const request = async (url, options = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const report = (label, status, detail = '') => {
  const ok = status >= 200 && status < 300;
  console.log(`${ok ? 'OK' : 'ÉCHEC'}  ${label} — HTTP ${status}${detail ? ` — ${detail}` : ''}`);
  return ok;
};

const failures = [];

try {
  const [frontend, gateway] = await Promise.all([
    request(`${frontendUrl}/login`),
    request(`${gatewayUrl}/health`),
  ]);
  if (!report('Interface Web', frontend.status)) failures.push('Interface Web');
  if (!report('Passerelle API', gateway.status)) failures.push('Passerelle API');
} catch (error) {
  console.error(`ÉCHEC  Frontend ou passerelle inaccessible — ${error.message}`);
  process.exit(1);
}

if (!email || !password) {
  console.error('\nDéfinissez E2E_EMAIL et E2E_PASSWORD avec un compte de test autorisé, puis relancez la commande.');
  process.exit(2);
}

let accessToken;
try {
  const response = await request(`${gatewayUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const payload = await response.json().catch(() => ({}));
  accessToken = payload?.data?.accessToken;
  if (!response.ok || !accessToken) {
    report('Connexion du compte de test', response.status, payload?.message || 'jeton absent');
    process.exit(1);
  }
  report('Connexion du compte de test', response.status);
} catch (error) {
  console.error(`ÉCHEC  Connexion du compte de test — ${error.message}`);
  process.exit(1);
}

for (const [service, path] of probes) {
  try {
    const response = await request(`${gatewayUrl}${path}`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!report(service, response.status)) failures.push(service);
  } catch (error) {
    console.error(`ÉCHEC  ${service} — ${error.message}`);
    failures.push(service);
  }
}

if (failures.length) {
  console.error(`\n${failures.length} contrôle(s) échoué(s) : ${failures.join(', ')}`);
  process.exit(1);
}

console.log(`\nTous les contrôles de disponibilité et de lecture ont réussi (${probes.length} services métier).`);
