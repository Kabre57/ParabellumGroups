const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const controllerCases = [
  {
    facade: '../controllers/cashVoucher.controller.js',
    directory: '../controllers/cashVoucher',
    modulePattern: /require\('\.\/cashVoucher\/(.+?)'\)/g,
    expected: [
      'createCashVoucher',
      'getAllCashVouchers',
      'getSpendingOverview',
      'importCashVouchers',
      'updateCashVoucherStatus',
    ],
  },
  {
    facade: '../controllers/accountingFamilyRule.controller.js',
    directory: '../controllers/accountingFamilyRule',
    modulePattern: /require\('\.\/accountingFamilyRule\/(.+?)'\)/g,
    expected: [
      'addFamilyRule',
      'createFamily',
      'deleteFamily',
      'deleteFamilyRule',
      'getFamilyRules',
      'getFamilyRulesDiagnostic',
      'updateFamily',
      'updateFamilyRule',
    ],
  },
  {
    facade: '../controllers/devis.controller.js',
    directory: '../controllers/devis',
    supportDirectory: '../services/devis',
    modulePattern: /require\('\.\/devis\/(.+?)'\)/g,
    expected: [
      'acceptDevis',
      'addLigne',
      'convertToFacture',
      'createDevis',
      'deleteDevis',
      'forwardToBilling',
      'generatePDF',
      'getAllDevis',
      'getDevisById',
      'getDevisForClientResponse',
      'refuseDevis',
      'requestModificationDevis',
      'sendDevis',
      'submitClientResponse',
      'updateDevis',
      'uploadQuoteLineImage',
    ],
  },
  {
    facade: '../controllers/accountingOverview.controller.js',
    directory: '../controllers/accountingOverview',
    modulePattern: /require\('\.\/accountingOverview\/(.+?)'\)/g,
    expected: ['getAccountingOverview'],
  },
  {
    facade: '../controllers/account.controller.js',
    directory: '../controllers/account',
    modulePattern: /require\('\.\/account\/(.+?)'\)/g,
    expected: [
      'createAccount',
      'deleteAccount',
      'downloadAccountingAccountImportTemplate',
      'getAllAccounts',
      'importAccountingAccounts',
      'previewAccountingAccountImport',
      'updateAccount',
    ],
  },
  {
    facade: '../controllers/facture.controller.js',
    directory: '../controllers/facture',
    modulePattern: /require\('\.\/facture\/(.+?)'\)/g,
    expected: [
      'addLigne',
      'createFacture',
      'deleteFacture',
      'generatePDF',
      'getAllFactures',
      'getFactureById',
      'getRetards',
      'getStats',
      'sendFacture',
      'updateFacture',
    ],
  },
];

test('les façades comptables conservent leurs gestionnaires HTTP', () => {
  for (const controllerCase of controllerCases) {
    const facade = fs.readFileSync(path.join(__dirname, controllerCase.facade), 'utf8');
    const moduleNames = [...facade.matchAll(controllerCase.modulePattern)].map((match) => `${match[1].replace(/\.js$/, '')}.js`);
    const declarations = moduleNames.flatMap((moduleName) => {
      const source = fs.readFileSync(path.join(__dirname, controllerCase.directory, moduleName), 'utf8');
      return [...source.matchAll(/^exports\.(\w+)\s*=/gm)].map((match) => match[1]);
    });

    assert.deepEqual(declarations.sort(), [...controllerCase.expected].sort());
  }
});

test('les modules comptables restent sous 500 lignes et sans gestionnaires en double', () => {
  for (const controllerCase of controllerCases) {
    const directory = path.join(__dirname, controllerCase.directory);
    const directories = [directory];
    if (controllerCase.supportDirectory) directories.push(path.join(__dirname, controllerCase.supportDirectory));
    for (const moduleDirectory of directories) {
      for (const entry of fs.readdirSync(moduleDirectory)) {
        if (!entry.endsWith('.js')) continue;
        const source = fs.readFileSync(path.join(moduleDirectory, entry), 'utf8');
        const declarations = [...source.matchAll(/^exports\.(\w+)\s*=/gm)].map((match) => match[1]);
        assert.equal(new Set(declarations).size, declarations.length, `${entry} ne doit pas redéfinir un gestionnaire`);
        assert.ok(source.split(/\r?\n/).length - 1 < 500, `${entry} doit rester sous 500 lignes`);
      }
    }
  }
});

test('les modules déplacés importent uniquement des fonctions exportées par leurs services partagés', () => {
  const moduleDirectories = [
    '../controllers/accountingOverview',
    '../controllers/account',
    '../controllers/facture',
    '../controllers/cashVoucher',
    '../controllers/accountingFamilyRule',
    '../controllers/devis',
    '../services/devis',
  ];

  for (const relativeDirectory of moduleDirectories) {
    const moduleDirectory = path.join(__dirname, relativeDirectory);
    for (const entry of fs.readdirSync(moduleDirectory)) {
      if (!entry.endsWith('.js') || entry === 'index.js') continue;
      const source = fs.readFileSync(path.join(moduleDirectory, entry), 'utf8');
      const imports = [...source.matchAll(/const\s*\{([\s\S]*?)\}\s*=\s*require\(['"]([^'"]+)['"]\)/g)];

      for (const imported of imports) {
        const request = imported[2];
        if (!request.startsWith('.')) continue;

        let dependencyPath = path.resolve(moduleDirectory, request);
        if (fs.existsSync(dependencyPath) && fs.statSync(dependencyPath).isDirectory()) {
          dependencyPath = path.join(dependencyPath, 'index.js');
        } else if (!path.extname(dependencyPath)) {
          dependencyPath += '.js';
        }
        if (!fs.existsSync(dependencyPath)) continue;

        const dependencySource = fs.readFileSync(dependencyPath, 'utf8');
        const directExports = dependencySource.match(/module\.exports\s*=\s*\{([\s\S]*?)\};/);
        const exportedNames = new Set();
        if (directExports) {
          for (const name of directExports[1].matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) exportedNames.add(name[1]);
        }
        for (const spread of dependencySource.matchAll(/\.\.\.require\(['"]\.\/([^'"]+)['"]\)/g)) {
          const spreadPath = path.join(path.dirname(dependencyPath), `${spread[1]}.js`);
          if (!fs.existsSync(spreadPath)) continue;
          const spreadSource = fs.readFileSync(spreadPath, 'utf8');
          const spreadExports = spreadSource.match(/module\.exports\s*=\s*\{([\s\S]*?)\};/);
          if (spreadExports) {
            for (const name of spreadExports[1].matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) exportedNames.add(name[1]);
          }
        }

        for (const item of imported[1].split(',').map((value) => value.trim()).filter(Boolean)) {
          const name = item.split(':').pop().trim();
          assert.ok(exportedNames.has(name), `${entry} importe ${name}, absent des exports de ${dependencyPath}`);
        }
      }
    }
  }
});
