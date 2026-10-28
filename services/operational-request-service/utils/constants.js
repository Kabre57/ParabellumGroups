const TYPES = new Set(['FUEL', 'TRANSPORT', 'MISSION', 'OTHER']);
const STATUSES = new Set([
  'DRAFT',
  'SUBMITTED',
  'NEEDS_INFO',
  'APPROVED',
  'REJECTED',
  'IN_FINANCIAL_PROCESS',
  'CASH_VOUCHER_CREATED',
  'DISBURSED',
  'CLOSED',
]);
const FINANCE_STATUSES = [
  'APPROVED',
  'IN_FINANCIAL_PROCESS',
  'CASH_VOUCHER_CREATED',
  'DISBURSED',
  'CLOSED',
];

const prismaSelect = {
  approvalLogs: { orderBy: { createdAt: 'asc' } },
  attachments: { orderBy: { createdAt: 'asc' } },
};

module.exports = {
  TYPES,
  STATUSES,
  FINANCE_STATUSES,
  prismaSelect,
};
