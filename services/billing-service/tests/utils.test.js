const test = require('node:test');
const assert = require('node:assert/strict');
const moment = require('moment');

const {
  generateFactureNumber,
  generateDevisNumber,
  generateAvoirNumber,
  extractYearMonthFromFacture,
  extractYearMonthFromDevis,
} = require('../utils/billingNumberGenerator');
const {
  calculateMontants,
  calculateTotal,
  isValidTauxTVA,
} = require('../utils/tvaCalculator');

test('billing number generators use the expected prefixes, year-month and zero padding', () => {
  const yearMonth = moment().format('YYYYMM');

  assert.equal(generateFactureNumber(7), `FAC-${yearMonth}-0007`);
  assert.equal(generateDevisNumber(23), `DEV-${yearMonth}-0023`);
  assert.equal(generateAvoirNumber(145), `AVR-${yearMonth}-0145`);
});

test('billing number extraction recovers year-month only for matching formats', () => {
  assert.equal(extractYearMonthFromFacture('FAC-202604-0001'), '202604');
  assert.equal(extractYearMonthFromDevis('DEV-202604-0001'), '202604');
  assert.equal(extractYearMonthFromFacture('DEV-202604-0001'), null);
  assert.equal(extractYearMonthFromDevis('FAC-202604-0001'), null);
  assert.equal(extractYearMonthFromFacture('FAC-20264-0001'), null);
});

test('TVA calculator computes rounded HT, TVA and TTC values', () => {
  assert.deepEqual(calculateMontants(3, 199.995, 18), {
    montantHT: 599.99,
    montantTVA: 108,
    montantTTC: 707.99,
  });
});

test('TVA totals aggregate line amounts and preserve two-decimal precision', () => {
  const totals = calculateTotal([
    { montantHT: 100.1, montantTVA: 20.02, montantTTC: 120.12 },
    { montantHT: 49.9, montantTVA: 9.98, montantTTC: 59.88 },
  ]);

  assert.deepEqual(totals, {
    totalHT: 150,
    totalTVA: 30,
    totalTTC: 180,
  });
});

test('TVA validator accepts only configured business rates', () => {
  [0, 2.1, 5.5, 10, 20, '20'].forEach((rate) => {
    assert.equal(isValidTauxTVA(rate), true);
  });

  [1, 7, 19.99, 'abc', null, undefined].forEach((rate) => {
    assert.equal(isValidTauxTVA(rate), false);
  });
});
