const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'services', 'billing-service', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// 1. Inject missing columns in AccountingJournalLine
const ajlSearch = `  amountCurrency Float?`;
const ajlReplace = `  amountCurrency Float?
  costCenterId   String?
  analyticAxisId String?
  allocationKey  String?`;
schema = schema.replace(ajlSearch, ajlReplace);

// 2. Inject missing columns in BudgetAllocation
const baSearch = `  analyticCenterId String
  amount           Float`;
const baReplace = `  analyticCenterId String
  costCenterId     String?
  analyticAxisId   String?
  amount           Float`;
schema = schema.replace(baSearch, baReplace);

// 3. Remove old Placement module
const placementRegex = /\/\/ --- MODULE PLACEMENTS ---\s+model Placement \{[\s\S]*?enum PlacementStatus \{[\s\S]*?\}/;
schema = schema.replace(placementRegex, '');

// 4. Append new models and enums
const schemaFragmentsDirectory = path.join(__dirname, 'schema-fragments');
const newModels = ['01-analytic.prisma', '02-investments.prisma', '03-investment-enums.prisma']
  .map((fileName) => fs.readFileSync(path.join(schemaFragmentsDirectory, fileName), 'utf8'))
  .join('\n');

schema += newModels;

fs.writeFileSync(schemaPath, schema, 'utf8');
console.log('Schema updated successfully.');
