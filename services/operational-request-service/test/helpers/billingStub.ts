import express from 'express';
import type { Express, NextFunction, Request, Response } from 'express';
import { createServer } from 'node:http';

export type BillingVoucher = {
  id: string;
  voucherNumber: string;
  status: 'BROUILLON' | 'EN_ATTENTE' | 'VALIDE' | 'DECAISSE' | 'ANNULE';
  sourceType: string;
  sourceId: string;
  enterpriseId: number;
  amountTTC?: number | string;
};

type BillingStatus = 200 | 404 | 409 | 500;
type VoucherSource = readonly BillingVoucher[] | (() => readonly BillingVoucher[] | Promise<readonly BillingVoucher[]>);

export type BillingStubOptions = {
  creationStatus: BillingStatus;
  lookupStatus?: BillingStatus;
  vouchers: VoucherSource;
  message?: string;
};

export type BillingCall = {
  method: string;
  path: string;
  query: Record<string, string | string[]>;
  authorization: string | undefined;
  enterpriseId: string | undefined;
  body: unknown;
};

export type RunningHttpServer = {
  baseUrl: string;
  close: () => Promise<void>;
};

/** Bind a real HTTP server to an operating-system assigned loopback port. */
export async function startHttpServer(app: Express): Promise<RunningHttpServer> {
  const server = createServer(app);
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => reject(error);
    server.once('error', onError);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', onError);
      resolve();
    });
  });

  const address = server.address();
  if (address === null || typeof address === 'string') {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    throw new Error('Le serveur HTTP de test ne possède pas de port TCP.');
  }

  let closing: Promise<void> | undefined;
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => {
      closing ??= new Promise<void>((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
        server.closeIdleConnections();
      });
      return closing;
    },
  };
}

/** HTTP boundary substitute only: production Billing lookup functions stay intact. */
export async function startBillingStub(options: BillingStubOptions): Promise<RunningHttpServer & { calls: BillingCall[] }> {
  const app = express();
  const calls: BillingCall[] = [];
  const readVouchers = async () => typeof options.vouchers === 'function'
    ? await options.vouchers()
    : options.vouchers;

  app.use(express.json());
  app.use((req, _res, next) => {
    const searchParams = new URL(req.originalUrl, 'http://billing.test').searchParams;
    const query = Object.fromEntries([...new Set(searchParams.keys())].map((key) => {
      const values = searchParams.getAll(key);
      return [key, values.length === 1 ? values[0] : values];
    }));
    calls.push({
      method: req.method,
      path: req.path,
      query,
      authorization: req.get('Authorization'),
      enterpriseId: req.get('X-Enterprise-Id'),
      body: req.body as unknown,
    });
    next();
  });

  app.post('/api/cash-vouchers', async (_req, res, next) => {
    try {
      const vouchers = await readVouchers();
      res.status(options.creationStatus).json({
        success: options.creationStatus === 200,
        message: options.message ?? 'Réponse de création du stub Billing.',
        data: vouchers[0] ?? null,
      });
    } catch (error: unknown) {
      next(error);
    }
  });

  app.get('/api/cash-vouchers', async (_req, res, next) => {
    try {
      const status = options.lookupStatus ?? 200;
      const vouchers = await readVouchers();
      res.status(status).json({
        success: status === 200,
        message: options.message ?? 'Réponse de consultation du stub Billing.',
        data: vouchers,
      });
    } catch (error: unknown) {
      next(error);
    }
  });

  app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Route introuvable dans le stub Billing.' });
  });
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Erreur du stub Billing.',
    });
  });

  return { ...await startHttpServer(app), calls };
}
