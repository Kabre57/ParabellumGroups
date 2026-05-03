const { PrismaClient } = require('@prisma/client');
const {
  loadAccountingFamilyDefinitions,
  loadAccountingFamilyRules,
} = require('../../utils/accountingAccountResolver');

const prisma = new PrismaClient();

const amount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const severityRank = {
  CRITICAL: 3,
  HIGH: 2,
  MEDIUM: 1,
  LOW: 0,
};

const statusFromIssues = (issues) => {
  if (issues.some((issue) => issue.severity === 'CRITICAL' || issue.severity === 'HIGH')) return 'FAILED';
  if (issues.length) return 'WARNING';
  return 'HEALTHY';
};

class AccountingDiagnosticService {
  async runDiagnostic(client = prisma, options = {}) {
    const issues = [];

    const scopeEid = options.enterpriseId ? Number(options.enterpriseId) : null;

    const [entries, treasuryAccounts, definitions, configuredRules] = await Promise.all([
      client.accountingJournalEntry.findMany({
        where: { 
          status: { not: 'REVERSED' },
          enterpriseId: scopeEid // Filter by enterprise if provided
        },
        include: {
          period: true,
          journal: true,
          lines: { include: { account: true } },
        },
      }),
      client.treasuryAccount.findMany({
        where: { 
          isActive: true,
          enterpriseId: scopeEid
        },
        include: { accountingAccount: true },
      }),
      loadAccountingFamilyDefinitions(client, { force: true }),
      loadAccountingFamilyRules(client, { enterpriseId: scopeEid, force: true }),
    ]);

    entries.forEach((entry) => {
      const totalDebit = entry.lines
        .filter((line) => line.side === 'DEBIT')
        .reduce((sum, line) => sum + amount(line.amount), 0);
      const totalCredit = entry.lines
        .filter((line) => line.side === 'CREDIT')
        .reduce((sum, line) => sum + amount(line.amount), 0);

      if (Math.abs(totalDebit - totalCredit) > 0.0001) {
        issues.push({
          issueType: 'UNBALANCED_ENTRY',
          severity: 'CRITICAL',
          entityType: 'AccountingJournalEntry',
          entityId: entry.id,
          message: `Écriture ${entry.entryNumber} déséquilibrée.`,
          details: { totalDebit, totalCredit },
        });
      }

      if (!entry.periodId) {
        issues.push({
          issueType: 'MISSING_PERIOD',
          severity: 'HIGH',
          entityType: 'AccountingJournalEntry',
          entityId: entry.id,
          message: `Écriture ${entry.entryNumber} sans période comptable.`,
          details: { entryDate: entry.entryDate },
        });
      }

      if (!entry.journalId) {
        issues.push({
          issueType: 'MISSING_JOURNAL',
          severity: 'MEDIUM',
          entityType: 'AccountingJournalEntry',
          entityId: entry.id,
          message: `Écriture ${entry.entryNumber} sans journal lié.`,
          details: { journalCode: entry.journalCode },
        });
      }

      if (entry.period) {
        const entryTime = new Date(entry.entryDate).getTime();
        const startTime = new Date(entry.period.startDate).getTime();
        const endTime = new Date(entry.period.endDate).getTime();
        if (entryTime < startTime || entryTime > endTime) {
          issues.push({
            issueType: 'ENTRY_OUTSIDE_PERIOD',
            severity: 'HIGH',
            entityType: 'AccountingJournalEntry',
            entityId: entry.id,
            message: `Écriture ${entry.entryNumber} hors de sa période comptable.`,
            details: {
              entryDate: entry.entryDate,
              periodCode: entry.period.code,
              periodStart: entry.period.startDate,
              periodEnd: entry.period.endDate,
            },
          });
        }
      }

      // Check Multi-tenant Isolation
      entry.lines.forEach((line) => {
        if (line.enterpriseId !== entry.enterpriseId) {
          issues.push({
            issueType: 'MULTI_TENANT_ISOLATION_ERROR',
            severity: 'CRITICAL',
            entityType: 'AccountingJournalLine',
            entityId: line.id,
            message: `Ligne d'écriture appartient à l'entreprise ${line.enterpriseId} mais l'écriture est liée à ${entry.enterpriseId}.`,
            details: { entryNumber: entry.entryNumber },
          });
        }
        if (line.account && line.account.enterpriseId !== entry.enterpriseId && line.account.enterpriseId !== null) {
          issues.push({
            issueType: 'ACCOUNT_TENANT_MISMATCH',
            severity: 'HIGH',
            entityType: 'AccountingJournalLine',
            entityId: line.id,
            message: `Le compte ${line.account.code} appartient à l'entreprise ${line.account.enterpriseId} mais l'écriture est liée à ${entry.enterpriseId}.`,
            details: { entryNumber: entry.entryNumber },
          });
        }
      });
    });

    treasuryAccounts.forEach((account) => {
      if (!account.accountingAccountId || account.accountingAccount?.isActive === false) {
        issues.push({
          issueType: 'TREASURY_ACCOUNT_NOT_LINKED',
          severity: 'HIGH',
          entityType: 'TreasuryAccount',
          entityId: account.id,
          message: `Compte de trésorerie ${account.name} non lié à un compte comptable actif.`,
          details: { type: account.type },
        });
      }
    });

    definitions
      .filter((definition) => definition.isSystem)
      .forEach((definition) => {
        const rules = configuredRules.get(definition.code) || [];
        const hasPrimary = rules.some((rule) => rule.isPrimary && rule.account?.isActive !== false);
        if (!hasPrimary) {
          issues.push({
            issueType: 'REQUIRED_FAMILY_NOT_CONFIGURED',
            severity: 'HIGH',
            entityType: 'AccountingFamilyDefinition',
            entityId: definition.code,
            message: `Famille obligatoire ${definition.code} sans compte par défaut actif.`,
            details: { expectedType: definition.accountType },
          });
        }
      });

    const bySeverity = issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {});
    const status = statusFromIssues(issues);
    const summary = {
      status,
      totalIssues: issues.length,
      bySeverity,
      highestSeverity:
        issues
          .map((issue) => issue.severity)
          .sort((left, right) => severityRank[right] - severityRank[left])[0] || 'NONE',
    };

    const run = await client.accountingDiagnosticRun.create({
      data: {
        scope: options.enterpriseId ? 'ENTERPRISE' : (options.scope || 'GLOBAL'),
        enterpriseId: scopeEid,
        status,
        summary,
        createdByUserId: options.createdByUserId ? String(options.createdByUserId) : null,
        issues: {
          create: issues,
        },
      },
      include: {
        issues: {
          orderBy: [{ severity: 'asc' }, { issueType: 'asc' }],
        },
      },
    });

    return run;
  }
}

module.exports = new AccountingDiagnosticService();
