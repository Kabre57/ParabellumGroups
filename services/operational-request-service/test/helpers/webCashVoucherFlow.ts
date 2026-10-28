import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import type { OperationalRequest } from '../../../../frontend/src/shared/api/operationalRequests.service.ts';

type Selection = {
  paymentMethod: 'ESPECES' | 'CHEQUE' | 'VIREMENT' | 'CARTE';
  treasuryAccountId: string;
  counterpartAccountId: string;
};
type Run = (args: { request: OperationalRequest; selection: Selection }) => Promise<{ success: boolean }>;
type CompiledFlow = {
  run: Run;
  get: (id: string) => Promise<{ data: OperationalRequest }>;
  apiClient: {
    setToken(token: string | null): void;
    setEnterpriseId(id: string | null): void;
    getAxiosInstance(): { defaults: { baseURL?: string; timeout: number; proxy?: false } };
  };
};
export type WebCashVoucherFlow = {
  run: Run;
  get: (id: string) => Promise<OperationalRequest>;
  close: () => Promise<void>;
};

function mutationSource(text: string, filename: string): string {
  const source = ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const mutations: ts.ArrowFunction[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'cashVoucherMutation') {
      const call = node.initializer;
      if (!call || !ts.isCallExpression(call) || !ts.isIdentifier(call.expression) || call.expression.text !== 'useMutation') {
        throw new Error('Web cashVoucherMutation must still be a useMutation call.');
      }
      const options = call.arguments[0];
      if (!options || !ts.isObjectLiteralExpression(options)) throw new Error('Web mutation options are missing.');
      for (const property of options.properties) {
        if (ts.isPropertyAssignment(property) && property.name.getText(source) === 'mutationFn') {
          if (!ts.isArrowFunction(property.initializer)) throw new Error('Web mutationFn must be an arrow function.');
          mutations.push(property.initializer);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (mutations.length !== 1) throw new Error(`Expected exactly one web cashVoucherMutation.mutationFn; found ${mutations.length}.`);
  return mutations[0].getText(source);
}

function compile(text: string, filename: string): string {
  const result = ts.transpileModule(text, {
    fileName: filename,
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, esModuleInterop: true },
  });
  const errors = result.diagnostics?.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error) ?? [];
  if (errors.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(errors, {
    getCanonicalFileName: (name) => name,
    getCurrentDirectory: () => process.cwd(),
    getNewLine: () => '\n',
  }));
  return result.outputText;
}

/** Run the production web mutation and its real Axios client, without loading React.
 * Only TypeScript/JSX syntax is removed; the retry logic is extracted verbatim.
 * Each call owns its CommonJS module graph, token and enterprise configuration.
 */
export async function loadWebCashVoucherFlow(options: {
  baseUrl: string; token: string; enterpriseId: number;
}): Promise<WebCashVoucherFlow> {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
  const frontend = join(root, 'frontend');
  const cacheRoot = join(frontend, 'node_modules/.cache/integration-web-cash-voucher');
  const directory = join(cacheRoot, randomUUID());
  const require = createRequire(import.meta.url);
  const close = async (): Promise<void> => {
    if (dirname(directory) !== cacheRoot) throw new Error('Refusing to remove a directory outside the integration cache.');
    for (const key of Object.keys(require.cache)) {
      if (key.startsWith(`${directory}${sep}`)) delete require.cache[key];
    }
    await rm(directory, { recursive: true, force: true });
  };
  try {
    const pagePath = join(frontend, 'app/(dashboard)/dashboard/demandes-operationnelles/page.tsx');
    const clientPath = join(frontend, 'src/shared/api/shared/client.ts');
    const servicePath = join(frontend, 'src/shared/api/operationalRequests.service.ts');
    const [page, client, service] = await Promise.all([pagePath, clientPath, servicePath].map((path) => readFile(path, 'utf8')));
    const mutation = mutationSource(page, pagePath);
    await mkdir(join(directory, 'shared'), { recursive: true });
    const entry = join(directory, 'flow.js');
    await Promise.all([
      writeFile(join(directory, 'package.json'), JSON.stringify({ type: 'commonjs' })),
      writeFile(join(directory, 'shared/client.js'), compile(client, clientPath)),
      writeFile(join(directory, 'operationalRequests.service.js'), compile(service, servicePath)),
      writeFile(entry, compile([
        'const { apiClient } = require("./shared/client");',
        'const { operationalRequestsService } = require("./operationalRequests.service");',
        `module.exports = { apiClient, get: operationalRequestsService.get, run: ${mutation} };`,
      ].join('\n'), 'flow.ts')),
    ]);
    const loaded: CompiledFlow = require(entry);
    loaded.apiClient.setToken(options.token);
    loaded.apiClient.setEnterpriseId(String(options.enterpriseId));
    const defaults = loaded.apiClient.getAxiosInstance().defaults;
    defaults.baseURL = options.baseUrl.replace(/\/$/, '');
    defaults.timeout = 10_000;
    defaults.proxy = false;
    return { run: loaded.run, get: async (id) => (await loaded.get(id)).data, close };
  } catch (error: unknown) {
    await close();
    throw error;
  }
}
